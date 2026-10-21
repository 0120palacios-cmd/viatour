// Isolated PostgreSQL/WASM only (no network, credentials or customer data): docs/sql/reservation_messages.sql
// RLS, grants, immutability and integrity, with simulated anon / authenticated (admin and non-admin) roles.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const ADMIN = '11111111-1111-4111-8111-111111111111', USER = '22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function public.is_admin() returns boolean language sql stable as $$ select current_setting('test.uid', true) = '${ADMIN}' $$;
grant execute on function auth.uid(), public.is_admin() to anon, authenticated, service_role; grant usage on schema public to anon, authenticated, service_role;
create table public.reservations (id uuid primary key, codigo text);
insert into public.reservations values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'VT-A'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'VT-B');`);
await db.exec(fs.readFileSync('docs/sql/reservation_messages.sql', 'utf8'));
await db.exec(fs.readFileSync('docs/sql/reservation_messages.sql', 'utf8')); // idempotent
const as = async (role, uid, sql) => db.exec(`set role ${role}; select set_config('test.uid', '${uid}', false); ${sql}; reset role;`);
const fails = async (promise, pattern) => { await assert.rejects(promise, pattern); await db.exec('reset role'); };
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
// Customer messages are written by the server with the service role (scoped by the OTP session in the app).
await as('service_role', '', `insert into public.reservation_messages (reservation_id, sender, topic, body) values ('${A}', 'cliente', 'vuelo', 'Hola A'), ('${B}', 'cliente', null, 'Hola B')`);
await fails(as('anon', '', `select * from public.reservation_messages`), /permission denied/);
await fails(as('anon', '', `insert into public.reservation_messages (reservation_id, sender, body) values ('${A}', 'cliente', 'x')`), /permission denied/);
// A signed-in non-admin sees nothing and cannot write.
await as('authenticated', USER, `create temp table seen as select count(*) n from public.reservation_messages`);
assert.equal(Number((await db.query('select n from seen')).rows[0].n), 0);
await fails(as('authenticated', USER, `insert into public.reservation_messages (reservation_id, sender, body, admin_id) values ('${A}', 'agencia', 'x', '${USER}')`), /row-level security/);
// The admin replies only as itself, only as the agency, and cannot backdate or pre-read.
await as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body, admin_id) values ('${A}', 'agencia', 'Respuesta', '${ADMIN}')`);
await fails(as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body, admin_id) values ('${A}', 'agencia', 'x', '${USER}')`), /row-level security/);
await fails(as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body) values ('${A}', 'cliente', 'fingido')`), /row-level security|check constraint/);
await fails(as('authenticated', ADMIN, `insert into public.reservation_messages (reservation_id, sender, body, admin_id, created_at) values ('${A}', 'agencia', 'x', '${ADMIN}', '2020-01-01')`), /permission denied/);
// Message text and author are immutable for admins; only the agency read mark can change; nothing is deletable.
await as('authenticated', ADMIN, `update public.reservation_messages set agency_read_at = now() where sender = 'cliente'`);
await fails(as('authenticated', ADMIN, `update public.reservation_messages set body = 'editado'`), /permission denied/);
await fails(as('authenticated', ADMIN, `delete from public.reservation_messages`), /permission denied/);
// Integrity: length, sender/admin pairing, topic list, and a reservation with messages cannot be deleted.
await fails(as('service_role', '', `insert into public.reservation_messages (reservation_id, sender, body) values ('${A}', 'cliente', '   ')`), /check constraint/);
await fails(as('service_role', '', `insert into public.reservation_messages (reservation_id, sender, body) values ('${A}', 'cliente', repeat('x', 2001))`), /check constraint/);
await fails(as('service_role', '', `insert into public.reservation_messages (reservation_id, sender, body, admin_id) values ('${A}', 'cliente', 'x', '${ADMIN}')`), /check constraint/);
await fails(as('service_role', '', `insert into public.reservation_messages (reservation_id, sender, topic, body) values ('${A}', 'cliente', 'spam', 'x')`), /check constraint/);
await assert.rejects(db.exec(`delete from public.reservations where id = '${A}'`), /foreign key/);
const rows = (await db.query(`select reservation_id, sender, body, agency_read_at is not null as read from public.reservation_messages order by created_at, sender`)).rows;
assert.equal(rows.length, 3);
assert.ok(rows.filter(row => row.sender === 'cliente').every(row => row.read));
console.log('reservation_messages.sql: 16 checks passed (RLS isolation, column grants, immutability, integrity, idempotent)');
