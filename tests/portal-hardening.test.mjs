import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';

const reservationId = '11111111-1111-4111-8111-111111111111';
const testSecret = process.env.PORTAL_SECRET || crypto.randomBytes(32).toString('hex');

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports,
    Buffer,
    FormData,
    Headers,
    console,
    process: { env: { PORTAL_SECRET: testSecret } },
    require: name => dependencies[name] ?? {},
  });
  return exports;
}

test('mock reservation requires OTP, uses generic errors, and locks after five attempts', async () => {
  const portal = load('src/lib/portal.ts', {
    'server-only': {},
    'node:crypto': crypto,
    '@/lib/quotation-validation': { validUuid: value => /^[0-9a-f-]{36}$/i.test(value) },
  });
  const cookieValues = new Map();
  const cookieStore = { get: name => cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined, set: ({ name, value }) => cookieValues.set(name, value), delete: name => cookieValues.delete(name) };
  let reservation = { id: reservationId, cliente_email: 'registered@example.invalid', customer_id: null };
  let currentRow = null;
  let attempts = 0;
  let sentText = '';
  function query(table, initial) {
    const state = { result: initial, mode: '' };
    const q = {
      select() { return q; },
      eq() { return q; },
      ilike() { return q; },
      order() { return q; },
      limit() { return q; },
      delete() { state.mode = 'delete'; return q; },
      update(value) { attempts = value.attempts; state.mode = 'update'; return q; },
      insert(value) { currentRow = { id: '22222222-2222-4222-8222-222222222222', reservation_id: value.reservation_id, code_hash: value.code_hash, expires_at: value.expires_at, attempts: 0 }; state.mode = 'insert'; return q; },
      single: async () => state.mode === 'insert' ? { data: { id: currentRow.id }, error: null } : { data: currentRow, error: null },
      maybeSingle: async () => {
        if (table === 'reservations') return { data: reservation, error: null };
        if (table === 'portal_otps' && state.mode === 'delete') return { data: { id: currentRow.id }, error: null };
        return { data: { ...currentRow, attempts }, error: null };
      },
      then(resolve, reject) { return Promise.resolve({ data: null, error: null }).then(resolve, reject); },
    };
    return q;
  }
  const client = {
    rpc: async () => ({ data: true, error: null }),
    from: table => table === 'reservations' ? query(table, reservation) : query(table, null),
  };
  const actions = load('src/app/mi-reserva/actions.ts', {
    'next/headers': { headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.10' }), cookies: async () => cookieStore },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    '@/lib/supabase/admin': { createAdminClient: () => client },
    '@/lib/notifications': { sendResendEmail: async input => { sentText = input.text; } },
    '@/lib/portal': portal,
    '@/lib/site-config': { siteConfig: { portalOtpFrom: 'no-reply@miviatour.com', supportEmail: 'soporte@miviatour.com' } },
    'node:crypto': crypto,
  });
  const first = new FormData(); first.set('codigo', 'V-123'); first.set('apellido', 'Pérez');
  const stepOne = await actions.accessReservation({}, first);
  assert.equal(stepOne.step, 'otp');
  assert.equal(cookieValues.has('viatour-portal'), false, 'step 1 must not issue the session cookie');
  assert.equal(cookieValues.has('viatour-portal-pending'), true);
  const otp = sentText.match(/\b\d{6}\b/)?.[0];
  assert.match(otp ?? '', /^\d{6}$/);

  for (let i = 0; i < 5; i++) {
    const wrong = new FormData(); wrong.set('otp', '000000');
    const result = await actions.verifyPortalOtp({}, wrong);
    assert.equal(result.error, 'No se pudo verificar el código. Revise la información e inténtelo nuevamente.');
  }
  assert.equal(attempts, 5);
  const locked = new FormData(); locked.set('otp', otp);
  const lockedResult = await actions.verifyPortalOtp({}, locked);
  assert.equal(lockedResult.error, 'No se pudo verificar el código. Revise la información e inténtelo nuevamente.');
  assert.equal(cookieValues.has('viatour-portal'), false);

  attempts = 0;
  currentRow.code_hash = portal.hashPortalOtp(reservationId, otp);
  let redirected = false;
  try { await actions.verifyPortalOtp({}, locked); } catch (error) { redirected = String(error.message).includes('REDIRECT:/mi-reserva'); }
  assert.equal(redirected, true);
  assert.equal(portal.verifyPortalCookie(cookieValues.get('viatour-portal')), reservationId);

  reservation = null;
  cookieValues.delete('viatour-portal'); cookieValues.delete('viatour-portal-pending');
  const invalid = await actions.accessReservation({}, first);
  assert.equal(invalid.step, 'otp');
  assert.equal(invalid.error, undefined, 'invalid step 1 must not reveal reservation existence');
});

test('private portal documents and ticket notifications have no public-storage path', () => {
  const documentsRoute = fs.readFileSync('src/app/api/mi-reserva/documentos/route.ts', 'utf8');
  const portalData = fs.readFileSync('src/lib/portal-data.ts', 'utf8');
  const ticketsRoute = fs.readFileSync('src/app/api/mi-reserva/tickets/route.ts', 'utf8');
  assert.match(documentsRoute, /from\("portal-docs"\)/);
  assert.doesNotMatch(documentsRoute, /getPublicUrl|object\/public/);
  assert.match(portalData, /createSignedUrl\(path, 300\)/);
  assert.match(ticketsRoute, /sendResendEmail/);
  assert.match(ticketsRoute, /support-ticket\//);
});
