import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

// Admin overhaul: the passenger/issuance form must never take back what the traveller already sees in
// Mi viaje (issuance status and recorded tickets), even when the encrypted copy it loaded was behind.
const operations = load('src/lib/travel-operations.ts');
const RESERVATION = '11111111-1111-4111-8111-111111111111';
const passenger = { ...operations.emptyPassenger('p1'), firstName: 'ANA', lastName: 'PRUEBA' };
const ticket = { passengerId: 'p1', airline: 'Avianca', pnr: 'ABC123', number: '1342100000001', issueDate: '2026-10-20', segments: 'SAP-MIA' };
const issued = { passengers: [{ id: 'p1', firstName: 'ANA', middleName: '', lastName: 'PRUEBA', category: 'adulto' }], tickets: [ticket], status: 'emitida', confirmedAt: '2026-10-20', estimateApproved: false, reviewed: true };

function saveTravel(visible) {
  const rpcs = [];
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { fecha_inicio: '2026-12-01', estado: 'confirmada', accepted_snapshot: { quotation: { detalles: {} } } }, error: null }) }) }) }),
    rpc: async (name, args) => { rpcs.push({ name, args }); return { data: 7, error: null }; },
  };
  const actions = load('src/app/admin/reservas/travel-actions.ts', {
    '@/lib/admin': { requireAdmin: async () => ({ client }) }, '@/lib/quotation-validation': { validUuid: () => true },
    '@/lib/travel-operations': operations, '@/lib/travel-vault': { sealTravel: () => 'sealed' },
    '@/lib/travel-data': { getTravel: async () => ({ available: true, revision: 6, data: visible, privateData: null }) },
    '@/lib/travel-services': { travelServices: () => ({ vuelos: { journeys: [{ segmentos: [{}] }] } }) },
    'next/cache': { revalidatePath() {} }, '@/lib/passenger-counts': { validatePassengerCounts() {} },
  });
  return { rpcs, save: travel => { const form = new FormData(); form.set('id', RESERVATION); form.set('revision', '6'); form.set('payload', JSON.stringify(travel)); return actions.saveTravel({}, form); } };
}

test('a stale form cannot move an issued file back to pending', async () => {
  const { rpcs, save } = saveTravel(issued);
  const result = await save({ ...operations.emptyTravel(), passengers: [passenger], reviewed: true });
  assert.match(result.error, /El cliente ya ve «Boletos emitidos»/);
  assert.equal(rpcs.length, 0);
});

test('a save that drops a ticket the traveller sees is refused', async () => {
  const { rpcs, save } = saveTravel(issued);
  const result = await save({ ...operations.emptyTravel(), passengers: [passenger], status: 'emitida', confirmedAt: '2026-10-20', reviewed: true, tickets: [{ ...ticket, number: '1342100000099' }] });
  assert.match(result.error, /Faltan boletos/);
  assert.equal(rpcs.length, 0);
});

test('saving with the visible issuance and tickets goes through (this reconciles the two copies)', async () => {
  const { rpcs, save } = saveTravel(issued);
  const result = await save({ ...operations.emptyTravel(), passengers: [passenger], status: 'emitida', confirmedAt: '2026-10-20', reviewed: true, tickets: [ticket] });
  assert.match(result.success, /Expediente guardado/);
  assert.equal(rpcs[0].name, 'save_reservation_travel');
  assert.equal(rpcs[0].args.p_public.status, 'emitida');
});

test('a file the traveller does not see yet can still move forward normally', async () => {
  const { save } = saveTravel(null);
  const result = await save({ ...operations.emptyTravel(), passengers: [passenger] });
  assert.match(result.success, /Expediente guardado/);
});
