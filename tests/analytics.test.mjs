import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

function analytics(consent = true) {
  const sent = [];
  const window = { location: { pathname: '/paquetes/punta-cana' }, viatourAnalytics: { consent, ga: true, meta: false }, gtag: (...args) => sent.push(args) };
  return { api: load('src/lib/analytics.ts', {}, { window }), sent };
}

test('quote_start fires once per form, with the service only', () => {
  const { api, sent } = analytics();
  const form = {}, other = {};
  api.trackQuoteStart(form, 'Paquete');
  api.trackQuoteStart(form, 'Paquete');
  api.trackQuoteStart(other, 'Vuelos');
  assert.equal(sent.length, 2);
  assert.deepEqual(sent.map(([, name, params]) => [name, params.service]), [['quote_start', 'package'], ['quote_start', 'vuelos']]);
  assert.deepEqual(Object.keys(sent[0][2]).sort(), ['page', 'placement', 'service', 'status']);
});

test('nothing is sent without consent', () => {
  const { api, sent } = analytics(false);
  api.trackQuoteStart({}, 'Vuelos');
  api.trackEvent('portal_verified', { placement: 'mi-reserva' });
  assert.equal(sent.length, 0);
});
