// docs/sql/quotation_shares.sql on the production schema snapshot (PGlite, no network, no real data).
// Run: node scripts/test-quotation-shares-sql.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { ADMIN, STAFF, asUser, baselineDb, snapshotAt } from "./baseline-db.mjs";

// Applied to production on 2026-10-23: rehearsed on the snapshot from before it (commit 4fd4510).
const db = await baselineDb({ snapshot: snapshotAt("4fd4510") });
const migration = fs.readFileSync(new URL("../docs/sql/quotation_shares.sql", import.meta.url), "utf8");
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const admin = (sql, params) => asUser(db, ADMIN, () => db.query(sql, params));
const hash = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`ok - ${name}`); };

async function draftWithVersion() {
  const id = (await one("insert into public.quotations (codigo, cliente_nombre, moneda, total, estado) values ('COT-' || substr(md5(random()::text), 1, 8), 'Cliente Prueba', 'USD', 100, 'borrador') returning id")).id;
  const version = (await one("insert into public.quotation_versions (quotation_id, version, snapshot, emitida_por) values ($1, 1, '{\"canal\":\"whatsapp\"}', $2) returning id", [id, ADMIN])).id;
  return { id, version };
}
const share = async (q, extra = {}) => (await asUser(db, ADMIN, () => one("insert into public.quotation_shares (quotation_id, version_id, canal, telefono, mensaje, token_hash, expira_en) values ($1, $2, 'whatsapp_manual', $3, 'Buen día', $4, $5) returning id", [q.id, q.version, extra.telefono ?? "+50499999999", extra.hash ?? hash(), extra.expira ?? new Date(Date.now() + 86400000).toISOString()]))).id;

await check("applies, and applies again", async () => {
  await db.exec(migration);
  await db.exec(migration);
});

await check("admins prepare shares; others and the anonymous role cannot read or write them", async () => {
  const q = await draftWithVersion();
  await share(q);
  await assert.rejects(asUser(db, STAFF, () => db.query("insert into public.quotation_shares (quotation_id, version_id, canal, token_hash, expira_en) values ($1, $2, 'whatsapp_manual', $3, now() + interval '1 day')", [q.id, q.version, hash()])), /row-level security/);
  assert.equal((await asUser(db, STAFF, () => db.query("select * from public.quotation_shares"))).rows.length, 0);
  await assert.rejects(asUser(db, null, () => db.query("select * from public.quotation_shares")), /permission denied/);
  await assert.rejects(admin("delete from public.quotation_shares"), /permission denied/);
});

await check("only valid phones, hashes, channels and expiries are stored", async () => {
  const q = await draftWithVersion();
  await assert.rejects(share(q, { telefono: "9999-9999" }), /check constraint/);
  await assert.rejects(share(q, { hash: "token-en-claro" }), /check constraint/);
  await assert.rejects(share(q, { expira: new Date(Date.now() + 120 * 86400000).toISOString() }), /check constraint/);
  const taken = hash();
  await share(q, { hash: taken });
  await assert.rejects(share(q, { hash: taken }), /duplicate key/);
});

await check("confirming marks the version as sent, once; repeating changes nothing", async () => {
  const q = await draftWithVersion();
  const id = await share(q);
  assert.equal((await admin("select public.confirm_quotation_share($1) as v", [id])).rows[0].v, q.version);
  assert.equal((await admin("select public.confirm_quotation_share($1) as v", [id])).rows[0].v, q.version);
  assert.deepEqual(await one("select estado, sent_version_id from public.quotations where id = $1", [q.id]), { estado: "enviada", sent_version_id: q.version });
  const row = await one("select estado, confirmado_por from public.quotation_shares where id = $1", [id]);
  assert.deepEqual(row, { estado: "confirmado", confirmado_por: ADMIN });
});

await check("a cancelled or expired share cannot be confirmed; an accepted quotation is not re-sent", async () => {
  const q = await draftWithVersion();
  const cancelled = await share(q);
  await admin("update public.quotation_shares set estado = 'cancelado', cerrado_en = now() where id = $1", [cancelled]);
  await assert.rejects(admin("select public.confirm_quotation_share($1)", [cancelled]), /ya no está pendiente/);
  const expiring = await share(q);
  await db.query("alter table public.quotation_shares disable trigger quotation_shares_guard");
  await db.query("update public.quotation_shares set created_at = now() - interval '3 days', expira_en = now() - interval '1 day' where id = $1", [expiring]);
  await db.query("alter table public.quotation_shares enable trigger quotation_shares_guard");
  await assert.rejects(admin("select public.confirm_quotation_share($1)", [expiring]), /ya venció/);
  await db.query("update public.quotations set estado = 'rechazada' where id = $1", [q.id]);
  await assert.rejects(admin("select public.confirm_quotation_share($1)", [await share(q)]), /ya no se registra como enviada/);
});

await check("what was shared is immutable and statuses only move forward", async () => {
  const q = await draftWithVersion();
  const id = await share(q);
  await assert.rejects(admin("update public.quotation_shares set telefono = '+50488888888' where id = $1", [id]), /no se puede modificar/);
  await assert.rejects(admin("update public.quotation_shares set estado = 'revocado' where id = $1", [id]), /no permitido/);
  await admin("select public.confirm_quotation_share($1)", [id]);
  await assert.rejects(admin("update public.quotation_shares set estado = 'preparado' where id = $1", [id]), /no permitido/);
  await admin("update public.quotation_shares set estado = 'revocado', cerrado_en = now() where id = $1", [id]);
  await assert.rejects(admin("update public.quotation_shares set aperturas = -1 where id = $1", [id]), /check constraint|Contador/);
});

await check("the activity log records each step without phone, message or token", async () => {
  const q = await draftWithVersion();
  const id = await share(q);
  await admin("select public.confirm_quotation_share($1)", [id]);
  const log = (await db.query("select action, details::text from public.admin_audit_log where entity_id = $1 order by id", [q.id])).rows;
  assert.deepEqual(log.filter(row => row.action.startsWith("quotation.share")).map(row => row.action), ["quotation.share_prepared", "quotation.share_confirmado"]);
  assert.ok(log.every(row => !row.details.includes("+504") && !row.details.includes("Buen día")), JSON.stringify(log));
});

await check("the service role finds a share by its hash and can only count openings", async () => {
  const q = await draftWithVersion();
  const token = hash();
  const id = await share(q, { hash: token });
  await db.exec("set role service_role");
  try {
    await db.query("update public.quotation_shares set aperturas = aperturas + 1, abierto_en = now() where token_hash = $1", [token]);
    await assert.rejects(db.query("update public.quotation_shares set mensaje = 'x' where token_hash = $1", [token]), /no se puede modificar/);
    await assert.rejects(db.query("insert into public.quotation_shares (quotation_id, version_id, canal, token_hash, expira_en) values ($1, $2, 'correo', $3, now() + interval '1 day')", [q.id, q.version, hash()]), /permission denied/);
  } finally { await db.exec("reset role"); }
  assert.equal((await one("select aperturas from public.quotation_shares where id = $1", [id])).aperturas, 1);
});

console.log(`\n${passed} checks passed`);
