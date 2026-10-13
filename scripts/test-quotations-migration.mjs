// Validates docs/sql/quotations_v5*.sql on PGlite (real PostgreSQL in WASM) against a reconstructed
// Supabase-like schema: idempotency, data preservation, RLS, storage policies, version immutability, rollback.
// It never connects to Supabase. PGlite is not a project dependency; run with:
//   npm i --no-save @electric-sql/pglite && node scripts/test-quotations-migration.mjs
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';

const sql = name => fs.readFileSync(`docs/sql/${name}`, 'utf8');
const db = new PGlite();
const results = [];
const check = async (label, fn) => { try { await fn(); results.push(['PASS', label]); } catch (error) { results.push(['FAIL', label, error.message]); } };
const ADMIN = '11111111-1111-4111-8111-111111111111';
const ADMIN2 = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
create table public.admins (user_id uuid primary key);
insert into public.admins values ('${ADMIN}'), ('${ADMIN2}');
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
create table public.customers (id uuid primary key default gen_random_uuid(), nombre text not null, email text not null, telefono text, notas text, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.quotations (id uuid primary key default gen_random_uuid(), codigo text unique not null, customer_id uuid references public.customers(id), cliente_nombre text not null, cliente_email text not null, cliente_telefono text, destino text not null, moneda text not null check (moneda in ('USD','HNL')), validez date not null, notas text, total numeric(12,2) not null default 0, estado text not null default 'borrador' check (estado in ('borrador','enviada','aceptada','rechazada','expirada')), agente_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.quotation_items (id uuid primary key default gen_random_uuid(), quotation_id uuid not null references public.quotations(id) on delete cascade, descripcion text not null, tipo text, cantidad integer not null default 1 check (cantidad > 0), precio_unitario numeric not null default 0 check (precio_unitario >= 0), orden integer not null default 0);
create table public.reservations (id uuid primary key default gen_random_uuid(), quotation_id uuid references public.quotations(id), codigo text);
create table public.invoices (id uuid primary key default gen_random_uuid(), numero text not null default 'FAC-' || substr(md5(random()::text), 1, 6), reservation_id uuid not null references public.reservations(id), cliente_nombre text not null, moneda text not null default 'USD', total numeric not null default 0, estado text not null default 'emitida', fecha_emision date not null default current_date, fecha_vencimiento date, notas text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.invoices enable row level security;
create policy i_admin on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.reservations enable row level security;
create policy r_admin on public.reservations for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.quotations enable row level security; alter table public.quotation_items enable row level security;
create policy q_admin on public.quotations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy qi_admin on public.quotation_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid default auth.uid(), created_at timestamptz default now());
alter table storage.objects enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
insert into storage.buckets (id, name, public) values ('portal-docs', 'portal-docs', false);
create policy portal_docs_admin_select on storage.objects for select to authenticated using (bucket_id = 'portal-docs' and public.is_admin());
insert into public.quotations (codigo, cliente_nombre, cliente_email, destino, moneda, validez, notas, total, estado, agente_id)
values ('COT-A', 'Cliente A', 'a@example.com', 'Cancún', 'USD', '2026-10-20', 'Incluye traslados', 1980, 'enviada', '${ADMIN}'),
       ('COT-B', 'Cliente B', 'b@example.com', 'Madrid', 'HNL', '2026-09-01', null, 50000, 'aceptada', '${ADMIN}');
insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden)
select id, 'Paquete', 'Paquete', 2, total / 2, 0 from public.quotations;
`);
const before = (await db.query(`select codigo, cliente_nombre, destino, total::text, estado, validez::text, notas from public.quotations order by codigo`)).rows;
const itemsBefore = (await db.query(`select count(*)::int as n from public.quotation_items`)).rows[0].n;

const as = async (role, uid, statement, params = []) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  try { return await db.query(statement, params); } finally { await db.exec(`reset role;`); }
};

const migration = sql('quotations_v5.sql');
await check('backup script copies quotation data into a private schema', async () => {
  await db.exec(sql('quotations_v5_backup.sql'));
  assert.equal((await db.query('select count(*)::int as n from backup_v5.quotations')).rows[0].n, 2);
  await assert.rejects(as('authenticated', ADMIN, 'select * from backup_v5.quotations'), /permission denied/);
  await assert.rejects(as('anon', null, 'select * from backup_v5.quotations'), /permission denied/);
});
await check('migration applies inside a transaction', async () => { await db.exec(migration); });
await check('migration can be re-run safely (idempotent)', async () => { await db.exec(migration); });
await check('existing quotations are preserved unchanged, defaults applied, no backfill needed', async () => {
  const after = (await db.query(`select codigo, cliente_nombre, destino, total::text, estado, validez::text, notas from public.quotations order by codigo`)).rows;
  assert.deepEqual(after, before);
  const added = (await db.query(`select tipo, detalles::text, vence_en, version from public.quotations`)).rows;
  assert.ok(added.every(row => row.tipo === 'general' && row.detalles === '{}' && row.vence_en === null && row.version === 0));
  assert.equal((await db.query(`select count(*)::int as n from public.quotation_items`)).rows[0].n, itemsBefore);
});
await check('verify script runs and reports no lost or changed quotations', async () => {
  await db.exec(sql('quotations_v5_verify.sql'));
  assert.equal((await db.query('select count(*)::int as n from backup_v5.quotations b where not exists (select 1 from public.quotations q where q.id = b.id)')).rows[0].n, 0);
});
await check('preflight script runs (read-only)', async () => { await db.exec(sql('quotations_v5_preflight.sql')); });
await check('tipo check rejects unknown types and accepts ferry', async () => {
  await assert.rejects(db.query(`update public.quotations set tipo = 'crucero' where codigo = 'COT-A'`));
  await db.query(`update public.quotations set tipo = 'ferry' where codigo = 'COT-A'`);
  await db.query(`update public.quotations set tipo = 'general' where codigo = 'COT-A'`);
});
await check('detalles larger than 256 KB is rejected', async () => { await assert.rejects(db.query(`update public.quotations set detalles = jsonb_build_object('x', repeat(md5(random()::text), 20000)) where codigo = 'COT-A'`)); });
await check('admin can write structured details through RLS', async () => {
  const result = await as('authenticated', ADMIN, `update public.quotations set tipo = 'vuelo', detalles = '{"refCreacion":"abc12345"}', vence_en = now() + interval '1 day' where codigo = 'COT-A' returning id`);
  assert.equal(result.rows.length, 1);
  const found = await as('authenticated', ADMIN, `select id from public.quotations where detalles ->> 'refCreacion' = 'abc12345'`);
  assert.equal(found.rows.length, 1);
});
const quotationId = (await db.query(`select id from public.quotations where codigo = 'COT-A'`)).rows[0].id;
await check('admin can insert a sent version as themselves', async () => {
  const result = await as('authenticated', ADMIN, `insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, '{"quotation":{}}', $2) returning id`, [quotationId, ADMIN]);
  assert.equal(result.rows.length, 1);
});
await check('a version cannot be recorded in another admin\'s name', async () => {
  await assert.rejects(as('authenticated', ADMIN, `insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 2, '{}', $2)`, [quotationId, ADMIN2]));
});
await check('duplicate version numbers are rejected (unique)', async () => {
  await assert.rejects(as('authenticated', ADMIN, `insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, '{}', $2)`, [quotationId, ADMIN]));
});
await check('admin update of a sent version changes nothing (no RLS policy)', async () => {
  const result = await as('authenticated', ADMIN, `update public.quotation_versions set snapshot = '{"tampered":true}' returning id`);
  assert.equal(result.rows.length, 0);
});
await check('even the service role cannot modify a sent version (trigger)', async () => {
  await assert.rejects(as('service_role', null, `update public.quotation_versions set snapshot = '{"tampered":true}'`), /no se pueden modificar/);
  await assert.rejects(db.query(`update public.quotation_versions set snapshot = '{"tampered":true}'`), /no se pueden modificar/);
});
await check('admin cannot delete a sent version', async () => {
  const result = await as('authenticated', ADMIN, `delete from public.quotation_versions returning id`);
  assert.equal(result.rows.length, 0);
  assert.equal((await db.query(`select count(*)::int as n from public.quotation_versions`)).rows[0].n, 1);
});
await check('non-admin users and anonymous visitors cannot read or write versions', async () => {
  assert.equal((await as('authenticated', USER, `select * from public.quotation_versions`)).rows.length, 0);
  await assert.rejects(as('authenticated', USER, `insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 5, '{}', $2)`, [quotationId, USER]));
  await assert.rejects(as('anon', null, `select * from public.quotation_versions`), /permission denied/);
});
await check('quotation bucket is private, JPEG only, 5 MB', async () => {
  const bucket = (await db.query(`select public, file_size_limit::int, allowed_mime_types from storage.buckets where id = 'quotation-media'`)).rows[0];
  assert.deepEqual(bucket, { public: false, file_size_limit: 5242880, allowed_mime_types: ['image/jpeg'] });
});
await check('admins upload only to hotel/<32 hex>.jpg in the quotation bucket', async () => {
  const good = 'hotel/0123456789abcdef0123456789abcdef.jpg';
  assert.equal((await as('authenticated', ADMIN, `insert into storage.objects (bucket_id, name) values ('quotation-media', $1) returning id`, [good])).rows.length, 1);
  for (const bad of ['hotel/../../x.jpg', 'hotel/abc.jpg', 'otra/0123456789abcdef0123456789abcdef.jpg', 'hotel/0123456789abcdef0123456789abcdef.png']) await assert.rejects(as('authenticated', ADMIN, `insert into storage.objects (bucket_id, name) values ('quotation-media', $1)`, [bad]), undefined, bad);
});
await check('non-admins and visitors cannot see or upload hotel photos', async () => {
  assert.equal((await as('authenticated', USER, `select * from storage.objects where bucket_id = 'quotation-media'`)).rows.length, 0);
  assert.equal((await as('anon', null, `select * from storage.objects where bucket_id = 'quotation-media'`)).rows.length, 0);
  await assert.rejects(as('authenticated', USER, `insert into storage.objects (bucket_id, name) values ('quotation-media', 'hotel/0123456789abcdef0123456789abcdee.jpg')`));
  assert.equal((await as('authenticated', ADMIN, `select * from storage.objects where bucket_id = 'quotation-media'`)).rows.length, 1);
});
await check('photos cannot be replaced, and recent photos cannot be deleted through the API', async () => {
  assert.equal((await as('authenticated', ADMIN, `update storage.objects set name = 'hotel/ffffffffffffffffffffffffffffffff.jpg' where bucket_id = 'quotation-media' returning id`)).rows.length, 0);
  assert.equal((await as('authenticated', ADMIN, `delete from storage.objects where bucket_id = 'quotation-media' returning id`)).rows.length, 0);
});
await check('existing portal-docs policy is untouched', async () => {
  const names = (await db.query(`select policyname from pg_policies where schemaname = 'storage' order by 1`)).rows.map(row => row.policyname);
  assert.deepEqual(names, ['portal_docs_admin_select', 'quotation_media_admin_delete_unused', 'quotation_media_admin_insert', 'quotation_media_admin_select']);
});
await check('deleting a quotation (owner only; the panel cannot) cascades to its versions', async () => {
  await db.query(`delete from public.quotation_items where quotation_id = $1`, [quotationId]);
  await db.query(`delete from public.quotations where id = $1`, [quotationId]);
  assert.equal((await db.query(`select count(*)::int as n from public.quotation_versions`)).rows[0].n, 0);
});
const qB = (await db.query("select id from public.quotations where codigo = 'COT-B'")).rows[0].id;
await check('an accepted quotation cannot change content, even as the service role or owner', async () => {
  await assert.rejects(as('authenticated', ADMIN, 'update public.quotations set total = 1 where id = $1', [qB]), /aceptada/);
  await assert.rejects(db.query(`update public.quotations set detalles = '{"x":1}' where id = $1`, [qB]), /aceptada/);
  await assert.rejects(as('service_role', null, `update public.quotations set notas = 'cambio' where id = $1`, [qB]), /aceptada/);
});
await check('accepted quotations still allow status, advisor and version bookkeeping', async () => {
  await as('authenticated', ADMIN, 'update public.quotations set agente_id = $2, version_aceptada = 1, updated_at = now() where id = $1', [qB, ADMIN2]);
  await as('authenticated', ADMIN, `update public.quotations set estado = 'rechazada' where id = $1`, [qB]);
  await as('authenticated', ADMIN, `update public.quotations set notas = 'editable again', estado = 'aceptada' where id = $1`, [qB]);
});
await check('price lines of an accepted quotation cannot be inserted, changed or deleted', async () => {
  await assert.rejects(db.query(`insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario) values ($1, 'x', 'Otro', 1, 1)`, [qB]), /aceptada/);
  await assert.rejects(db.query('update public.quotation_items set precio_unitario = 1 where quotation_id = $1', [qB]), /aceptada/);
  await assert.rejects(db.query('delete from public.quotation_items where quotation_id = $1', [qB]), /aceptada/);
  await assert.rejects(as('authenticated', ADMIN, `select public.replace_quotation_items($1, '[]'::jsonb)`, [qB]), /aceptada/);
});
const draft = (await db.query(`insert into public.quotations (codigo, cliente_nombre, cliente_email, destino, moneda, validez, agente_id) values ('COT-C', 'C', 'c@example.com', 'Lima', 'USD', '2026-12-01', $1) returning id`, [ADMIN])).rows[0].id;
await check('replace_quotation_items swaps all lines at once and computes the exact total', async () => {
  const items = JSON.stringify([{ descripcion: 'Tarifa', tipo: 'Tarifa aérea', cantidad: 2, precio_unitario: 1.15 }, { descripcion: 'Promo', tipo: 'Descuento', cantidad: 1, precio_unitario: 0.15 }, { descripcion: 'Hotel', tipo: 'Hotel', cantidad: 3, precio_unitario: 0.33 }]);
  const total = (await as('authenticated', ADMIN, 'select public.replace_quotation_items($1, $2::jsonb) as total', [draft, items])).rows[0].total;
  assert.equal(String(total), '3.14');
  assert.equal((await db.query('select total::text from public.quotations where id = $1', [draft])).rows[0].total, '3.14');
  const lines = (await db.query('select descripcion, orden from public.quotation_items where quotation_id = $1 order by orden', [draft])).rows;
  assert.deepEqual(lines.map(line => [line.descripcion, line.orden]), [['Tarifa', 0], ['Promo', 1], ['Hotel', 2]]);
});
await check('a decimal quantity is rejected, never rounded (integer column in production)', async () => {
  await assert.rejects(as('authenticated', ADMIN, 'select public.replace_quotation_items($1, $2::jsonb)', [draft, JSON.stringify([{ descripcion: 'Media', tipo: 'Hotel', cantidad: 1.5, precio_unitario: 10 }])]), /integer/);
  assert.equal((await db.query('select count(*)::int as n from public.quotation_items where quotation_id = $1', [draft])).rows[0].n, 3);
});
await check('a failing line rolls back the whole replacement (old lines kept)', async () => {
  const bad = JSON.stringify([{ descripcion: 'Bien', tipo: 'Hotel', cantidad: 1, precio_unitario: 5 }, { descripcion: 'Mal', tipo: 'Hotel', cantidad: 1, precio_unitario: -5 }]);
  await assert.rejects(as('authenticated', ADMIN, 'select public.replace_quotation_items($1, $2::jsonb)', [draft, bad]));
  assert.equal((await db.query('select count(*)::int as n from public.quotation_items where quotation_id = $1', [draft])).rows[0].n, 3);
  assert.equal((await db.query('select total::text from public.quotations where id = $1', [draft])).rows[0].total, '3.14');
});
await check('non-admins cannot replace prices and anonymous visitors cannot call the function', async () => {
  await assert.rejects(as('authenticated', USER, `select public.replace_quotation_items($1, '[]'::jsonb)`, [draft]));
  assert.equal((await db.query('select count(*)::int as n from public.quotation_items where quotation_id = $1', [draft])).rows[0].n, 3);
  await assert.rejects(as('anon', null, `select public.replace_quotation_items($1, '[]'::jsonb)`, [draft]), /permission denied/);
});
await check('a quotation can be converted into only one reservation', async () => {
  await db.query(`insert into public.reservations (quotation_id, codigo) values ($1, 'RES-1')`, [qB]);
  await assert.rejects(db.query(`insert into public.reservations (quotation_id, codigo) values ($1, 'RES-2')`, [qB]), /duplicate key|unique/);
});
await check('unused photos older than 7 days can be deleted; used, recent or by non-admins cannot', async () => {
  const path = n => 'hotel/' + String(n).repeat(32) + '.jpg';
  await db.query(`insert into storage.objects (bucket_id, name, created_at) values ('quotation-media', $1, now() - interval '30 days'), ('quotation-media', $2, now() - interval '30 days'), ('quotation-media', $3, now() - interval '1 day'), ('quotation-media', $4, now() - interval '30 days')`, [path(1), path(2), path(3), path(4)]);
  await db.query(`update public.quotations set detalles = jsonb_build_object('hoteles', jsonb_build_array(jsonb_build_object('fotos', jsonb_build_array(jsonb_build_object('path', $2::text))))) where id = $1`, [draft, path(2)]);
  await db.query(`insert into public.quotation_versions (quotation_id, version, snapshot) values ($1, 1, jsonb_build_object('quotation', jsonb_build_object('detalles', jsonb_build_object('path', $2::text))))`, [draft, path(4)]);
  assert.equal((await as('authenticated', USER, `delete from storage.objects where bucket_id = 'quotation-media' returning name`)).rows.length, 0);
  const deleted = (await as('authenticated', ADMIN, `delete from storage.objects where bucket_id = 'quotation-media' returning name`)).rows.map(row => row.name);
  assert.deepEqual(deleted, [path(1)]);
});

await check('invoices_v5 adds the missing columns, keeps rows, re-runs safely and rolls back', async () => {
  const reservation = (await db.query("insert into public.reservations (codigo) values ('RES-INV') returning id")).rows[0].id;
  await db.query("insert into public.invoices (reservation_id, cliente_nombre, total) values ($1, 'Cliente', 125.5)", [reservation]);
  const invoices = sql('invoices_v5.sql');
  await db.exec(invoices);
  await db.exec(invoices);
  const row = (await db.query('select items, cliente_email, cliente_telefono, total::text, estado from public.invoices')).rows[0];
  assert.deepEqual([row.items, row.cliente_email, row.cliente_telefono, row.total, row.estado], [[], null, null, '125.5', 'emitida']);
  const created = await as('authenticated', ADMIN, "insert into public.invoices (reservation_id, cliente_nombre, cliente_email, items, total, estado) values ($1, 'C', 'c@example.com', $2::jsonb, 10, 'borrador') returning id", [reservation, JSON.stringify([{ descripcion: 'x' }])]);
  assert.equal(created.rows.length, 1);
  await assert.rejects(as('authenticated', USER, "insert into public.invoices (reservation_id, cliente_nombre) values ($1, 'X')", [reservation]));
  const rollback = invoices.split('\n').filter(line => line.startsWith('--   ')).map(line => line.slice(5)).join('\n');
  await db.exec(rollback);
  assert.equal((await db.query("select count(*)::int as n from information_schema.columns where table_name = 'invoices' and column_name = 'items'")).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int as n from public.invoices')).rows[0].n, 2);
  await db.exec(invoices);
});
await check('rollback script restores the original columns, then the migration re-applies', async () => {
  const rollback = migration.split('\n').filter(line => line.startsWith('--   ')).map(line => line.slice(5)).join('\n');
  await db.exec(rollback);
  const columns = (await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'quotations' and column_name in ('tipo','detalles','vence_en','version')`)).rows;
  assert.equal(columns.length, 0);
  assert.equal((await db.query(`select to_regclass('public.quotation_versions') as t`)).rows[0].t, null);
  assert.ok((await db.query(`select count(*)::int as n from public.quotations`)).rows[0].n >= 1);
  assert.equal((await db.query(`select count(*)::int as n from pg_trigger where tgname like 'quotation%' and not tgisinternal`)).rows[0].n, 0);
  await db.exec(migration);
});
for (const [status, label, error] of results) console.log(`${status}  ${label}${error ? `\n      ${error}` : ''}`);
console.log(`${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
