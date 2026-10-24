// docs/sql/passenger_profiles.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-passenger-profiles-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ADMIN, STAFF, asUser, baselineDb, snapshotAt } from "./baseline-db.mjs";

// Applied to production on 2026-10-23: rehearsed on the snapshot from before it (commit 4fd4510).
const db = await baselineDb({ snapshot: snapshotAt("4fd4510") });
// Storage as in Supabase: row level security on objects, API roles allowed to try.
await db.exec("alter table storage.objects enable row level security; grant select, insert, delete on storage.objects to authenticated, anon; grant select on storage.buckets to authenticated, anon;");
const migration = fs.readFileSync(new URL("../docs/sql/passenger_profiles.sql", import.meta.url), "utf8");
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const admin = (sql, params) => asUser(db, ADMIN, () => db.query(sql, params));
const hex = () => randomUUID().replaceAll("-", "");
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

const customer = (await one("insert into public.customers (nombre, telefono) values ('Cliente Prueba', '+50499999999') returning id")).id;
const profile = async (extra = {}) => (await admin("insert into public.passenger_profiles (customer_id, nombre, apellidos, documento_final, privado, vence_documento) values ($1, 'Ana', 'Pérez', $2, $3, '2030-01-01') returning id", [extra.customer ?? customer, extra.final ?? "1234", extra.privado ?? "v1.aaa.bbb.ccc"])).rows[0].id;

await check("applies, and applies again", async () => {
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual(await one("select public, file_size_limit::int, allowed_mime_types from storage.buckets where id = 'passenger-docs'"), { public: false, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg"] });
});

await check("admins manage profiles; others and the anonymous role see nothing", async () => {
  const id = await profile();
  await admin("update public.passenger_profiles set nacionalidad = 'Hondureña' where id = $1", [id]);
  assert.equal((await asUser(db, STAFF, () => db.query("select * from public.passenger_profiles"))).rows.length, 0);
  await assert.rejects(asUser(db, STAFF, () => db.query("insert into public.passenger_profiles (customer_id, nombre, apellidos) values ($1, 'X', 'Y')", [customer])), /row-level security/);
  await assert.rejects(asUser(db, null, () => db.query("select * from public.passenger_profiles")), /permission denied/);
});

await check("only encrypted private data, masked numbers and well-formed image paths are stored", async () => {
  await assert.rejects(profile({ privado: '{"documento":"A1234567"}' }), /check constraint/);
  await assert.rejects(profile({ final: "A1234567" }), /check constraint/);
  const id = await profile();
  await assert.rejects(admin("update public.passenger_profiles set foto_path = 'otra/foto.png' where id = $1", [id]), /check constraint/);
  await assert.rejects(admin("update public.passenger_profiles set pasaporte_path = $2 where id = $1", [id, `${id}/pasaporte-${hex()}.jpg`]), /check constraint/, "a passport image needs its deletion date");
  await admin("update public.passenger_profiles set pasaporte_path = $2, pasaporte_borrar_despues = current_date + 30 where id = $1", [id, `${id}/pasaporte-${hex()}.jpg`]);
});

await check("a customer with passenger profiles cannot be deleted by accident", async () => {
  const other = (await one("insert into public.customers (nombre, telefono) values ('Otro', '+50499990000') returning id")).id;
  await profile({ customer: other });
  await assert.rejects(db.query("delete from public.customers where id = $1", [other]), /foreign key/);
});

await check("the activity log records changes by field name, never their values", async () => {
  const id = await profile();
  await admin("update public.passenger_profiles set nacionalidad = 'Hondureña', privado = 'v1.x.y.z' where id = $1", [id]);
  await admin("update public.passenger_profiles set pasaporte_path = $2, pasaporte_borrar_despues = current_date where id = $1", [id, `${id}/pasaporte-${hex()}.jpg`]);
  await admin("update public.passenger_profiles set pasaporte_path = null where id = $1", [id]);
  await admin("delete from public.passenger_profiles where id = $1", [id]);
  const log = (await db.query("select action, details::text from public.admin_audit_log where entity_id = $1 order by id", [id])).rows;
  assert.deepEqual(log.map(row => row.action), ["passenger.created", "passenger.updated", "passenger.updated", "passenger.passport_image_removed", "passenger.deleted"]);
  assert.match(log[1].details, /"nacionalidad", "privado"/);
  assert.ok(log.every(row => !/Hondureña|v1\.x|Pérez|pasaporte-/.test(row.details)), JSON.stringify(log));
});

await check("images upload only into an existing profile's folder, with the expected names", async () => {
  const id = await profile();
  const put = (name, uid = ADMIN) => asUser(db, uid, () => db.query("insert into storage.objects (bucket_id, name) values ('passenger-docs', $1)", [name]));
  await put(`${id}/foto-${hex()}.jpg`);
  await put(`${id}/pasaporte-${hex()}.jpg`);
  await assert.rejects(put(`${id}/scan.pdf`), /row-level security/);
  await assert.rejects(put(`${randomUUID()}/foto-${hex()}.jpg`), /row-level security/, "no folder without a profile");
  await assert.rejects(put(`${id}/foto-${hex()}.jpg`, STAFF), /row-level security/);
  await assert.rejects(put(`${id}/foto-${hex()}.jpg`, null), /row-level security/);
  assert.equal((await asUser(db, null, () => db.query("select * from storage.objects where bucket_id = 'passenger-docs'"))).rows.length, 0);
});

await check("the service role can find expired passport images and clear them, nothing else", async () => {
  const id = await profile();
  await admin("update public.passenger_profiles set pasaporte_path = $2, pasaporte_borrar_despues = current_date - 1 where id = $1", [id, `${id}/pasaporte-${hex()}.jpg`]);
  await db.exec("set role service_role");
  try {
    assert.ok((await db.query("select id from public.passenger_profiles where pasaporte_borrar_despues < current_date and pasaporte_path is not null")).rows.some(row => row.id === id));
    await db.query("update public.passenger_profiles set pasaporte_path = null, pasaporte_borrar_despues = null where id = $1", [id]);
    await assert.rejects(db.query("delete from public.passenger_profiles where id = $1", [id]), /permission denied/);
    await assert.rejects(db.query("insert into public.passenger_profiles (customer_id, nombre, apellidos) values ($1, 'X', 'Y')", [customer]), /permission denied/);
  } finally { await db.exec("reset role"); }
});

console.log(`\n${passed} checks passed`);
