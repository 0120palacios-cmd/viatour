// Validates docs/sql/quotations_v6*.sql on PGlite (real PostgreSQL in WASM) against a reconstructed
// Supabase-like schema with V5 already applied: idempotency, data preservation, the new quotation type,
// admin-only catalogs (RLS), audit columns, foreign keys, the photo-cleanup policy and rollback.
// It never connects to Supabase and does not replace a rehearsal on a restored copy of production.
// PGlite is not a project dependency; run with either:
//   npm i --no-save @electric-sql/pglite && node scripts/test-quotations-v6-migration.mjs
//   PGLITE_MODULE=file:///path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-quotations-v6-migration.mjs
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
const snapshot = async () => (await db.query(`select codigo, tipo, detalles::text, total::text, estado, version from public.quotations order by codigo`)).rows;
const before = await snapshot();
const migration = sql('quotations_v6.sql');

await check('preflight runs read-only', async () => { await db.exec(sql('quotations_v6_preflight.sql')); });
await check('migration applies inside a transaction', async () => { await db.exec(migration); });
await check('migration can be re-run safely (idempotent)', async () => { await db.exec(migration); });
await check('existing quotations, items and accepted locks are unchanged', async () => {
  assert.deepEqual(await snapshot(), before);
  assert.equal((await db.query('select count(*)::int as n from public.quotation_items')).rows[0].n, 2);
});
await check('verify script runs', async () => { await db.exec(sql('quotations_v6_verify.sql')); });
await check('tipo accepts combinado and still rejects unknown types', async () => {
  await as('authenticated', ADMIN, `update public.quotations set tipo = 'combinado', detalles = '{"paquete":{"componentes":[{"id":"c1","tipo":"traslado"}]}}' where codigo = 'COT-A'`);
  await assert.rejects(db.query(`update public.quotations set tipo = 'crucero' where codigo = 'COT-A'`), /quotations_tipo_check/);
});
await check('an accepted combined quotation stays locked (V5 trigger)', async () => {
  await db.query(`update public.quotations set estado = 'borrador' where codigo = 'COT-A'`);
  await db.query(`update public.quotations set estado = 'aceptada' where codigo = 'COT-A'`);
  await assert.rejects(as('authenticated', ADMIN, `update public.quotations set detalles = '{}' where codigo = 'COT-A'`), /aceptada/);
  await db.query(`update public.quotations set estado = 'enviada' where codigo = 'COT-A'`);
});
await check('a sent combined version cannot be modified (V5 trigger)', async () => {
  const id = (await db.query(`select id from public.quotations where codigo = 'COT-A'`)).rows[0].id;
  await as('authenticated', ADMIN, `insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, '{"quotation":{"tipo":"combinado"}}', $2)`, [id, ADMIN]);
  await assert.rejects(db.query(`update public.quotation_versions set snapshot = '{}'`), /no se pueden modificar/);
});

const hotelInsert = `insert into public.hotel_catalog (nombre, ciudad, pais, fotos, inclusiones, habitaciones, check_in, check_out, impuestos) values ($1, 'Cancún', 'México', '[{"path":"hotel/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpg"}]', '[{"id":"i1","nombre":"Desayuno","estado":"incluido","detalle":""}]', '[{"id":"r1","categoria":"Deluxe"}]', '15:00', '12:00', 'incluidos') returning id, creado_por, actualizado_por`;
await check('admins create, read, update and deactivate hotels; audit columns come from the session', async () => {
  const row = (await as('authenticated', ADMIN, hotelInsert, ['Hotel Riu Palace'])).rows[0];
  assert.equal(row.creado_por, ADMIN);
  assert.equal(row.actualizado_por, ADMIN);
  const spoof = (await as('authenticated', ADMIN, `insert into public.hotel_catalog (nombre, ciudad, creado_por) values ('Otro', 'Lima', $1) returning creado_por`, [USER])).rows[0];
  assert.equal(spoof.creado_por, ADMIN);
  const updated = (await as('authenticated', ADMIN, `update public.hotel_catalog set activo = false where id = $1 returning activo, creado_por`, [row.id])).rows[0];
  assert.deepEqual(updated, { activo: false, creado_por: ADMIN });
  assert.equal((await as('authenticated', ADMIN, 'select count(*)::int as n from public.hotel_catalog')).rows[0].n, 2);
});
await check('the same hotel cannot be registered twice in the same city', async () => {
  await assert.rejects(as('authenticated', ADMIN, hotelInsert, [' hotel riu palace ']), /hotel_catalog_nombre_ciudad_unique/);
});
await check('invalid catalog values are rejected by the database', async () => {
  await assert.rejects(as('authenticated', ADMIN, `insert into public.hotel_catalog (nombre, estrellas) values ('X', 7)`));
  await assert.rejects(as('authenticated', ADMIN, `insert into public.hotel_catalog (nombre, fotos) values ('X', '{}')`));
  await assert.rejects(as('authenticated', ADMIN, `insert into public.hotel_catalog (nombre, sitio_web) values ('X', 'javascript:alert(1)')`));
  await assert.rejects(as('authenticated', ADMIN, `insert into public.airline_catalog (nombre, iata) values ('X', 'aa1')`));
});
await check('non-admin users see no catalog rows and cannot write', async () => {
  assert.equal((await as('authenticated', USER, 'select * from public.hotel_catalog')).rows.length, 0);
  await assert.rejects(as('authenticated', USER, `insert into public.hotel_catalog (nombre) values ('Intruso')`));
  await assert.rejects(as('authenticated', USER, `insert into public.airline_catalog (nombre) values ('Intrusa')`));
  assert.equal((await as('authenticated', USER, `update public.hotel_catalog set nombre = 'x' returning id`)).rows.length, 0);
  assert.equal((await as('authenticated', USER, `delete from public.hotel_catalog returning id`)).rows.length, 0);
});
await check('anonymous visitors have no access to any catalog', async () => {
  for (const table of ['hotel_catalog', 'airline_catalog', 'airline_fare_presets']) await assert.rejects(as('anon', null, `select * from public.${table}`), /permission denied/, table);
});
let airlineId;
await check('airlines and fare presets: create, unique IATA among active, cascade on delete', async () => {
  airlineId = (await as('authenticated', ADMIN, `insert into public.airline_catalog (nombre, iata, icao, pais) values ('American Airlines', 'AA', 'AAL', 'Estados Unidos') returning id`)).rows[0].id;
  await assert.rejects(as('authenticated', ADMIN, `insert into public.airline_catalog (nombre, iata) values ('Otra AA', 'AA')`), /airline_catalog_iata_unique/);
  await as('authenticated', ADMIN, `insert into public.airline_fare_presets (airline_id, nombre, cabina, equipaje, reembolso, verificado_en) values ($1, 'Main Cabin', 'Económica', '{"personal":{"estado":"incluido","piezas":1}}', 'no_reembolsable', '2026-10-01')`, [airlineId]);
  await assert.rejects(as('authenticated', ADMIN, `insert into public.airline_fare_presets (airline_id, nombre) values ($1, 'main cabin')`, [airlineId]), /airline_fare_presets_nombre_unique/);
  await assert.rejects(as('authenticated', ADMIN, `insert into public.airline_fare_presets (airline_id, nombre) values (gen_random_uuid(), 'Huérfana')`), /foreign key/);
  await assert.rejects(as('authenticated', ADMIN, `insert into public.airline_fare_presets (airline_id, nombre, equipaje) values ($1, 'Mala', '[]')`, [airlineId]));
  const temp = (await as('authenticated', ADMIN, `insert into public.airline_catalog (nombre) values ('Temporal') returning id`)).rows[0].id;
  await as('authenticated', ADMIN, `insert into public.airline_fare_presets (airline_id, nombre) values ($1, 'Básica')`, [temp]);
  await as('authenticated', ADMIN, `delete from public.airline_catalog where id = $1`, [temp]);
  assert.equal((await db.query(`select count(*)::int as n from public.airline_fare_presets where airline_id = $1`, [temp])).rows[0].n, 0);
});
await check('airline seed runs and is idempotent', async () => {
  await db.exec(sql('quotations_v6_seed_airlines.sql'));
  await db.exec(sql('quotations_v6_seed_airlines.sql'));
  assert.equal((await db.query(`select count(*)::int as n from public.airline_catalog where iata = 'AA'`)).rows[0].n, 1);
  assert.ok((await db.query(`select count(*)::int as n from public.airline_catalog`)).rows[0].n >= 20);
});
await check('photo cleanup cannot delete a photo used by the hotel catalog, a quotation or a version', async () => {
  for (const name of ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'cccccccccccccccccccccccccccccccc']) await db.query(`insert into storage.objects (bucket_id, name, created_at) values ('quotation-media', $1, now() - interval '30 days')`, [`hotel/${name}.jpg`]);
  await db.query(`update public.quotations set detalles = '{"x":"hotel/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}' where codigo = 'COT-A'`);
  const removed = (await as('authenticated', ADMIN, `delete from storage.objects where bucket_id = 'quotation-media' returning name`)).rows.map(row => row.name);
  assert.deepEqual(removed, ['hotel/cccccccccccccccccccccccccccccccc.jpg']);
});
await check('rollback block restores V5 (after combined quotations are changed back)', async () => {
  const block = migration.split('-- Reversión')[1].split('\n').filter(line => line.startsWith('--   ')).map(line => line.slice(5)).join('\n');
  await db.exec(`update public.quotations set tipo = 'general' where tipo = 'combinado'`);
  await db.exec(block);
  assert.equal((await db.query(`select to_regclass('public.hotel_catalog') as t`)).rows[0].t, null);
  await assert.rejects(db.query(`update public.quotations set tipo = 'combinado' where codigo = 'COT-A'`));
  await db.exec(migration);
});

for (const [status, label, message] of results) console.log(`${status}  ${label}${message ? `\n      ${message}` : ''}`);
const failed = results.filter(([status]) => status === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
