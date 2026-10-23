// docs/sql/admin_audit_log.sql rehearsed on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-admin-audit-log-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, STAFF, asUser, baselineDb } from "./baseline-db.mjs";

const db = await baselineDb();
const migration = fs.readFileSync(new URL("../docs/sql/admin_audit_log.sql", import.meta.url), "utf8");
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

await check("applies, and applies again without changes", async () => {
  await db.exec(migration);
  await db.exec(migration);
  assert.equal((await one("select count(*)::int as n from pg_trigger where tgname like 'audit_%'")).n, 6);
});

// Acting as the admin, as the app does (session client + RLS).
const admin = fn => asUser(db, ADMIN, fn);
let reservationId;

await check("reservation changes are logged with the actor and no personal data", async () => {
  reservationId = (await admin(() => one("insert into public.reservations (cliente_nombre, cliente_email, destino, moneda, total, estado) values ('Ana Prueba', 'ana@example.test', 'Miami', 'USD', 500, 'pendiente') returning id"))).id;
  await admin(() => db.query("update public.reservations set fecha_inicio = '2026-12-01', fecha_fin = '2026-12-05' where id = $1", [reservationId]));
  await admin(() => db.query("update public.reservations set estado = 'cancelada' where id = $1", [reservationId]));
  const log = await rows("select actor, action, details from public.admin_audit_log where entity = 'reservation' and entity_id = $1 order by id", [reservationId]);
  assert.deepEqual(log.map(entry => entry.action), ["reservation.created", "reservation.updated", "reservation.cancelled"]);
  assert.ok(log.every(entry => entry.actor === ADMIN));
  const text = JSON.stringify(log);
  assert.ok(!text.includes("Ana") && !text.includes("example.test"), "names and e-mails are never copied");
});

await check("payments are logged through record_reservation_payment", async () => {
  const open = (await admin(() => one("insert into public.reservations (cliente_nombre, cliente_email, destino, moneda, total, estado) values ('Ana Prueba', 'ana@example.test', 'Miami', 'USD', 500, 'pendiente') returning id"))).id;
  const payment = (await admin(() => one("select public.record_reservation_payment($1, $2, 200, 'USD', 'transferencia', current_date, null, 'nota privada') as id", ["33333333-3333-4333-8333-333333333333", open]))).id;
  const entry = await one("select action, details from public.admin_audit_log where entity = 'payment' and entity_id = $1", [payment]);
  assert.equal(entry.action, "payment.recorded");
  assert.equal(Number(entry.details.monto), 200);
  assert.ok(!JSON.stringify(entry).includes("nota privada"), "payment notes are not copied");
});

await check("the existing guards still apply (cancelled stays final)", async () => {
  await assert.rejects(admin(() => db.query("update public.reservations set estado = 'pendiente' where id = $1", [reservationId])), /Estado final/);
});

await check("admins read the log; other users and anon do not", async () => {
  assert.ok((await admin(() => rows("select id from public.admin_audit_log"))).length > 0);
  assert.equal((await asUser(db, STAFF, () => rows("select id from public.admin_audit_log"))).length, 0);
  await assert.rejects(asUser(db, null, () => rows("select id from public.admin_audit_log")), /permission denied/);
});

await check("nobody can insert, edit or delete entries directly", async () => {
  await assert.rejects(admin(() => db.query("insert into public.admin_audit_log (action, entity, entity_id) values ('x.y', 'admin', $1)", [ADMIN])), /permission denied/);
  await assert.rejects(admin(() => db.query("update public.admin_audit_log set action = 'x.y'")), /permission denied/);
  await assert.rejects(db.query("delete from public.admin_audit_log"), /no se puede modificar/);
});

await check("log_admin_action: admins only, actor is always the caller", async () => {
  const id = (await admin(() => one("select public.log_admin_action('passenger.document_viewed', 'reservation', $1, 'VT-PRUEBA', '{}'::jsonb) as id", [reservationId]))).id;
  assert.equal((await one("select actor from public.admin_audit_log where id = $1", [id])).actor, ADMIN);
  await assert.rejects(asUser(db, STAFF, () => db.query("select public.log_admin_action('x.y', 'admin', $1)", [STAFF])), /No autorizado/);
});

await check("trigger functions cannot be called through the API", async () => {
  await assert.rejects(admin(() => db.query("select public.audit_payment_change()")), /permission denied|trigger functions can only be called as triggers/);
});

console.log(`\n${passed} checks passed`);
