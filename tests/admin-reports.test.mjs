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

test('Honduras day uses the Tegucigalpa calendar, not UTC', () => {
  // 03:00 UTC is still the previous evening in Honduras (UTC-6).
  assert.equal(reports.hondurasDay(new Date('2026-10-15T03:00:00Z')), '2026-10-14');
  assert.equal(reports.hondurasDay(new Date('2026-10-15T03:00:00Z'), 30), '2026-11-13');
});

test('outstanding balances count same-currency payments only and skip cancelled or settled reservations', () => {
  const reservations = [
    { id: 'a', moneda: 'USD', total: 1000, estado: 'confirmada' },
    { id: 'b', moneda: 'USD', total: 500, estado: 'confirmada' },
    { id: 'c', moneda: 'HNL', total: 9000, estado: 'cancelada' },
    { id: 'd', moneda: 'USD', total: 300, estado: 'pendiente' },
  ];
  const payments = [{ reservation_id: 'a', moneda: 'USD', monto: 400 }, { reservation_id: 'a', moneda: 'HNL', monto: 5000 }, { reservation_id: 'b', moneda: 'USD', monto: 500 }];
  const result = reports.outstandingBalances(reservations, payments).map(entry => [entry.row.id, entry.balance]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [['a', 600], ['d', 300]]);
});

test('expiring soon keeps open quotations inside the window, soonest first', () => {
  const at = new Date('2026-10-14T12:00:00Z');
  const rows = [
    { id: 1, estado: 'enviada', vence: '2026-10-15T12:00:00Z' },
    { id: 2, estado: 'borrador', vence: '2026-10-14T18:00:00Z' },
    { id: 3, estado: 'aceptada', vence: '2026-10-14T18:00:00Z' },
    { id: 4, estado: 'enviada', vence: '2026-10-14T06:00:00Z' },
    { id: 5, estado: 'enviada', vence: '2026-10-20T12:00:00Z' },
    { id: 6, estado: 'enviada', vence: '' },
  ];
  const result = reports.expiringSoon(rows, row => row.vence, at, 48).map(entry => entry.row.id);
  assert.deepEqual(result, [2, 1]);
});
