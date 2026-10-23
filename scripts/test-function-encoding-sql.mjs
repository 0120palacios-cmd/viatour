// docs/sql/fix_function_encoding.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-function-encoding-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, asUser, baselineDb, snapshotAt } from "./baseline-db.mjs";

// Applied to production on 2026-10-23: rehearsed on the snapshot from before it (commit fb8a56f).
const db = await baselineDb({ snapshot: snapshotAt("fb8a56f") });
const migration = fs.readFileSync(new URL("../docs/sql/fix_function_encoding.sql", import.meta.url), "utf8");
const garbled = /[Â-ß][\u0080-¿]/;
const decode = text => text.replace(/[Â-ß][\u0080-¿]/g, match => Buffer.from(match, "latin1").toString("utf8"));
const bodies = async () => Object.fromEntries((await db.query("select p.proname, p.prosrc, p.proconfig, p.prosecdef, pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'")).rows.map(row => [`${row.proname}(${row.args})`, row]));
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

const before = await bodies();
await check("the snapshot reproduces the production defect", async () => {
  assert.equal(Object.values(before).filter(fn => garbled.test(fn.prosrc)).length, 5);
});

await check("applies, and applies again", async () => {
  await db.exec(migration);
  await db.exec(migration);
});

const after = await bodies();
await check("no function keeps double-encoded text", async () => {
  assert.deepEqual(Object.keys(after).filter(key => garbled.test(after[key].prosrc)), []);
});

await check("logic, settings and security are unchanged; only the text is decoded", async () => {
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
  for (const key of Object.keys(before)) {
    // Production bodies carry CRLF line breaks that git normalises in the committed snapshot.
    assert.equal(after[key].prosrc.replace(/\r\n/g, "\n"), decode(before[key].prosrc).replace(/\r\n/g, "\n"), key);
    assert.deepEqual(after[key].proconfig, before[key].proconfig, key);
    assert.equal(after[key].prosecdef, before[key].prosecdef, key);
  }
});

await check("execute privileges are unchanged", async () => {
  const acl = (await db.query("select proname, proacl::text from pg_proc where proname in ('accept_quotation','convert_accepted_quotation','save_reservation_record') order by 1")).rows;
  assert.ok(acl.every(row => !String(row.proacl ?? "").includes("anon=X")), JSON.stringify(acl));
});

await check("the admin now reads correct Spanish", async () => {
  const quotation = (await asUser(db, ADMIN, () => db.query("insert into public.quotations (codigo, cliente_nombre, destino, moneda, total, estado) values ('COT-PRUEBA', 'Cliente Prueba', 'Miami', 'USD', 0, 'borrador') returning id"))).rows[0].id;
  await assert.rejects(asUser(db, ADMIN, () => db.query("select public.accept_quotation($1, $1, null)", [quotation])), error => error.message === "Solo puede aceptar una cotización enviada.");
});

console.log(`\n${passed} checks passed`);
