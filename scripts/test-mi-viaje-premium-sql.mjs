// Isolated PostgreSQL/WASM only (no network, credentials or customer data): docs/sql/mi_viaje_premium.sql on
// top of docs/sql/reservation_messages.sql. RLS, grants, cross-reservation integrity and idempotency, with
// simulated anon / authenticated (admin and non-admin) / service roles.
// Run: node scripts/test-mi-viaje-premium-sql.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ADMIN = '11111111-1111-4111-8111-111111111111', USER = '22222222-2222-4222-8222-222222222222';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const F1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', F2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function public.is_admin() returns boolean language sql stable as $$ select current_setting('test.uid', true) = '${ADMIN}' $$;
grant execute on function auth.uid(), public.is_admin() to anon, authenticated, service_role; grant usage on schema public to anon, authenticated, service_role;
create table public.reservations (id uuid primary key, codigo text);
insert into public.reservations values ('${A}', 'VT-A'), ('${B}', 'VT-B');`);

// The premium migration refuses to run before the conversation table exists.
await assert.rejects(db.exec(fs.readFileSync('docs/sql/mi_viaje_premium.sql', 'utf8')), /reservation_messages\.sql first/);
await db.exec('rollback').catch(() => {});
// Supabase's default privileges: every new table and function in public is granted to these roles.
await db.exec(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;`);
await db.exec(fs.readFileSync('docs/sql/reservation_messages.sql', 'utf8'));
// Production state found on 2026-10-23: authenticated kept every table privilege on reservation_messages.
await db.exec('grant all on table public.reservation_messages to authenticated');
await db.exec(fs.readFileSync('docs/sql/mi_viaje_premium.sql', 'utf8'));
await db.exec(fs.readFileSync('docs/sql/mi_viaje_premium.sql', 'utf8')); // idempotent

const as = async (role, uid, sql) => db.exec(`set role ${role}; select set_config('test.uid', '${uid}', false);`).then(() => db.query(sql)).finally(() => db.exec('reset role'));
const fails = (promise, pattern) => assert.rejects(promise, pattern);
const path = (reservation, file, ext = 'jpg') => `${reservation}/mensajes/${file}.${ext}`;

// Customer message with an attachment, atomically, by the service role only.
const posted = await as('service_role', '', `select * from public.post_customer_message('${A}', 'vuelo', '', '${path(A, F1)}', 'foto.jpg', 'image/jpeg', 1200)`);
assert.ok(posted.rows[0].message_id && posted.rows[0].attachment_id);
// Text only still works; an empty message without a file does not.
await as('service_role', '', `select * from public.post_customer_message('${B}', null, 'Hola B', null, null, null, null)`);
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, '   ', null, null, null, null)`), /vacío/);
// A path in another reservation's folder, outside mensajes/ or with a client name is refused, and nothing is left behind.
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, 'x', '${path(B, F2)}', 'x.jpg', 'image/jpeg', 10)`), /check/);
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, 'x', '${A}/cliente/${F2}.jpg', 'x.jpg', 'image/jpeg', 10)`), /check/);
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, 'x', '${A}/mensajes/../${F2}.jpg', 'x.jpg', 'image/jpeg', 10)`), /check/);
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, 'x', '${path(A, F2, 'svg')}', 'x.svg', 'image/svg+xml', 10)`), /check/);
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, 'x', '${path(A, F2)}', 'x.jpg', 'text/html', 10)`), /check/);
await fails(as('service_role', '', `select * from public.post_customer_message('${A}', null, 'x', '${path(A, F2)}', 'x.jpg', 'image/jpeg', 9000000)`), /check/);
assert.equal(Number((await db.query(`select count(*) n from public.reservation_messages where reservation_id = '${A}'`)).rows[0].n), 1, 'failed posts leave no message');
// An attachment can never point to a message of another reservation.
const messageB = (await db.query(`select id from public.reservation_messages where reservation_id = '${B}'`)).rows[0].id;
await fails(db.query(`insert into public.reservation_message_attachments (message_id, reservation_id, path, name, mime, size) values ('${messageB}', '${A}', '${path(A, F2)}', 'x.jpg', 'image/jpeg', 10)`), /foreign key/);
// Agency replies still need text.
await fails(as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body, admin_id) values ('${A}', 'agencia', '  ', '${ADMIN}')`), /check/);

// Nobody but the service role can call the posting function or write attachments.
await fails(as('anon', '', `select * from public.post_customer_message('${A}', null, 'x', null, null, null, null)`), /permission denied/);
await fails(as('authenticated', ADMIN, `select * from public.post_customer_message('${A}', null, 'x', null, null, null, null)`), /permission denied/);
await fails(as('authenticated', ADMIN, `insert into public.reservation_message_attachments (message_id, reservation_id, path, name, mime, size) values ('${posted.rows[0].message_id}', '${A}', '${path(A, F2)}', 'x.jpg', 'image/jpeg', 10)`), /permission denied/);
await fails(as('anon', '', `select * from public.reservation_message_attachments`), /permission denied/);
assert.equal((await as('authenticated', USER, `select * from public.reservation_message_attachments`)).rows.length, 0, 'non-admin sees no attachments');
assert.equal((await as('authenticated', ADMIN, `select * from public.reservation_message_attachments`)).rows.length, 1, 'admin sees attachments');

// Service requests: written by the service role, read and moved through statuses by admins only.
await as('service_role', '', `insert into public.trip_service_requests (reservation_id, service, note, destination, trip_start, trip_end, travelers) values ('${A}', 'auto', 'SUV para 4', 'Miami', '2026-11-18', '2026-11-23', 2)`);
await fails(as('service_role', '', `insert into public.trip_service_requests (reservation_id, service) values ('${A}', 'yate')`), /check/);
await fails(as('anon', '', `select * from public.trip_service_requests`), /permission denied/);
await fails(as('authenticated', USER, `insert into public.trip_service_requests (reservation_id, service) values ('${A}', 'auto')`), /permission denied/);
assert.equal((await as('authenticated', USER, `select * from public.trip_service_requests`)).rows.length, 0);
await as('authenticated', ADMIN, `update public.trip_service_requests set status = 'en_cotizacion', handled_by = '${ADMIN}', updated_at = now()`);
await fails(as('authenticated', ADMIN, `update public.trip_service_requests set service = 'hotel'`), /permission denied/);
await fails(as('authenticated', ADMIN, `update public.trip_service_requests set note = 'otro'`), /permission denied/);
await fails(as('authenticated', ADMIN, `update public.trip_service_requests set status = 'cerrada', handled_by = '${USER}'`), /row-level security/);
await fails(as('authenticated', ADMIN, `update public.trip_service_requests set status = 'perdida', handled_by = '${ADMIN}'`), /check/);
assert.equal((await db.query(`select status from public.trip_service_requests`)).rows[0].status, 'en_cotizacion');

// Feedback: one per reservation, private, revisable by the service role only.
await as('service_role', '', `insert into public.trip_feedback (reservation_id, rating, comment) values ('${A}', 4, 'Todo bien')`);
await fails(as('service_role', '', `insert into public.trip_feedback (reservation_id, rating) values ('${A}', 5)`), /duplicate key/);
await fails(as('service_role', '', `insert into public.trip_feedback (reservation_id, rating) values ('${B}', 6)`), /check/);
await fails(as('anon', '', `select * from public.trip_feedback`), /permission denied/);
await fails(as('authenticated', ADMIN, `update public.trip_feedback set rating = 5`), /permission denied/);
assert.equal((await as('authenticated', USER, `select * from public.trip_feedback`)).rows.length, 0);

// The production grant deviation is repaired: admins reply and mark as read, nothing else.
await fails(as('authenticated', ADMIN, `update public.reservation_messages set body = 'editado'`), /permission denied/);
await fails(as('authenticated', ADMIN, `delete from public.reservation_messages`), /permission denied/);
await fails(as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body, admin_id, created_at) values ('${A}', 'agencia', 'x', '${ADMIN}', '2020-01-01')`), /permission denied/);
await as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body, admin_id) values ('${A}', 'agencia', 'Respuesta', '${ADMIN}')`);
await as('authenticated', ADMIN, `update public.reservation_messages set agency_read_at = now() where sender = 'cliente'`);
for (const table of ['reservation_message_attachments', 'trip_service_requests', 'trip_feedback']) {
  await fails(as('authenticated', ADMIN, `delete from public.${table}`), /permission denied/, `${table}: no delete despite default privileges`);
  await fails(as('anon', '', `select * from public.${table}`), /permission denied/);
}

// Nothing cascades: a reservation with records cannot be deleted silently.
await fails(db.query(`delete from public.reservations where id = '${A}'`), /foreign key/);
console.log('mi_viaje_premium.sql: all checks passed');
