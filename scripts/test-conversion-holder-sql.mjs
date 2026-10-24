// docs/sql/conversion_holder.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-conversion-holder-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, STAFF, asUser, baselineDb } from "./baseline-db.mjs";

const db = await baselineDb();
const migration = fs.readFileSync(new URL("../docs/sql/conversion_holder.sql", import.meta.url), "utf8");
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

// An accepted quotation; the customer is optional, as when it was sold with only a WhatsApp number.
async function accepted({ customer = null, name = "+504 9999-0099" } = {}) {
  const quotation = (await one("insert into public.quotations (codigo, customer_id, cliente_nombre, cliente_telefono, destino, moneda, total, estado) values ('COT-' || substr(md5(random()::text), 1, 8), $1, $2, '+50499990099', 'Fort Lauderdale', 'USD', 589, 'borrador') returning id", [customer, name])).id;
  const snapshot = { quotation: { customer_id: customer, cliente_nombre: name, cliente_email: "", cliente_telefono: "+50499990099", destino: "Fort Lauderdale", moneda: "USD", total: 589, detalles: { fechaSalida: "2026-11-10", fechaRegreso: "2026-11-17" } }, items: [{ descripcion: "Tarifa aérea", tipo: "Tarifa aérea", cantidad: 1, precio_unitario: 589 }], canal: "whatsapp" };
  const version = (await one("insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, $2, $3) returning id", [quotation, snapshot, ADMIN])).id;
  await db.query("update public.quotations set estado = 'aceptada', version_aceptada = 1, accepted_version_id = $2 where id = $1", [quotation, version]);
  return { quotation, version };
}
const newCustomer = async (name = "Ana Lucia Prueba Torres") => (await one("insert into public.customers (nombre, telefono) values ($1, '+50499990099') returning id", [name])).id;
const convert = (q, extra = "", params = []) => asUser(db, ADMIN, () => one(`select public.convert_accepted_quotation($1, $2, false, 'PRUEBA'${extra}) as id`, [q.quotation, q.version, ...params]));
const reservation = id => one("select customer_id, cliente_nombre, cliente_apellido, total::float from public.reservations where id = $1", [id]);

await check("applies, and applies again; one function per name, no ambiguous overloads", async () => {
  await db.exec(migration);
  await db.exec(migration);
  const fns = (await db.query("select proname, pronargs from pg_proc where proname in ('convert_accepted_quotation','convert_quotation_with_passengers') order by 1")).rows;
  assert.deepEqual(fns, [{ proname: "convert_accepted_quotation", pronargs: 6 }, { proname: "convert_quotation_with_passengers", pronargs: 8 }]);
});

await check("a quotation sold with only a WhatsApp number converts with the holder named at conversion", async () => {
  const q = await accepted();
  const customer = await newCustomer();
  const id = (await convert(q, ", $3, $4", ["Ana Lucia Prueba Torres", customer])).id;
  assert.deepEqual(await reservation(id), { customer_id: customer, cliente_nombre: "Ana Lucia Prueba Torres", cliente_apellido: "PRUEBA", total: 589 });
});

await check("without a customer at all, the conversion asks for the holder", async () => {
  await assert.rejects(convert(await accepted(), ", $3", ["Ana Lucia Prueba Torres"]), /Indique el titular/);
});

await check("a version that names its customer keeps it; another customer is refused", async () => {
  const customer = await newCustomer();
  const q = await accepted({ customer, name: "Ana Pérez" });
  await assert.rejects(convert(q, ", $3, $4", ["Ana Pérez", await newCustomer("Otra")]), /cliente correcto/);
  const id = (await convert(q)).id;
  assert.deepEqual(await reservation(id), { customer_id: customer, cliente_nombre: "Ana Pérez", cliente_apellido: "PRUEBA", total: 589 });
});

await check("the old four-argument call still works, and converting twice returns the same reservation", async () => {
  const q = await accepted({ customer: await newCustomer(), name: "Luis Romero" });
  const first = (await convert(q)).id;
  assert.equal((await convert(q, ", $3", ["Otro nombre"])).id, first);
});

await check("the holder name is required one way or another", async () => {
  const q = await accepted({ customer: null, name: " " });
  await assert.rejects(convert(q, ", $3, $4", [" ", await newCustomer()]), /nombre completo del titular/);
});

await check("admins only; the anonymous role cannot call either function", async () => {
  const q = await accepted();
  await assert.rejects(asUser(db, STAFF, () => db.query("select public.convert_accepted_quotation($1, $2, false, 'X', 'Y', null)", [q.quotation, q.version])), /No autorizado/);
  const acl = (await db.query("select proname, proacl::text from pg_proc where proname in ('convert_accepted_quotation','convert_quotation_with_passengers')")).rows;
  assert.ok(acl.length === 2 && acl.every(row => row.proacl.includes("authenticated=X") && !row.proacl.includes("anon=") && !/[{,]=X\//.test(row.proacl)), JSON.stringify(acl));
});

console.log(`\n${passed} checks passed`);
