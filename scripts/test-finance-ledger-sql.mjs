// docs/sql/finance_ledger.sql on the production schema snapshot, after quotation_integrity.sql (PGlite, no network).
// Run: node scripts/test-finance-ledger-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ADMIN, STAFF, asUser, baselineDb } from "./baseline-db.mjs";

const db = await baselineDb();
const sql = name => fs.readFileSync(new URL(`../docs/sql/${name}`, import.meta.url), "utf8");
await db.exec(sql("quotation_integrity.sql"));
const migration = sql("finance_ledger.sql");
const one = async (text, params) => (await db.query(text, params)).rows[0];
const admin = (text, params) => asUser(db, ADMIN, () => db.query(text, params));
const value = async (text, params) => Object.values((await admin(text, params)).rows[0])[0];
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

const customer = (await one("insert into public.customers (nombre, telefono) values ('Cliente Prueba', '+50499999999') returning id")).id;
// An accepted quotation converted into a reservation (total 578 USD), as the app does it.
async function reservation(total = 578) {
  const id = (await one("insert into public.quotations (codigo, customer_id, cliente_nombre, destino, moneda, total, estado, validez, detalles) values ('COT-' || substr(md5(random()::text), 1, 8), $1, 'Cliente Prueba', 'Miami', 'USD', $2, 'borrador', current_date + 10, '{\"fechaSalida\":\"2026-12-01\",\"fechaRegreso\":\"2026-12-08\"}') returning id", [customer, total])).id;
  await db.query("insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden) values ($1, 'Paquete', 'Paquete', 1, $2, 0)", [id, total]);
  const snapshot = (await one("select jsonb_build_object('quotation', to_jsonb(q) || '{\"version\":1}', 'items', (select jsonb_agg(to_jsonb(i)) from public.quotation_items i where i.quotation_id = q.id)) as s from public.quotations q where id = $1", [id])).s;
  const version = (await one("insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, $2, $3) returning id", [id, snapshot, ADMIN])).id;
  await db.query("update public.quotations set estado = 'enviada', version = 1, sent_version_id = $2 where id = $1", [id, version]);
  await admin("select public.accept_quotation($1, $2, null)", [id, version]);
  return value("select public.convert_accepted_quotation($1, $2, false, 'PRUEBA')", [id, version]);
}
const pay = (r, amount, request = randomUUID()) => value("select public.record_reservation_payment($1, $2, $3, 'USD', 'transferencia', current_date, 'TRF', null)", [request, r, amount]);
const refund = (r, amount, { request = randomUUID(), reason = "Cambio de fecha", kind = "reembolso", reverses = null } = {}) =>
  value("select public.record_reservation_refund($1, $2, $3, $4, 'transferencia', current_date, 'DEV-1', $5, $6)", [request, r, kind, amount, reason, reverses]);
const received = async r => Number((await one("select coalesce(sum(monto), 0) as s from public.payments where reservation_id = $1", [r])).s);

await check("applies, and applies again", async () => {
  await db.exec(migration);
  await db.exec(migration);
});

await check("a refund is a new negative movement, up to what was received, recorded once per request", async () => {
  const r = await reservation();
  await pay(r, 300);
  const request = randomUUID();
  const id = await refund(r, 100, { request });
  assert.equal(await refund(r, 100, { request }), id, "a retry returns the same movement");
  await assert.rejects(refund(r, 120, { request }), /ya se usó con otros datos/);
  assert.equal(await received(r), 200);
  assert.deepEqual(await one("select tipo, monto::float, motivo from public.payments where id = $1", [id]), { tipo: "reembolso", monto: -100, motivo: "Cambio de fecha" });
  await assert.rejects(refund(r, 250), /Solo se puede devolver lo recibido: 200/);
  await assert.rejects(refund(r, 10, { reason: " " }), /motivo/);
});

await check("a mistaken payment is reversed once, only before it has a receipt", async () => {
  const r = await reservation();
  const wrong = await pay(r, 50);
  const reversal = await refund(r, null, { kind: "reverso", reverses: wrong, reason: "Registrado en la reserva equivocada" });
  assert.deepEqual(await one("select tipo, monto::float, revierte_a from public.payments where id = $1", [reversal]), { tipo: "reverso", monto: -50, revierte_a: wrong });
  assert.equal(await received(r), 0);
  await assert.rejects(refund(r, null, { kind: "reverso", reverses: wrong }), /ya fue revertido/);
  const receipted = await pay(r, 80);
  await admin("select public.create_payment_receipt($1)", [receipted]);
  await assert.rejects(refund(r, null, { kind: "reverso", reverses: receipted }), /ya tiene recibo: registre un reembolso/);
  await assert.rejects(refund(r, null, { kind: "reverso", reverses: reversal }), /Elija un pago/);
  // A payment already partly refunded cannot be reversed: the net received would go below zero.
  const other = await reservation();
  const partly = await pay(other, 300);
  await refund(other, 50);
  await assert.rejects(refund(other, null, { kind: "reverso", reverses: partly }), /saldo recibido en negativo/);
  assert.equal(await received(other), 250);
});

await check("receipts are only for payments, and show the net balance", async () => {
  const r = await reservation();
  await pay(r, 300);
  const back = await refund(r, 100);
  await assert.rejects(admin("select public.create_payment_receipt($1)", [back]), /invalid_payment_currency_or_amount/);
  const receipt = await value("select public.create_payment_receipt($1)", [await pay(r, 78)]);
  assert.equal(Number((await one("select snapshot->>'balance' as b from public.payment_receipts where id = $1", [receipt])).b), 300);
});

await check("an invoice can only be marked paid when the net received covers it", async () => {
  const r = await reservation();
  const invoice = await value("select public.create_reservation_invoice($1, current_date + 10)", [r]);
  await pay(r, 578);
  await refund(r, 100);
  await assert.rejects(admin("update public.invoices set estado = 'pagada' where id = $1", [invoice]), /no cubren el total/);
});

await check("payments cannot be edited or deleted; invoices and reservations cannot be deleted", async () => {
  const r = await reservation();
  const p = await pay(r, 10);
  await assert.rejects(admin("update public.payments set monto = 1 where id = $1", [p]), /permission denied/);
  await assert.rejects(admin("delete from public.payments where id = $1", [p]), /permission denied/);
  const invoice = await value("select public.create_reservation_invoice($1, current_date + 10)", [r]);
  await assert.rejects(admin("delete from public.invoices where id = $1", [invoice]), /permission denied/);
  await assert.rejects(admin("delete from public.reservations where id = $1", [r]), /permission denied/);
  await assert.rejects(admin("insert into public.payments (reservation_id, monto, moneda, metodo) values ($1, -5, 'USD', 'otro')", [r]), /payments_monto_check/);
});

await check("cancelling needs a reason, annuls unpaid invoices, keeps payments, and is final", async () => {
  const r = await reservation();
  await pay(r, 200);
  const invoice = await value("select public.create_reservation_invoice($1, current_date + 10)", [r]);
  await assert.rejects(admin("select public.cancel_reservation($1, '', true)", [r]), /motivo de la cancelación/);
  await assert.rejects(admin("update public.reservations set estado = 'cancelada' where id = $1", [r]), /reservations_cancelacion_motivo/);
  const result = await value("select public.cancel_reservation($1, 'El cliente desistió del viaje', true)", [r]);
  assert.deepEqual(result, { estado: "cancelada", facturas_anuladas: 1, recibido: 200, moneda: "USD" });
  assert.deepEqual(await one("select r.estado, r.cancelacion_motivo, r.cancelada_por, (select estado from public.invoices where id = $2) as factura from public.reservations r where id = $1", [r, invoice]),
    { estado: "cancelada", cancelacion_motivo: "El cliente desistió del viaje", cancelada_por: ADMIN, factura: "anulada" });
  assert.equal(await received(r), 200, "payments stay; a refund is recorded apart");
  assert.equal((await value("select public.cancel_reservation($1, 'otra vez', true)", [r])).ya_cancelada, true);
  await assert.rejects(admin("update public.reservations set estado = 'pendiente' where id = $1", [r]), /Estado final/);
  await refund(r, 150, { reason: "Devolución por cancelación" });
  assert.equal(await received(r), 50);
});

await check("a paid invoice stays paid when the reservation is cancelled", async () => {
  const r = await reservation();
  const invoice = await value("select public.create_reservation_invoice($1, current_date + 10)", [r]);
  await pay(r, 578);
  await admin("update public.invoices set estado = 'pagada' where id = $1", [invoice]);
  assert.equal((await value("select public.cancel_reservation($1, 'Cancelado por el proveedor', true)", [r])).facturas_anuladas, 0);
  assert.equal((await one("select estado from public.invoices where id = $1", [invoice])).estado, "pagada");
});

await check("the activity log tells payments, refunds and reversals apart", async () => {
  const r = await reservation();
  const p = await pay(r, 40);
  await refund(r, 10);
  await refund(r, null, { kind: "reverso", reverses: await pay(r, 5) });
  const actions = (await db.query("select action from public.admin_audit_log where entity = 'payment' and details->>'reservation_id' = $1 order by id", [r])).rows.map(row => row.action);
  assert.deepEqual(actions, ["payment.recorded", "payment.refunded", "payment.recorded", "payment.reversed"]);
  assert.ok(p);
});

await check("an amendment still moves a reservation, and a cancelled one still refuses it", async () => {
  const r = await reservation();
  await value("select public.cancel_reservation($1, 'Prueba', false)", [r]);
  await assert.rejects(admin("update public.reservations set total = 1 where id = $1", [r]), /bloqueados/);
});

await check("admins only, and the anonymous role cannot call the new functions", async () => {
  const r = await reservation();
  await assert.rejects(asUser(db, STAFF, () => db.query("select public.cancel_reservation($1, 'motivo', false)", [r])), /No autorizado/);
  await assert.rejects(asUser(db, STAFF, () => db.query("select public.record_reservation_refund(gen_random_uuid(), $1, 'reembolso', 1, 'otro', current_date, null, 'motivo', null)", [r])), /No autorizado/);
  const acl = (await db.query("select proname, proacl::text from pg_proc where proname in ('record_reservation_refund','cancel_reservation')")).rows;
  assert.ok(acl.length === 2 && acl.every(row => !row.proacl.includes("anon=") && !/[{,]=X\//.test(row.proacl)), JSON.stringify(acl));
});

console.log(`\n${passed} checks passed`);
