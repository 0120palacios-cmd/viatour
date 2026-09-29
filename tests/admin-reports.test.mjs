import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

const leadAdmin = load('src/lib/lead-admin.ts');
const reports = load('src/lib/admin-reports.ts', { '@/lib/lead-admin': leadAdmin });
const now = Date.parse('2026-09-29T12:00:00Z');
const ago = days => new Date(now - days * 86400000).toISOString();

test('lead summary counts windows, services, sources (column or payload) and outcomes', () => {
  const rows = [
    { servicio: 'Paquete', estado: 'nuevo', created_at: ago(1), origen_web: { utm_source: 'facebook' } },
    { servicio: 'Paquete', estado: 'ganado', created_at: ago(10), payload: { origen: { referrer: 'www.google.com' } } },
    { servicio: 'Vuelos', estado: 'perdido', created_at: ago(20) },
    { servicio: 'Vuelos', estado: 'nuevo', created_at: ago(40) },
  ];
  const summary = reports.summarizeLeads(rows, now);
  assert.equal(summary.last7, 1); assert.equal(summary.last30, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(summary.byService)), [['Paquete', 2], ['Vuelos', 1]]);
  assert.deepEqual(JSON.parse(JSON.stringify(summary.bySource.map(([k]) => k).sort())), ['Directo o sin datos', 'facebook', 'www.google.com']);
  assert.equal(summary.won, 1); assert.equal(summary.lost, 1); assert.equal(summary.pending, 1);
});

test('quotation funnel measures acceptance among quotations that reached the customer', () => {
  const funnel = reports.quotationFunnel([{ estado: 'borrador' }, { estado: 'enviada' }, { estado: 'aceptada' }, { estado: 'rechazada' }]);
  assert.equal(funnel.total, 4); assert.equal(funnel.sent, 3); assert.equal(funnel.accepted, 1); assert.equal(funnel.rate, 33);
  assert.equal(reports.quotationFunnel([]).rate, 0);
});

test('month totals split by currency, skip cancelled reservations and include payments', () => {
  const totals = reports.monthTotals([{ moneda: 'USD', total: 1000, comision: 100, estado: 'confirmada' }, { moneda: 'USD', total: 500, estado: 'cancelada' }, { moneda: 'HNL', total: 20000, estado: 'pendiente' }], [{ moneda: 'USD', monto: 300 }]);
  assert.deepEqual({ ...totals.USD }, { sold: 1000, income: 100, received: 300, bookings: 1 });
  assert.equal(totals.HNL.sold, 20000);
  assert.match(reports.formatAmount(1500, 'HNL'), /^L 1[,.]500 HNL$/);
});
