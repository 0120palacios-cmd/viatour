// docs/sql/quotation_integrity.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-quotation-integrity-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, STAFF, asUser, baselineDb, snapshotAt } from "./baseline-db.mjs";

// Applied to production on 2026-10-23: rehearsed on the snapshot from before it (commit 4fd4510).
const db = await baselineDb({ snapshot: snapshotAt("4fd4510") });
const migration = fs.readFileSync(new URL("../docs/sql/quotation_integrity.sql", import.meta.url), "utf8");
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const admin = (sql, params) => asUser(db, ADMIN, () => db.query(sql, params));
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

let customer;
// A quotation with one price line, registered as sent (version 1, like registerQuotationSent).
async function sentQuotation({ total = 578, moneda = "USD", customerId = customer, enmiendaDe = null } = {}) {
  const id = (await one("insert into public.quotations (codigo, customer_id, cliente_nombre, cliente_telefono, destino, moneda, total, estado, validez, enmienda_de, detalles) values ('COT-' || substr(md5(random()::text), 1, 8), $1, 'Cliente Prueba', '+50499999999', 'Miami', $2, $3, 'borrador', current_date + 10, $4, $5) returning id",
    [customerId, moneda, total, enmiendaDe, { fechaSalida: "2026-12-01", fechaRegreso: "2026-12-08" }])).id;
  await db.query("insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden) values ($1, 'Paquete Miami', 'Paquete', 1, $2, 0)", [id, total]);
  const snapshot = (await one("select jsonb_build_object('quotation', to_jsonb(q) || '{\"version\":1}', 'items', (select jsonb_agg(to_jsonb(i)) from public.quotation_items i where i.quotation_id = q.id), 'canal', 'whatsapp') as s from public.quotations q where id = $1", [id])).s;
  const version = (await one("insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, $2, $3) returning id", [id, snapshot, ADMIN])).id;
  await db.query("update public.quotations set estado = 'enviada', version = 1, sent_version_id = $2 where id = $1", [id, version]);
  return { id, version };
}
const accept = q => admin("select public.accept_quotation($1, $2, null)", [q.id, q.version]);
const convert = async q => (await asUser(db, ADMIN, () => one("select public.convert_accepted_quotation($1, $2, false, 'PRUEBA') as id", [q.id, q.version]))).id;
const copy = (source, amendment, items = [{ descripcion: "Paquete Miami", tipo: "Paquete", cantidad: 1, precio_unitario: 600 }]) =>
  asUser(db, ADMIN, () => one("select public.create_quotation_copy($1, $2, $3, $4) as id", [source, amendment, { codigo: `COT-${Math.random().toString(16).slice(2, 10)}`, customer_id: customer, cliente_nombre: "Cliente Prueba", destino: "Miami", moneda: "USD", validez: "2026-12-31", tipo: "general", detalles: {} }, JSON.stringify(items)]));
const state = async id => (await one("select estado from public.quotations where id = $1", [id])).estado;

customer = (await one("insert into public.customers (nombre, telefono) values ('Cliente Prueba', '+50499999999') returning id")).id;
await db.query("insert into public.quotations (codigo, cliente_nombre, moneda, total, estado) values ('COT-ANTIGUA', 'Cliente', 'USD', 0, 'rechazada')");

await check("applies, and applies again", async () => {
  await db.exec(migration);
  await db.exec(migration);
});

await check("rejecting requires a reason; earlier rejections stay valid", async () => {
  const { id } = await sentQuotation();
  await assert.rejects(admin("update public.quotations set estado = 'rechazada' where id = $1", [id]), /quotations_rechazo_motivo/);
  await assert.rejects(admin("update public.quotations set estado = 'rechazada', motivo_rechazo = ' a ' where id = $1", [id]), /quotations_rechazo_motivo/);
  await admin("update public.quotations set estado = 'rechazada', motivo_rechazo = 'Eligió otra fecha', rechazada_en = now() where id = $1", [id]);
  assert.equal(await state(id), "rechazada");
  assert.equal((await one("select count(*)::int as n from public.quotations where codigo = 'COT-ANTIGUA'")).n, 1);
});

await check("a copy and its price lines are created together, with the total from the lines", async () => {
  const { id } = await sentQuotation();
  const created = (await copy(id, false, [{ descripcion: "Vuelo", tipo: "Tarifa aérea", cantidad: 2, precio_unitario: 300 }, { descripcion: "Descuento", tipo: "Descuento", cantidad: 1, precio_unitario: 50 }])).id;
  const row = await one("select estado, total::float, enmienda_de, (select count(*)::int from public.quotation_items where quotation_id = $1) as lines from public.quotations where id = $1", [created]);
  assert.deepEqual(row, { estado: "borrador", total: 550, enmienda_de: null, lines: 2 });
});

await check("a failing price line leaves no half-made copy", async () => {
  const { id } = await sentQuotation();
  const before = (await one("select count(*)::int as n from public.quotations")).n;
  await assert.rejects(copy(id, false, [{ descripcion: null, tipo: "Paquete", cantidad: 1, precio_unitario: 1 }]));
  assert.equal((await one("select count(*)::int as n from public.quotations")).n, before);
});

await check("only an accepted quotation is amended, one open amendment at a time", async () => {
  const sent = await sentQuotation();
  await assert.rejects(copy(sent.id, true), /Solo se enmienda una cotización aceptada/);
  await accept(sent);
  const first = (await copy(sent.id, true)).id;
  assert.equal((await one("select enmienda_de from public.quotations where id = $1", [first])).enmienda_de, sent.id);
  await assert.rejects(copy(sent.id, true), /Ya existe la enmienda .* en curso/);
});

let moved;
await check("accepting an amendment replaces the original and moves its reservation to the new version", async () => {
  const original = await sentQuotation({ total: 578 });
  await accept(original);
  const reservation = await convert(original);
  await asUser(db, ADMIN, () => db.query("select public.record_reservation_payment(gen_random_uuid(), $1, 300, 'USD', 'transferencia', current_date, 'TRF', null)", [reservation]));
  const before = await one("select cliente_email, cliente_apellido, codigo from public.reservations where id = $1", [reservation]);
  const amendment = await sentQuotation({ total: 600, enmiendaDe: original.id });
  await accept(amendment);
  assert.equal(await state(original.id), "reemplazada");
  assert.equal((await one("select reemplazada_por from public.quotations where id = $1", [original.id])).reemplazada_por, amendment.id);
  const after = await one("select quotation_id, accepted_version_id, total::float, cliente_email, cliente_apellido, codigo, fecha_inicio::text, (select sum(monto)::float from public.payments where reservation_id = r.id) as pagado from public.reservations r where id = $1", [reservation]);
  assert.deepEqual(after, { quotation_id: amendment.id, accepted_version_id: amendment.version, total: 600, ...before, fecha_inicio: "2026-12-01", pagado: 300 });
  assert.deepEqual((await db.query("select descripcion, precio_unitario::float from public.reservation_items where reservation_id = $1", [reservation])).rows, [{ descripcion: "Paquete Miami", precio_unitario: 600 }]);
  const log = (await db.query("select action from public.admin_audit_log where entity_id in ($1, $2) order by id", [original.id, reservation])).rows.map(row => row.action);
  assert.ok(log.includes("quotation.status_changed") && log.includes("reservation.updated"), log.join(","));
  moved = { original, amendment, reservation };
});

await check("accepting again is harmless, and the replaced quotation is frozen", async () => {
  await accept(moved.amendment);
  await assert.rejects(admin("update public.quotations set notas = 'cambio' where id = $1", [moved.original.id]), /inmutable/);
  await assert.rejects(admin("insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden) values ($1, 'x', 'Paquete', 1, 1, 5)", [moved.original.id]), /no se pueden modificar/);
  await assert.rejects(copy(moved.original.id, true), /ya fue reemplazada por/);
});

await check("an amendment below what was paid is refused and nothing changes", async () => {
  const original = await sentQuotation({ total: 578 });
  await accept(original);
  const reservation = await convert(original);
  await asUser(db, ADMIN, () => db.query("select public.record_reservation_payment(gen_random_uuid(), $1, 500, 'USD', 'transferencia', current_date, 'TRF', null)", [reservation]));
  const amendment = await sentQuotation({ total: 450, enmiendaDe: original.id });
  await assert.rejects(accept(amendment), /ya pagó 500.* Registre primero la devolución/);
  assert.equal(await state(amendment.id), "enviada");
  assert.equal(await state(original.id), "aceptada");
  assert.equal((await one("select total::float from public.reservations where id = $1", [reservation])).total, 578);
});

await check("a different currency or customer is refused", async () => {
  const original = await sentQuotation();
  await accept(original);
  await convert(original);
  await assert.rejects(accept(await sentQuotation({ moneda: "HNL", total: 15000, enmiendaDe: original.id })), /la moneda de la reserva/);
  const other = (await one("insert into public.customers (nombre, telefono) values ('Otro', '+50499990000') returning id")).id;
  await assert.rejects(accept(await sentQuotation({ customerId: other, enmiendaDe: original.id })), /mismo cliente/);
  assert.equal(await state(original.id), "aceptada");
});

await check("without a reservation, the amendment replaces the original and is the one converted", async () => {
  const original = await sentQuotation();
  await accept(original);
  const amendment = await sentQuotation({ total: 610, enmiendaDe: original.id });
  await accept(amendment);
  assert.equal(await state(original.id), "reemplazada");
  await assert.rejects(convert(original), /Revise la versión aceptada/);
  const reservation = await convert(amendment);
  assert.equal((await one("select total::float from public.reservations where id = $1", [reservation])).total, 610);
});

await check("accepted reservations stay locked outside an amendment", async () => {
  await assert.rejects(admin("update public.reservations set total = 1 where id = $1", [moved.reservation]), /bloqueados/);
  await assert.rejects(admin("delete from public.reservation_items where reservation_id = $1", [moved.reservation]), /bloqueados/);
  const original = await sentQuotation();
  await accept(original);
  const reservation = await convert(original);
  await assert.rejects(asUser(db, ADMIN, () => db.exec(`select set_config('viatour.amending_reservation', '${reservation}', false); delete from public.reservation_items where reservation_id = '${reservation}'`)), /bloqueados/);
  await db.exec("reset viatour.amending_reservation");
  const other = (await one("select id from public.quotation_versions where quotation_id = $1", [moved.amendment.id])).id;
  await assert.rejects(admin("update public.reservations set accepted_version_id = $2 where id = $1", [reservation, other]), /Solo una enmienda aceptada/);
});

await check("admins only, and the anonymous role cannot call the new functions", async () => {
  const { id } = await sentQuotation();
  await assert.rejects(asUser(db, STAFF, () => db.query("select public.create_quotation_copy($1, false, '{}'::jsonb, '[]'::jsonb)", [id])), /No autorizado/);
  const acl = (await db.query("select proname, proacl::text from pg_proc where proname in ('create_quotation_copy','apply_quotation_amendment')")).rows;
  assert.ok(acl.length === 2 && acl.every(row => !row.proacl.includes("anon=") && !/[{,]=X\//.test(row.proacl)), JSON.stringify(acl));
});

console.log(`\n${passed} checks passed`);
