// Mi viaje access, end to end against a stateful in-memory database double: booking code + surname →
// OTP row (hash only) → email (captured, never sent) → verification → session cookie → sign-out.
// No Supabase, no Resend, no network. The real action code runs; only its I/O is replaced.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';

const reservationId = '11111111-1111-4111-8111-111111111111';
const secret = crypto.randomBytes(32).toString('hex');
const notice = 'Si los datos coinciden con una reserva, recibirá un código en el correo registrado.';

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, FormData, Headers, console, Date, process: { env: { PORTAL_SECRET: secret } }, require: name => dependencies[name] ?? {} });
  return exports;
}

// Supports the query shapes the actions use: select/eq/ilike/order/limit, insert, update, delete,
// single/maybeSingle and awaiting the builder itself. Rows are filtered for real.
function database() {
  const tables = {
    reservations: [{ id: reservationId, codigo: 'VT-QA0005IJ', cliente_apellido: 'Prueba Borjas', cliente_email: 'qa-traveler@example.invalid', customer_id: null }],
    customers: [],
    portal_otps: [],
  };
  let limited = false;
  function from(table) {
    const filters = [];
    let mode = 'select', payload = null;
    const rows = () => tables[table].filter(row => filters.every(test => test(row)));
    const run = () => {
      if (mode === 'insert') { const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...payload }; tables[table].push(row); return [row]; }
      if (mode === 'update') { const hit = rows(); hit.forEach(row => Object.assign(row, payload)); return hit; }
      if (mode === 'delete') { const hit = rows(); tables[table] = tables[table].filter(row => !hit.includes(row)); return hit; }
      return rows();
    };
    const q = {
      select() { return q; },
      eq(column, value) { filters.push(row => row[column] === value); return q; },
      ilike(column, value) { filters.push(row => String(row[column]).toLowerCase() === String(value).toLowerCase()); return q; },
      order() { return q; }, limit() { return q; },
      insert(value) { mode = 'insert'; payload = value; return q; },
      update(value) { mode = 'update'; payload = value; return q; },
      delete() { mode = 'delete'; return q; },
      single: async () => ({ data: run()[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then(resolve, reject) { return Promise.resolve({ data: run(), error: null }).then(resolve, reject); },
    };
    return q;
  }
  return { tables, setLimited: value => { limited = value; }, client: { from, rpc: async () => ({ data: !limited, error: null }) } };
}

function harness({ emailFails = false } = {}) {
  const db = database();
  const cookies = new Map(), paths = new Map();
  const cookieStore = { get: name => cookies.has(name) ? { value: cookies.get(name) } : undefined, set: ({ name, value, path }) => { cookies.set(name, value); paths.set(name, path); }, delete: name => cookies.delete(name) };
  const outbox = [];
  const portal = load('src/lib/portal.ts', { 'server-only': {}, 'node:crypto': crypto, '@/lib/quotation-validation': { validUuid: value => /^[0-9a-f-]{36}$/i.test(value) } });
  const actions = load('src/app/mi-reserva/actions.ts', {
    'next/headers': { headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.20' }), cookies: async () => cookieStore },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    '@/lib/supabase/admin': { createAdminClient: () => db.client },
    '@/lib/notifications': { sendResendEmail: async input => { if (emailFails) throw new Error('provider down'); outbox.push(input); } },
    '@/lib/portal': portal,
    '@/lib/site-config': { siteConfig: { portalOtpFrom: 'no-reply@miviatour.com', supportEmail: 'soporte@miviatour.com' } },
    'node:crypto': crypto,
  });
  const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
  const redirectOf = async promise => { try { await promise; return null; } catch (error) { return String(error.message).replace('REDIRECT:', ''); } };
  return { db, cookies, paths, outbox, portal, actions, form, redirectOf };
}

test('wrong surname, unknown code and rate limit all answer the same, with no OTP, email or cookie', async () => {
  const h = harness();
  for (const values of [{ codigo: 'VT-QA0005IJ', apellido: 'Otro' }, { codigo: 'VT-NOEXISTE', apellido: 'Prueba Borjas' }]) {
    assert.deepEqual({ ...(await h.actions.accessReservation({}, h.form(values))) }, { notice, step: 'otp' });
  }
  h.db.setLimited(true);
  assert.deepEqual({ ...(await h.actions.accessReservation({}, h.form({ codigo: 'VT-QA0005IJ', apellido: 'Prueba Borjas' }))) }, { notice, step: 'otp' });
  assert.equal(h.db.tables.portal_otps.length, 0);
  assert.equal(h.outbox.length, 0);
  assert.equal(h.cookies.size, 0);
});

test('full lifecycle: one hashed OTP, email to the registered address, session on success, replay refused, sign-out clears', async () => {
  const h = harness();
  const request = () => h.actions.accessReservation({}, h.form({ codigo: 'VT-QA0005IJ', apellido: 'prueba borjas' }));
  assert.deepEqual({ ...(await request()) }, { notice, step: 'otp' });
  await request(); // a second request replaces the first code
  assert.equal(h.db.tables.portal_otps.length, 1, 'only the latest OTP survives');
  const row = h.db.tables.portal_otps[0];
  const otp = h.outbox.at(-1).text.match(/\b\d{6}\b/)[0];
  assert.notEqual(row.code_hash, otp, 'the code is stored as a hash');
  assert.ok(!JSON.stringify(row).includes(otp));
  const minutes = (Date.parse(row.expires_at) - Date.now()) / 60000;
  assert.ok(minutes > 9 && minutes <= 10, `expires in about 10 minutes (${minutes})`);
  assert.deepEqual([...h.outbox.at(-1).to], ['qa-traveler@example.invalid']);
  assert.doesNotMatch(h.outbox.at(-1).text, /VT-QA0005IJ|Prueba Borjas/, 'the email carries the code only');
  assert.equal(h.cookies.has('viatour-portal'), false, 'no session before the code is verified');
  assert.ok(h.cookies.has('viatour-portal-pending'));
  assert.equal(h.paths.get('viatour-portal-pending'), '/', 'the code step also works on /en/mi-reserva');

  // The earlier code was replaced: it no longer opens the session.
  const firstOtp = h.outbox[0].text.match(/\b\d{6}\b/)[0];
  if (firstOtp !== otp) assert.equal((await h.actions.verifyPortalOtp({}, h.form({ otp: firstOtp }))).step, 'otp');

  assert.equal(await h.redirectOf(h.actions.verifyPortalOtp({}, h.form({ otp }))), '/mi-reserva');
  assert.equal(h.portal.verifyPortalCookie(h.cookies.get('viatour-portal')), reservationId, 'session cookie opens this reservation');
  assert.equal(h.paths.get('viatour-portal'), '/', 'the session reaches /api/mi-reserva and every Mi viaje page');
  assert.equal(h.cookies.has('viatour-portal-pending'), false);
  assert.equal(h.db.tables.portal_otps.length, 0, 'the code is consumed');

  // Replaying the same code (for example from another tab) cannot open a second session.
  h.cookies.set('viatour-portal-pending', h.portal.signPortalPendingReservationId(reservationId));
  h.cookies.delete('viatour-portal');
  assert.equal((await h.actions.verifyPortalOtp({}, h.form({ otp }))).step, 'otp');
  assert.equal(h.cookies.has('viatour-portal'), false);

  h.cookies.set('viatour-portal', h.portal.signPortalReservationId(reservationId));
  assert.equal(await h.redirectOf(h.actions.signOutReservation()), '/mi-reserva');
  assert.equal(h.cookies.has('viatour-portal'), false);
  assert.equal(h.cookies.has('viatour-portal-pending'), false);
});

test('an expired code is refused with the generic message', async () => {
  const h = harness();
  await h.actions.accessReservation({}, h.form({ codigo: 'VT-QA0005IJ', apellido: 'Prueba Borjas' }));
  const otp = h.outbox[0].text.match(/\b\d{6}\b/)[0];
  h.db.tables.portal_otps[0].expires_at = new Date(Date.now() - 1000).toISOString();
  const result = await h.actions.verifyPortalOtp({}, h.form({ otp }));
  assert.equal(result.step, 'otp');
  assert.match(result.error, /^No se pudo verificar el código/);
  assert.equal(h.cookies.has('viatour-portal'), false);
});

test('when the email provider fails, the unused code is removed and no pending session is left', async () => {
  const h = harness({ emailFails: true });
  const result = await h.actions.accessReservation({}, h.form({ codigo: 'VT-QA0005IJ', apellido: 'Prueba Borjas' }));
  assert.equal(result.step, 'otp');
  assert.match(result.error, /No se pudo procesar/);
  assert.equal(h.db.tables.portal_otps.length, 0);
  assert.equal(h.cookies.has('viatour-portal-pending'), false);
});
