import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
import { details as detailsModule, money, types } from './pdf-support.mjs';
import { samples } from './fixtures/quotation-samples.mjs';

const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
const payloadModule = load('src/lib/quotation-payload.ts', { '@/lib/quotation-details': detailsModule, '@/lib/quotation-types': types, '@/lib/quotation-validation': validation });
const data = load('src/lib/quotation-data.ts', { 'server-only': {}, '@/lib/quotation-details': detailsModule });
const pdfStub = { renderQuotationPdf: async (_record, options) => Buffer.from(`%PDF-stub ${JSON.stringify(options ?? {})}`), quotationPdfFilename: (_record, version) => `cotizacion-COT-1${version ? `-v${version}` : ''}.pdf` };
const media = { loadQuotationPhotos: async () => new Map() };
const empty = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) };

function preview(requireAdmin) {
  return load('src/app/api/admin/cotizaciones/preview/route.ts', { '@/lib/admin': { requireAdmin }, '@/lib/quotation-data': data, '@/lib/quotation-pdf': pdfStub, '@/lib/quotation-media': media, '@/lib/quotation-payload': payloadModule, '@/lib/money': money }, { Buffer });
}
function pdfRoute(requireAdmin, overrides = {}) {
  return load('src/app/api/admin/cotizaciones/[id]/pdf/route.ts', { '@/lib/admin': { requireAdmin }, '@/lib/quotation-data': { ...data, ...overrides }, '@/lib/quotation-pdf': pdfStub, '@/lib/quotation-media': media, '@/lib/quotation-validation': validation }, { Buffer });
}
const body = () => JSON.stringify({ cliente: { nombre: 'Ana', email: '' }, tipo: 'vuelo', moneda: 'USD', detalles: samples['vuelo-directo-ida-y-vuelta']().details, items: [] });

test('the preview route requires an administrator', async () => {
  const route = preview(async () => { throw new Error('denied'); });
  await assert.rejects(route.POST(new Request('http://local/api/admin/cotizaciones/preview', { method: 'POST', body: body() })), /denied/);
});

test('the preview renders a draft PDF marked as preview without writing anything', async () => {
  const route = preview(async () => ({ client: empty, user: { id: 'agent' } }));
  const response = await route.POST(new Request('http://local/api/admin/cotizaciones/preview', { method: 'POST', body: body() }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(Buffer.from(await response.arrayBuffer()).toString(), /"preview":true/);
});

test('the preview rejects oversized and invalid drafts', async () => {
  const route = preview(async () => ({ client: empty, user: { id: 'agent' } }));
  const large = await route.POST(new Request('http://local/x', { method: 'POST', body: 'x'.repeat(payloadModule.maxPayloadBytes + 10) }));
  assert.equal(large.status, 413);
  const invalid = await route.POST(new Request('http://local/x', { method: 'POST', body: JSON.stringify({ cliente: { nombre: '' }, moneda: 'USD' }) }));
  assert.equal(invalid.status, 400);
});

test('the PDF route validates the id and version and serves issued versions from their snapshot', async () => {
  let asked = null;
  const route = pdfRoute(async () => ({ client: empty }), { getQuotationVersion: async (_client, id, version) => { asked = { id, version }; return samples['vuelo-directo-ida-y-vuelta'](); } });
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal((await route.GET(new Request('http://local/x'), { params: Promise.resolve({ id: '../../etc' }) })).status, 400);
  assert.equal((await route.GET(new Request(`http://local/x?version=abc`), { params: Promise.resolve({ id }) })).status, 400);
  const response = await route.GET(new Request(`http://local/x?version=2&inline=1`), { params: Promise.resolve({ id }) });
  assert.deepEqual(asked, { id, version: 2 });
  assert.match(response.headers.get('content-disposition'), /^inline; filename="cotizacion-COT-1-v2\.pdf"$/);
  assert.match(Buffer.from(await response.arrayBuffer()).toString(), /"versionNumber":2/);
});

test('the PDF route requires an administrator', async () => {
  const route = pdfRoute(async () => { throw new Error('denied'); });
  await assert.rejects(route.GET(new Request('http://local/x'), { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) }), /denied/);
});
