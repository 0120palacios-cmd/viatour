import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
import { types } from './pdf-support.mjs';

// Step 7: the activity history in words.
const activity = load('src/lib/activity.ts', {
  'server-only': {},
  '@/lib/admin-quotation-status': load('src/lib/admin-quotation-status.ts', { '@/lib/quotation-types': types }),
  '@/lib/reservation-types': load('src/lib/reservation-types.ts', { '@/lib/quotation-types': types }),
});
const ME = '11111111-1111-4111-8111-111111111111', R = '22222222-2222-4222-8222-222222222222', Q = '33333333-3333-4333-8333-333333333333', C = '44444444-4444-4444-8444-444444444444';
const entry = (action, entity, extra = {}) => ({ id: 1, created_at: '2026-10-23T15:00:00Z', actor: ME, action, entity, entity_id: null, reference: null, details: {}, ...extra });
const line = (value, user = ME) => JSON.parse(JSON.stringify(activity.toLines([value], user)[0]));

test('state changes, money and shares read as sentences, with a link to the record', () => {
  assert.deepEqual(line(entry('quotation.status_changed', 'quotation', { entity_id: Q, reference: 'COT-1', details: { from: 'aceptada', to: 'reemplazada' } })),
    { id: 1, at: '2026-10-23T15:00:00Z', who: 'Usted', text: 'Cotización: Aceptada → Reemplazada por enmienda', href: `/admin/cotizaciones/${Q}`, reference: 'COT-1' });
  assert.equal(line(entry('payment.refunded', 'payment', { details: { monto: -50, moneda: 'USD', reservation_id: R } })).text, 'Devolución registrada: -50.00 USD');
  assert.equal(line(entry('payment.refunded', 'payment', { details: { reservation_id: R } })).href, `/admin/reservas/${R}`);
  assert.equal(line(entry('reservation.status_changed', 'reservation', { entity_id: R, details: { estado: ['pendiente', 'cancelada'] } })).text, 'Reserva: Pendiente → Cancelada');
  assert.equal(line(entry('reservation.updated', 'reservation', { entity_id: R, details: { total: [578, 600] } })).text, 'Total de la reserva: 578.00 → 600.00');
  assert.equal(line(entry('quotation.share_confirmado', 'quotation', { entity_id: Q })).text, 'Envío por WhatsApp confirmado por el asesor');
  assert.equal(line(entry('passenger.passport_viewed', 'passenger_profile', { details: { customer_id: C } })).href, `/admin/clientes/${C}`);
});

test('who: the signed-in admin, another admin, or the system (daily job)', () => {
  assert.equal(line(entry('quotation.created', 'quotation'), ME).who, 'Usted');
  assert.equal(line(entry('quotation.created', 'quotation'), R).who, 'Otro administrador');
  assert.equal(line(entry('quotation.status_changed', 'quotation', { actor: null, details: { from: 'enviada', to: 'expirada' } })).who, 'Sistema');
});

test('an unknown action is shown as recorded, never invented', () => {
  assert.equal(line(entry('future.thing', 'admin')).text, 'future.thing');
  assert.equal(line(entry('future.thing', 'admin')).href, null);
});
