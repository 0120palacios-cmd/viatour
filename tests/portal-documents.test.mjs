import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const FILE = '33333333-3333-4333-8333-333333333333';
const docs = load('src/lib/portal-documents.ts');
const summary = load('src/lib/portal-summary.ts');

test('document paths are accepted only inside the reservation folder layout', () => {
  assert.equal(docs.documentSource(R1, `${R1}/${FILE}.pdf`), 'customer');
  assert.equal(docs.documentSource(R1, `${R1}/cliente/${FILE}.jpg`), 'customer');
  assert.equal(docs.documentSource(R1, `${R1}/viatour/a1b2c3d4-Boletos-aereos.pdf`), 'agency');
  for (const path of [
    `${R2}/${FILE}.pdf`, // another reservation
    `${R1}/../${R2}/${FILE}.pdf`, // traversal
    `${R1}/viatour/../cliente/${FILE}.pdf`,
    `${R1}/notas.txt`, `${R1}/${FILE}.exe`, `${R1}/viatour/sin-prefijo.pdf`,
    `${R1}/otra/${FILE}.pdf`, `${R1}/cliente/x/${FILE}.pdf`, '', `/${R1}/${FILE}.pdf`,
  ]) assert.equal(docs.documentSource(R1, path), null, path);
  assert.equal(docs.documentSource('no-es-uuid', `no-es-uuid/${FILE}.pdf`), null);
});

test('agency file names stay readable and safe as storage keys', () => {
  assert.equal(docs.safeDocumentName('Pasaporte Señor López (1).PDF', 'pdf'), 'Pasaporte-Senor-Lopez-1.pdf');
  assert.equal(docs.safeDocumentName('../../etc/passwd', 'pdf'), 'etc-passwd.pdf');
  assert.equal(docs.safeDocumentName('¿¿??.jpg', 'jpg'), 'documento.jpg');
  const path = docs.agencyDocumentPath(R1, 'Voucher hotel Cancún.pdf', 'pdf', 'deadbeefcafe');
  assert.equal(path, `${R1}/viatour/deadbeef-Voucher-hotel-Cancun.pdf`);
  assert.equal(docs.documentSource(R1, path), 'agency');
  assert.equal(docs.documentDisplayName(path), 'Voucher hotel Cancun.pdf');
});

function route({ session = R1, signed = 'https://storage.example/signed?token=x', limitOk = true } = {}) {
  const calls = [];
  const storage = {
    createSignedUrl: async (path, seconds) => { calls.push(['sign', path, seconds]); return signed ? { data: { signedUrl: signed }, error: null } : { data: null, error: new Error('missing') }; },
    upload: async (path, _bytes, options) => { calls.push(['upload', path, options.contentType]); return { error: null }; },
  };
  const api = load('src/app/api/mi-reserva/documentos/route.ts', {
    'node:crypto': { createHash: () => ({ update: () => ({ digest: () => 'hash' }) }) },
    'next/headers': { cookies: async () => ({ get: () => (session ? { value: 'cookie' } : undefined) }) },
    '@/lib/supabase/admin': { createAdminClient: () => ({ storage: { from: bucket => { calls.push(['bucket', bucket]); return storage; } }, rpc: async () => ({ data: limitOk, error: null }) }) },
    '@/lib/portal': { portalCookieName: 'viatour-portal', verifyPortalCookie: value => (value ? session : null) },
    '@/lib/quotation-validation': { validUuid: value => /^[0-9a-f-]{36}$/i.test(value) },
    '@/lib/portal-documents': docs,
  });
  return { api, calls };
}

const open = path => new Request(`http://local/api/mi-reserva/documentos?ruta=${encodeURIComponent(path)}`);

test('opening a document checks the session and the path, then signs a short-lived URL', async () => {
  const signedOut = route({ session: null });
  assert.equal((await signedOut.api.GET(open(`${R1}/${FILE}.pdf`))).status, 401);
  assert.equal(signedOut.calls.length, 0);

  const other = route();
  assert.equal((await other.api.GET(open(`${R2}/${FILE}.pdf`))).status, 404);
  assert.equal(other.calls.some(call => call[0] === 'sign'), false, 'another reservation is never signed');

  const ok = route();
  const response = await ok.api.GET(open(`${R1}/viatour/a1b2c3d4-Boletos.pdf`));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://storage.example/signed?token=x');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(ok.calls.find(call => call[0] === 'sign'), ['sign', `${R1}/viatour/a1b2c3d4-Boletos.pdf`, 60]);
  assert.deepEqual(ok.calls.find(call => call[0] === 'bucket'), ['bucket', 'portal-docs']);

  assert.equal((await route({ signed: null }).api.GET(open(`${R1}/${FILE}.pdf`))).status, 404);
});

function upload(bytes, type = 'application/pdf') {
  const form = new FormData();
  form.set('documento', new File([bytes], 'pasaporte.pdf', { type }));
  return new Request('http://local/api/mi-reserva/documentos', { method: 'POST', body: form });
}

test('customer uploads go to the cliente folder and respect the daily limit', async () => {
  const pdf = Buffer.from('%PDF-1.7\n...');
  const ok = route();
  const saved = await ok.api.POST(upload(pdf));
  assert.equal(saved.status, 200);
  const stored = ok.calls.find(call => call[0] === 'upload');
  assert.match(stored[1], new RegExp(`^${R1}/cliente/[0-9a-f-]{36}\\.pdf$`));
  assert.equal(docs.documentSource(R1, stored[1]), 'customer');

  const limited = route({ limitOk: false });
  assert.equal((await limited.api.POST(upload(pdf))).status, 429);
  assert.equal(limited.calls.some(call => call[0] === 'upload'), false);

  const fake = route();
  assert.equal((await fake.api.POST(upload(Buffer.from('not a pdf')))).status, 400);
  assert.equal((await route({ session: null }).api.POST(upload(pdf))).status, 401);
});

test('listing keeps the documented layout, skips folders and strays, newest first', async () => {
  const files = {
    [R1]: [{ name: `${FILE}.pdf`, id: 'a', created_at: '2026-01-01T00:00:00Z' }, { name: 'viatour', id: null }, { name: 'cliente', id: null }, { name: 'otro.txt', id: 'z' }],
    [`${R1}/viatour`]: [{ name: 'a1b2c3d4-Itinerario.pdf', id: 'b', created_at: '2026-03-01T00:00:00Z' }],
    [`${R1}/cliente`]: [],
  };
  const listed = await docs.listReservationDocuments({ list: async folder => ({ data: files[folder] ?? [], error: null }) }, R1);
  assert.deepEqual(JSON.parse(JSON.stringify(listed.map(item => [item.source, item.name]))), [['agency', 'Itinerario.pdf'], ['customer', `${FILE}.pdf`]]);
});

test('portal summary: trip timing in Honduras days and one next step', () => {
  assert.equal(summary.hondurasToday(new Date('2026-10-01T03:00:00Z')), '2026-09-30');
  assert.deepEqual({ ...summary.tripTiming('2026-10-12', '2026-10-18', '2026-09-30') }, { kind: 'upcoming', days: 12 });
  assert.equal(summary.tripTiming('2026-09-30', null, '2026-09-30').kind, 'today');
  assert.equal(summary.tripTiming('2026-09-25', '2026-10-02', '2026-09-30').kind, 'ongoing');
  assert.deepEqual({ ...summary.tripTiming('2026-09-01', '2026-09-08', '2026-09-30') }, { kind: 'ended', date: '2026-09-08' });
  assert.equal(summary.tripTiming(null, null, '2026-09-30').kind, 'unknown');
  assert.equal(summary.nextStep({ status: 'cancelada', balance: 500, agencyDocuments: 0 }), 'cancelled');
  assert.equal(summary.nextStep({ status: 'confirmada', balance: 500, agencyDocuments: 2 }), 'balance');
  assert.equal(summary.nextStep({ status: 'pendiente', balance: 0, agencyDocuments: 0 }), 'pending');
  assert.equal(summary.nextStep({ status: 'confirmada', balance: 0, agencyDocuments: 0 }), 'documents');
  assert.equal(summary.nextStep({ status: 'confirmada', balance: 0, agencyDocuments: 1 }), 'ready');
});
