// Validates docs/sql/service_catalog_v7.sql on PGlite (real PostgreSQL in WASM) on top of V5 and V6, with the
// same Supabase-like base as scripts/test-quotations-v6-migration.mjs. Never connects to Supabase.
// Run: PGLITE_MODULE=file:///path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-service-catalog-v7-migration.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const sql = name => fs.readFileSync(`docs/sql/${name}`, 'utf8');
const db = new PGlite();
const results = [];
const check = async (label, fn) => { try { await fn(); results.push(['PASS', label]); } catch (error) { results.push(['FAIL', label, error.message]); } };
const ADMIN = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const as = async (role, uid, statement, params = []) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  try { return await db.query(statement, params); } finally { await db.exec('reset role;'); }
};

// Supabase-like base: roles, auth.uid(), is_admin(), the tables V5 needs, storage, default grants.
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
create table public.admins (user_id uuid primary key);
insert into public.admins values ('${ADMIN}');
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create table public.customers (id uuid primary key default gen_random_uuid(), nombre text not null, email text not null, telefono text, notas text, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.quotations (id uuid primary key default gen_random_uuid(), codigo text unique not null, customer_id uuid references public.customers(id), cliente_nombre text not null, cliente_email text not null, cliente_telefono text, destino text not null, moneda text not null check (moneda in ('USD','HNL')), validez date not null, notas text, total numeric(12,2) not null default 0, estado text not null default 'borrador' check (estado in ('borrador','enviada','aceptada','rechazada','expirada')), agente_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.quotation_items (id uuid primary key default gen_random_uuid(), quotation_id uuid not null references public.quotations(id) on delete cascade, descripcion text not null, tipo text, cantidad integer not null default 1 check (cantidad > 0), precio_unitario numeric not null default 0 check (precio_unitario >= 0), orden integer not null default 0);
create table public.reservations (id uuid primary key default gen_random_uuid(), quotation_id uuid references public.quotations(id), codigo text);
alter table public.quotations enable row level security; alter table public.quotation_items enable row level security; alter table public.reservations enable row level security;
create policy q_admin on public.quotations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy qi_admin on public.quotation_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy r_admin on public.reservations for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant all on all tables in schema public to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid default auth.uid(), created_at timestamptz default now());
alter table storage.objects enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
insert into public.quotations (codigo, cliente_nombre, cliente_email, destino, moneda, validez, total, estado, agente_id)
values ('COT-A', 'Cliente A', 'a@example.com', 'Cancún', 'USD', '2026-10-20', 1980, 'enviada', '${ADMIN}'),
       ('COT-B', 'Cliente B', 'b@example.com', 'Madrid', 'HNL', '2026-09-01', 50000, 'aceptada', '${ADMIN}');
insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden) select id, 'Paquete', 'paquete', 2, total / 2, 0 from public.quotations;
`);
await db.exec(sql('quotations_v5.sql'));
await db.exec(`update public.quotations set tipo = 'paquete', detalles = '{"hoteles":[{"fotos":[{"path":"hotel/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]}]}' where codigo = 'COT-A';`);
await db.exec(sql('quotations_v6.sql'));
const before = (await db.query(`select codigo, tipo, detalles::text, total::text, estado from public.quotations order by codigo`)).rows;
const migration = sql('service_catalog_v7.sql');

await check('migration applies inside a transaction', async () => { await db.exec(migration); });
await check('migration can be re-run safely (idempotent)', async () => { await db.exec(migration); });
await check('existing quotations are unchanged', async () => {
  assert.deepEqual((await db.query(`select codigo, tipo, detalles::text, total::text, estado from public.quotations order by codigo`)).rows, before);
});
const insert = `insert into public.service_catalog (tipo, nombre, operador, destino, inclusiones, cancelacion) values ($1, $2, $3, 'Roatán', '[{"id":"i1","nombre":"Equipo de snorkel","estado":"incluido","detalle":""}]', '24 horas antes') returning id, creado_por`;
await check('admins create, read and deactivate services; audit comes from the session', async () => {
  const row = (await as('authenticated', ADMIN, insert, ['tour', 'Snorkel en West End', 'Operador local'])).rows[0];
  assert.equal(row.creado_por, ADMIN);
  await as('authenticated', ADMIN, insert, ['ferry', 'Galaxy Wave', 'Roatán Ferry']);
  const updated = (await as('authenticated', ADMIN, `update public.service_catalog set activo = false where id = $1 returning activo`, [row.id])).rows[0];
  assert.equal(updated.activo, false);
  assert.equal((await as('authenticated', ADMIN, 'select count(*)::int as n from public.service_catalog')).rows[0].n, 2);
});
await check('the same service (type, name, operator) cannot be registered twice', async () => {
  await assert.rejects(as('authenticated', ADMIN, insert, ['tour', ' snorkel en west end ', 'OPERADOR LOCAL']), /service_catalog_unique/);
  // Same name under another type is a different service.
  await as('authenticated', ADMIN, insert, ['actividad', 'Snorkel en West End', 'Operador local']);
});
await check('invalid values are rejected by the database', async () => {
  await assert.rejects(as('authenticated', ADMIN, `insert into public.service_catalog (tipo, nombre) values ('crucero', 'X')`));
  await assert.rejects(as('authenticated', ADMIN, `insert into public.service_catalog (tipo, nombre) values ('tour', '  ')`));
  await assert.rejects(as('authenticated', ADMIN, `insert into public.service_catalog (tipo, nombre, inclusiones) values ('tour', 'X', '{}')`));
  await assert.rejects(as('authenticated', ADMIN, `insert into public.service_catalog (tipo, nombre, modalidad) values ('traslado', 'X', 'vip')`));
});
await check('non-admin users see nothing and cannot write', async () => {
  assert.equal((await as('authenticated', USER, 'select * from public.service_catalog')).rows.length, 0);
  await assert.rejects(as('authenticated', USER, `insert into public.service_catalog (tipo, nombre) values ('tour', 'Intruso')`));
  assert.equal((await as('authenticated', USER, `update public.service_catalog set nombre = 'x' returning id`)).rows.length, 0);
});
await check('anonymous visitors have no access', async () => {
  await assert.rejects(as('anon', null, 'select * from public.service_catalog'), /permission denied/);
});
await check('rollback removes the table and leaves quotations intact', async () => {
  await db.exec('drop table if exists public.service_catalog;');
  assert.deepEqual((await db.query(`select codigo, tipo, detalles::text, total::text, estado from public.quotations order by codigo`)).rows, before);
});

for (const [status, label, detail] of results) console.log(`${status} ${label}${detail ? ` — ${detail}` : ''}`);
const failed = results.filter(([status]) => status === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
