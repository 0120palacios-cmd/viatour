// docs/sql/conversion_without_email.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-conversion-without-email-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, STAFF, asUser, baselineDb } from "./baseline-db.mjs";

const db = await baselineDb();
const migration = fs.readFileSync(new URL("../docs/sql/conversion_without_email.sql", import.meta.url), "utf8");
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

// An accepted quotation with its frozen version, as accept_quotation leaves it.
async function acceptedQuotation(email) {
  const customer = (await one("insert into public.customers (nombre, email, telefono) values ('Cliente Prueba', $1, '+50499999999') returning id", [email || null])).id;
  const quotation = (await one("insert into public.quotations (codigo, customer_id, cliente_nombre, cliente_email, cliente_telefono, destino, moneda, total, estado) values ('COT-' || substr(md5(random()::text), 1, 8), $1, 'Cliente Prueba', $2, '+50499999999', 'Miami', 'USD', 100, 'borrador') returning id", [customer, email])).id;
  const snapshot = { quotation: { customer_id: customer, cliente_nombre: "Cliente Prueba", cliente_email: email, cliente_telefono: "+50499999999", destino: "Miami", moneda: "USD", total: 100, detalles: { fechaSalida: "2026-12-01", fechaRegreso: "2026-12-05" } }, items: [{ descripcion: "Tarifa aérea", tipo: "Tarifa aérea", cantidad: 1, precio_unitario: 100 }], canal: "whatsapp" };
  const version = (await one("insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, $2, $3) returning id", [quotation, snapshot, ADMIN])).id;
  await db.query("update public.quotations set estado = 'aceptada', version_aceptada = 1, accepted_version_id = $2 where id = $1", [quotation, version]);
  return { quotation, version };
}
const convert = ({ quotation, version }, user = ADMIN) => asUser(db, user, () => one("select public.convert_accepted_quotation($1, $2, false, 'PRUEBA') as id", [quotation, version]));

await check("before the change, a customer without e-mail cannot be converted", async () => {
  await assert.rejects(convert(await acceptedQuotation("")), /correo del cliente/);
});

await check("applies, and applies again", async () => {
  await db.exec(migration);
  await db.exec(migration);
});

await check("without e-mail: the reservation is created with the e-mail empty (NULL)", async () => {
  const id = (await convert(await acceptedQuotation(""))).id;
  const reservation = await one("select cliente_email, cliente_apellido, total, estado from public.reservations where id = $1", [id]);
  assert.equal(reservation.cliente_email, null);
  assert.equal(reservation.cliente_apellido, "PRUEBA");
  assert.equal(Number(reservation.total), 100);
});

await check("an invalid e-mail is still rejected", async () => {
  await assert.rejects(convert(await acceptedQuotation("no-es-un-correo")), /correo del cliente/);
});

await check("a valid e-mail still converts and is kept", async () => {
  const id = (await convert(await acceptedQuotation("cliente@example.test"))).id;
  assert.equal((await one("select cliente_email from public.reservations where id = $1", [id])).cliente_email, "cliente@example.test");
});

await check("still one reservation per quotation, and still admins only", async () => {
  const accepted = await acceptedQuotation("");
  const first = (await convert(accepted)).id;
  assert.equal((await convert(accepted)).id, first);
  await assert.rejects(convert(await acceptedQuotation(""), STAFF), /No autorizado/);
});

await check("the access e-mail can be added once, never changed or removed", async () => {
  const id = (await convert(await acceptedQuotation(""))).id;
  const update = email => asUser(db, ADMIN, () => db.query("update public.reservations set cliente_email = $2 where id = $1", [id, email]));
  await assert.rejects(update("no-es-un-correo"), /correo de acceso/);
  await update("cliente@example.test");
  await assert.rejects(update("otra@example.test"), /bloqueados/);
  await assert.rejects(update(null), /bloqueados/);
});

await check("other accepted commercial data stays locked", async () => {
  const id = (await convert(await acceptedQuotation(""))).id;
  await assert.rejects(asUser(db, ADMIN, () => db.query("update public.reservations set total = 1 where id = $1", [id])), /bloqueados/);
});

console.log(`\n${passed} checks passed`);
