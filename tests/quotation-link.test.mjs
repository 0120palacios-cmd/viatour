import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { load } from './security-support.mjs';

// The customer link (/cotizacion/<token>) only opens the shared version while the share is open and valid.
const share = load('src/lib/quotation-share.ts', { 'server-only': {}, 'node:crypto': crypto, '@/lib/site-config': { siteConfig: { url: 'https://miviatour.com' } } }, { process: { env: {} } });

function fakeClient(tables) {
  const updates = [];
  const from = table => {
    const filters = []; let values = null;
    const rows = () => tables[table].filter(row => filters.every(([key, value]) => row[key] === value));
    const api = {
      select() { return api; }, eq(key, value) { filters.push([key, value]); return api; },
      update(next) { values = next; return api; },
      async maybeSingle() { return { data: rows()[0] ?? null, error: null }; },
      then(resolve, reject) { if (values) { rows().forEach(row => Object.assign(row, values)); updates.push({ table, values }); } return Promise.resolve({ data: null, error: null }).then(resolve, reject); },
    };
    return api;
  };
  return { from, updates };
}

function setup({ estado = 'confirmado', expira = Date.now() + 86400000, quotationState = 'enviada' } = {}) {
  const { token, hash } = share.newShareToken();
  const tables = {
    quotation_shares: [{ id: 's1', quotation_id: 'q1', version_id: 'v1', estado, expira_en: new Date(expira).toISOString(), aperturas: 0, token_hash: hash }],
    quotation_versions: [{ id: 'v1', quotation_id: 'q1', version: 2, snapshot: { quotation: { id: 'q1', codigo: 'COT-1', cliente_nombre: 'Ana', destino: 'Miami', moneda: 'USD', total: 600 }, items: [] } }],
    quotations: [{ id: 'q1', estado: quotationState }],
  };
  const client = fakeClient(tables);
  const link = load('src/lib/quotation-link.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => client }, '@/lib/quotation-share': share,
    '@/lib/quotation-data': { toRecord: (quotation, items) => ({ quotation, items, expiry: '2026-12-01T05:59:00Z' }) },
  });
  return { token, tables, client, link };
}

test('a valid link opens exactly the shared version and counts the page opening', async () => {
  const { token, tables, link } = setup();
  const opened = await link.openSharedQuotation(token, { countOpening: true });
  assert.equal(opened.state, 'ok');
  assert.equal(opened.versionNumber, 2);
  assert.equal(opened.record.quotation.codigo, 'COT-1');
  assert.equal(opened.replaced, false);
  assert.equal(tables.quotation_shares[0].aperturas, 1);
  await link.openSharedQuotation(token);
  assert.equal(tables.quotation_shares[0].aperturas, 1, 'the PDF download does not count as an opening');
});

test('malformed, unknown, cancelled and deactivated links show nothing', async () => {
  const { link } = setup();
  assert.equal((await link.openSharedQuotation('../../etc/passwd')).state, 'unavailable');
  assert.equal((await link.openSharedQuotation(share.newShareToken().token)).state, 'unavailable');
  for (const estado of ['cancelado', 'revocado', 'fallido']) {
    const other = setup({ estado });
    assert.equal((await other.link.openSharedQuotation(other.token, { countOpening: true })).state, 'unavailable');
    assert.equal(other.tables.quotation_shares[0].aperturas, 0);
  }
});

test('an expired link says so; a replaced quotation is flagged', async () => {
  const expired = setup({ expira: Date.now() - 1000 });
  assert.equal((await expired.link.openSharedQuotation(expired.token)).state, 'expired');
  const replaced = setup({ quotationState: 'reemplazada' });
  assert.equal((await replaced.link.openSharedQuotation(replaced.token)).replaced, true);
});
