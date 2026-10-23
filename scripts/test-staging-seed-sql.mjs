// docs/sql/staging_seed.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-staging-seed-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, baselineDb } from "./baseline-db.mjs";

const seed = fs.readFileSync(new URL("../docs/sql/staging_seed.sql", import.meta.url), "utf8");
const one = async (db, sql) => (await db.query(sql)).rows[0];
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

// Like staging: one auth user and no admins until the seed promotes it.
async function emptyStaging() {
  const db = await baselineDb();
  await db.exec(`delete from public.admins; delete from auth.users where id <> '${ADMIN}';`);
  return db;
}

const db = await emptyStaging();
await check("applies on an empty staging database", async () => { await db.exec(seed); });

await check("the only user becomes the admin", async () => {
  assert.deepEqual((await db.query("select user_id from public.admins")).rows, [{ user_id: ADMIN }]);
});

await check("every quotation state is represented", async () => {
  const states = Object.fromEntries((await db.query("select estado, count(*)::int as n from public.quotations group by 1")).rows.map(row => [row.estado, row.n]));
  assert.deepEqual(states, { borrador: 1, enviada: 2, rechazada: 1, aceptada: 3 });
  assert.equal((await one(db, "select count(*)::int as n from public.quotations where estado = 'enviada' and validez < current_date")).n, 1);
});

await check("reservations come from the real conversion, with payments and invoices", async () => {
  const rows = (await db.query("select r.cliente_email, r.cliente_apellido, r.total::float, (select sum(monto)::float from public.payments p where p.reservation_id = r.id) as pagado, (select count(*)::int from public.invoices i where i.reservation_id = r.id) as facturas, r.accepted_version_id is not null as versionada from public.reservations r order by r.total")).rows;
  assert.deepEqual(rows, [
    { cliente_email: "marta.flores@example.test", cliente_apellido: "FLORES", total: 578, pagado: 300, facturas: 1, versionada: true },
    { cliente_email: null, cliente_apellido: "CASTILLO", total: 1076, pagado: 1076, facturas: 1, versionada: true },
  ]);
});

await check("all data is visibly synthetic", async () => {
  const people = (await db.query("select nombre as n, email as e, telefono as t from public.customers union all select nombre, email, telefono from public.leads")).rows;
  assert.ok(people.every(p => p.n.startsWith("[PRUEBA]") && (!p.e || p.e.endsWith("@example.test")) && p.t.startsWith("+5049999")), JSON.stringify(people));
});

await check("running it again changes nothing", async () => {
  const before = await one(db, "select (select count(*) from public.quotations) q, (select count(*) from public.payments) p");
  await db.exec(seed);
  assert.deepEqual(await one(db, "select (select count(*) from public.quotations) q, (select count(*) from public.payments) p"), before);
});

await check("refuses to run on a database with real data", async () => {
  const real = await emptyStaging();
  await real.exec(`insert into public.admins (user_id) values ('${ADMIN}'); insert into public.customers (nombre, telefono) values ('Cliente real', '+50488880000');`);
  await assert.rejects(real.exec(seed), /real data/);
  await real.exec("rollback");
  assert.equal((await one(real, "select count(*)::int as n from public.quotations")).n, 0);
});

await check("refuses without a single staging user to make admin", async () => {
  const none = await emptyStaging();
  await none.exec(`delete from auth.users`);
  await assert.rejects(none.exec(seed), /staging admin/);
  await none.exec("rollback");
});

console.log(`\n${passed} checks passed`);
