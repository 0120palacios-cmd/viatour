// Rebuilds the production schema snapshot in PGlite and checks the invariants later phases rely on.
// No network, credentials or customer data. Run: node scripts/test-baseline-schema.mjs
import assert from "node:assert/strict";
import { ADMIN, STAFF, asUser, baselineDb } from "./baseline-db.mjs";

const db = await baselineDb();
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

await check("every public table has RLS enabled", async () => {
  const { rows } = await db.query("select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity");
  assert.deepEqual(rows, []);
});

await check("is_admin follows public.admins", async () => {
  assert.equal((await asUser(db, ADMIN, () => one("select public.is_admin() as v"))).v, true);
  assert.equal((await asUser(db, STAFF, () => one("select public.is_admin() as v"))).v, false);
});

await check("core commercial RPCs exist", async () => {
  for (const name of ["accept_quotation", "convert_accepted_quotation", "convert_quotation_with_passengers", "save_reservation_record", "create_reservation_invoice", "record_reservation_payment", "create_payment_receipt", "save_reservation_travel"]) {
    assert.ok((await one("select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1", [name])).n >= 1, name);
  }
});

await check("an admin can create a customer, a non-admin cannot read it", async () => {
  await asUser(db, ADMIN, () => db.query("insert into public.customers (nombre, email) values ('Cliente Prueba', 'prueba@example.test')"));
  const seen = await asUser(db, STAFF, () => db.query("select id from public.customers"));
  assert.equal(seen.rows.length, 0);
  const anon = await asUser(db, null, () => db.query("select id from public.customers").catch(error => ({ rows: [], error })));
  assert.equal(anon.rows.length, 0);
});

await check("cancelled reservations are final (reservation_commercial_guard)", async () => {
  const reservation = await one("insert into public.reservations (cliente_nombre, cliente_email, destino, moneda, total, estado, cancelacion_motivo) values ('Cliente Prueba', 'prueba@example.test', 'Miami', 'USD', 100, 'cancelada', 'Prueba') returning id");
  await assert.rejects(db.query("update public.reservations set estado = 'pendiente' where id = $1", [reservation.id]), /Estado final/);
});

console.log(`\n${passed} checks passed against docs/sql/000_baseline_schema.sql`);
