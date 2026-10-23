import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
import { types } from './pdf-support.mjs';

// Step 5: refunds, reversals and cancellation actions (the SQL runs in scripts/test-finance-ledger-sql.mjs), and
// the read-only comparison of the two passenger-file copies.
const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
const reservationTypes = load('src/lib/reservation-types.ts', { '@/lib/quotation-types': types });
const travel = load('src/lib/travel-operations.ts');
const counts = load('src/lib/passenger-counts.ts', { '@/lib/travel-operations': travel });
const compare = load('src/lib/travel-compare.ts', { '@/lib/travel-operations': travel, '@/lib/passenger-counts': counts });

function finance(rpcResult = { data: 'p1', error: null }) {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return typeof rpcResult === 'function' ? rpcResult(name, args) : rpcResult; } };
  const api = load('src/app/admin/reservas/finance-actions.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/admin': { requireAdmin: async () => ({ client }) },
    '@/lib/quotation-validation': validation, '@/lib/commercial-errors': load('src/lib/commercial-errors.ts'), '@/lib/reservation-types': reservationTypes,
  });
  return { api, calls };
}
const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
const R = '11111111-1111-4111-8111-111111111111', Q = '22222222-2222-4222-8222-222222222222', P = '33333333-3333-4333-8333-333333333333';

test('a refund needs amount, method, date and reason, and is sent once with its request id', async () => {
  const { api, calls } = finance();
  const base = { reservation_id: R, request_id: Q, tipo: 'reembolso', monto: '100.50', metodo: 'transferencia', fecha: '2026-10-23', motivo: '  Cambio   de fecha ' };
  assert.match((await api.recordRefund({}, form({ ...base, motivo: 'x' }))).error, /motivo/);
  assert.match((await api.recordRefund({}, form({ ...base, monto: '-5' }))).error, /monto/);
  assert.match((await api.recordRefund({}, form({ ...base, metodo: 'cheque' }))).error, /cómo se devolvió/);
  assert.equal(calls.length, 0);
  assert.match((await api.recordRefund({}, form(base))).success, /Devolución registrada/);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { name: 'record_reservation_refund', args: { p_request: Q, p_reservation: R, p_kind: 'reembolso', p_amount: 100.5, p_method: 'transferencia', p_date: '2026-10-23', p_reference: null, p_reason: 'Cambio de fecha', p_reverses: null } });
});

test('a reversal names the payment and takes amount and method from it', async () => {
  const { api, calls } = finance();
  assert.match((await api.recordRefund({}, form({ reservation_id: R, request_id: Q, tipo: 'reverso', motivo: 'Reserva equivocada' }))).error, /Elija el pago/);
  assert.match((await api.recordRefund({}, form({ reservation_id: R, request_id: Q, tipo: 'reverso', revierte_a: P, motivo: 'Reserva equivocada', monto: '999' }))).success, /Pago revertido/);
  assert.deepEqual([calls[0].args.p_kind, calls[0].args.p_reverses, calls[0].args.p_amount, calls[0].args.p_method], ['reverso', P, null, null]);
});

test('database refusals reach the advisor; before the SQL, the message says what to run', async () => {
  const refused = finance({ data: null, error: { code: '23514', message: 'Ese pago ya tiene recibo: registre un reembolso en lugar de un reverso.' } });
  assert.match((await refused.api.recordRefund({}, form({ reservation_id: R, request_id: Q, tipo: 'reverso', revierte_a: P, motivo: 'Error' }))).error, /ya tiene recibo/);
  const missing = finance({ data: null, error: { code: 'PGRST202' } });
  assert.match((await missing.api.cancelReservation({}, form({ id: R, motivo: 'Desistió', revisado: 'si' }))).error, /finance_ledger\.sql/);
});

test('cancelling requires a reason and the review confirmation, and reports annulled invoices', async () => {
  const { api, calls } = finance({ data: { estado: 'cancelada', facturas_anuladas: 1, recibido: 200, moneda: 'USD' }, error: null });
  assert.match((await api.cancelReservation({}, form({ id: R, motivo: '', revisado: 'si' }))).error, /motivo/);
  assert.match((await api.cancelReservation({}, form({ id: R, motivo: 'Desistió del viaje' }))).error, /Confirme que revisó/);
  assert.equal(calls.length, 0);
  assert.match((await api.cancelReservation({}, form({ id: R, motivo: 'Desistió del viaje', revisado: 'si', anular: 'si' }))).success, /Reserva cancelada\. Se anuló 1 factura pendiente\./);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)), { p_id: R, p_reason: 'Desistió del viaje', p_annul_invoices: true });
});

const passenger = (id, firstName, lastName) => ({ ...travel.emptyPassenger(id), firstName, lastName });
const issued = { passengers: [{ id: 'monica-vasquez', firstName: 'Mónica', middleName: '', lastName: 'Vásquez', category: 'adulto' }], tickets: [{ passengerId: 'monica-vasquez', airline: 'CM', pnr: 'ABC123', number: '2302400000001', issueDate: '2026-10-21', segments: 'SAP-PTY' }], status: 'emitida', confirmedAt: '2026-10-21', estimateApproved: true, reviewed: true };

test('copies in sync say so, and saving would change nothing', () => {
  const admin = { ...travel.emptyTravel(), ...issued, passengers: [passenger('monica-vasquez', 'Mónica', 'Vásquez')] };
  const result = compare.compareTravelCopies(admin, issued, '2026-12-01', { pasajeros: { adultos: 1, ninos: 0, infantes: 0 } });
  assert.equal(result.inSync, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.save)), { ok: true });
});

test('an encrypted copy behind the customer is reported, and saving would align it when the passenger ids match', () => {
  const behind = { ...travel.emptyTravel(), passengers: [passenger('monica-vasquez', 'Mónica', 'Vásquez')] };
  const result = compare.compareTravelCopies(behind, issued, '2026-12-01', { pasajeros: { adultos: 1, ninos: 0, infantes: 0 } });
  assert.equal(result.inSync, false);
  assert.deepEqual([...result.rows.filter(row => !row.same).map(row => row.label)], ['Emisión', 'Boletos']);
  assert.deepEqual(JSON.parse(JSON.stringify(result.save)), { ok: true });
});

test('when the ticket points to a passenger the encrypted copy does not have, the comparison warns that saving would fail', () => {
  const other = { ...travel.emptyTravel(), passengers: [passenger('pax-1', 'Mónica', 'Vásquez')] };
  const result = compare.compareTravelCopies(other, issued, '2026-12-01', { pasajeros: { adultos: 1, ninos: 0, infantes: 0 } });
  assert.equal(result.save.ok, false);
  assert.match(result.save.reason, /pasajero/);
  assert.ok(result.rows.find(row => row.label === 'Pasajeros').same === false);
});
