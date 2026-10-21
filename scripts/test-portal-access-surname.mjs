// Isolated PostgreSQL/WASM only (no network, credentials or customer data): docs/sql/portal_access_surname.sql
// lets an empty access surname be completed once and keeps every other accepted field locked.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`create schema if not exists auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
create table public.reservations (id serial primary key, codigo text, cliente_apellido text, cliente_nombre text, total numeric, estado text default 'pendiente', fecha_inicio date, fecha_fin date, notas text, updated_at timestamptz, comision numeric, segmento text, supplier_status text default 'pendiente', supplier_reference text, prerreserva boolean default false, promoted_at timestamptz, promoted_by uuid, accepted_version_id uuid);
insert into public.reservations (codigo, cliente_nombre, total, accepted_version_id) values ('VT-A', 'Cliente A', 578, gen_random_uuid()), ('VT-B', 'Cliente B', 1076, gen_random_uuid());
update public.reservations set cliente_apellido = '  ' where codigo = 'VT-B';`);
const sql = fs.readFileSync('docs/sql/portal_access_surname.sql', 'utf8');
await db.exec(sql);
await db.exec(`create trigger reservation_commercial_guard before update on public.reservations for each row execute function public.reservation_commercial_guard();`);
const fails = async (statement, pattern) => { await assert.rejects(() => db.exec(statement), pattern); };
await db.exec(`update public.reservations set cliente_apellido = 'Prueba' where codigo = 'VT-A'`);
await db.exec(`update public.reservations set cliente_apellido = 'De la Prueba' where codigo = 'VT-B'`);
await fails(`update public.reservations set cliente_apellido = 'Otro' where codigo = 'VT-A'`, /bloqueados/);
await fails(`update public.reservations set cliente_nombre = 'Otro', cliente_apellido = cliente_apellido where codigo = 'VT-A'`, /bloqueados/);
await db.exec(`insert into public.reservations (codigo, cliente_nombre, total, accepted_version_id) values ('VT-C', 'C', 1, gen_random_uuid())`);
await fails(`update public.reservations set cliente_apellido = '   ' where codigo = 'VT-C'`, /apellido/);
await fails(`update public.reservations set cliente_apellido = 'Ok', total = 999 where codigo = 'VT-C'`, /bloqueados/);
await db.exec(`update public.reservations set notas = 'nota' where codigo = 'VT-A'`);
const rows = (await db.query(`select codigo, cliente_apellido from public.reservations order by codigo`)).rows;
assert.deepEqual(rows.map(r => r.cliente_apellido), ['Prueba', 'De la Prueba', null]);
assert.ok(!sql.split('$$')[1].includes('Ã'), 'function body must be clean UTF-8');
console.log('portal_access_surname.sql: 7 checks passed (one-time surname, locks intact, UTF-8 messages)');
