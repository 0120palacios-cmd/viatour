import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details, money } from './pdf-support.mjs';
import { samples } from './fixtures/quotation-samples.mjs';

const plain = value => JSON.parse(JSON.stringify(value));

test('money: cents arithmetic and discounts subtract', () => {
  assert.equal(money.totalAmount([{ tipo: 'Hotel', cantidad: 3, precio_unitario: 19.99 }, { tipo: 'Otro', cantidad: 1, precio_unitario: 0.1 }, { tipo: 'Otro', cantidad: 1, precio_unitario: 0.2 }]), 60.27);
  assert.equal(money.totalAmount([{ tipo: 'Hotel', cantidad: 1, precio_unitario: 100 }, { tipo: 'descuento', cantidad: 1, precio_unitario: 15.5 }]), 84.5);
  assert.equal(money.lineAmount({ tipo: 'Descuento', cantidad: 2, precio_unitario: 10 }), -20);
});

test('pricing summary with deposit, balance and per-passenger price', () => {
  const summary = details.pricingSummary([
    { descripcion: 'Tarifa', tipo: 'Tarifa aérea', cantidad: 2, precio_unitario: 312 },
    { descripcion: 'Tasas', tipo: 'Impuestos y tasas', cantidad: 2, precio_unitario: 118.4 },
    { descripcion: 'Promo', tipo: 'Descuento', cantidad: 1, precio_unitario: 20 },
  ], { pasajeros: { adultos: 2, ninos: 0, infantes: 0 }, pago: { deposito: '300', precioPorPasajero: true } });
  assert.deepEqual(plain(summary), { subtotal: 860.8, descuentos: 20, total: 840.8, pasajeros: 2, porPasajero: 420.4, deposito: 300, saldo: 540.8 });
});

test('sanitizing drops unknown keys, caps text and rejects bad values', () => {
  const clean = details.sanitizeDetails({
    hacker: true,
    pasajeros: { adultos: 1e9, ninos: -3, infantes: '2' },
    notasInternas: 'x'.repeat(9000),
    vuelos: { journeys: [{ tipo: 'ida', segmentos: [{ origen: 'sap', destino: 'MEX<script>', salidaFecha: '2026-13-45', salidaHora: '25:00', vuelo: 'am 675', duracionMin: 'abc', revisar: ['salidaFecha', 'eval'] }] }] },
    hoteles: [{ nombre: 'H', fotos: [{ path: '../../etc/passwd' }, { path: 'hotel/0123456789abcdef0123456789abcdef.jpg', leyenda: 'ok' }, { path: 'https://evil.example/x.jpg' }] }],
    validez: { venceEn: 'mañana', zona: 'Mars/Olympus' },
    condiciones: ['  uno  ', '', 42],
    pago: { deposito: '12.345' },
  });
  assert.equal('hacker' in clean, false);
  assert.deepEqual(plain(clean.pasajeros), { adultos: 0, ninos: 0, infantes: 2, edadesNinos: '' });
  assert.equal(clean.notasInternas.length, 5000);
  const segment = clean.vuelos.journeys[0].segmentos[0];
  assert.deepEqual([segment.origen, segment.destino, segment.salidaFecha, segment.salidaHora, segment.vuelo, segment.duracionMin], ['SAP', 'MEX', '', '', 'AM 675', null]);
  assert.deepEqual(plain(segment.revisar), ['salidaFecha']);
  assert.deepEqual(plain(clean.hoteles[0].fotos.map(photo => photo.path)), ['hotel/0123456789abcdef0123456789abcdef.jpg']);
  assert.equal(clean.validez.venceEn, '');
  assert.equal(clean.validez.zona, 'America/Tegucigalpa');
  assert.deepEqual(plain(clean.condiciones), ['uno', '42']);
  assert.equal(clean.pago.deposito, '');
});

test('legacy quotations get no invented passengers or conditions', () => {
  const record = samples['cotizacion-anterior']();
  assert.equal(record.kind, 'general');
  assert.equal(record.details.pasajeros.adultos, 0);
  assert.deepEqual(plain(record.details.condiciones), []);
  // A date-only validity ends at 23:59 in Honduras (UTC-6).
  assert.equal(record.expiry, '2026-10-21T05:59:00.000Z');
});

test('new quotations start with the template for their type', () => {
  assert.equal(details.defaultDetails('hotel').condiciones[0].includes('hotel'), true);
  assert.equal(details.defaultDetails('vuelo').equipaje.length, 1);
  assert.equal(details.defaultDetails('general').hoteles.length, 0);
  assert.equal(details.termsPendingReview, true);
});

test('validity: presets, zone conversion and expiry', () => {
  const now = new Date('2026-10-12T15:00:00Z');
  assert.equal(details.expiryFromPreset(2, now), '2026-10-12T17:00:00.000Z');
  assert.equal(details.zonedToIso('2026-10-13T18:00'), '2026-10-14T00:00:00.000Z');
  assert.equal(details.isoToZoned('2026-10-14T00:00:00.000Z'), '2026-10-13T18:00');
  assert.equal(details.isExpired('2026-10-12T14:59:00.000Z', now), true);
  assert.equal(details.isExpired('2026-10-12T15:01:00.000Z', now), false);
  assert.equal(details.formatInstant('2026-10-14T00:00:00.000Z'), '13 de octubre de 2026 a las 6:00 p. m. (hora de Honduras)');
  assert.equal(details.legacyValidityDate('2026-10-14T00:00:00.000Z'), '2026-10-13');
});

test('readiness blocks sending until the itinerary, baggage and validity are confirmed', () => {
  const record = samples['vuelo-directo-ida-y-vuelta']();
  const now = new Date('2026-10-12T15:00:00Z');
  const pending = details.quotationReadiness('vuelo', record.details, record.items, now).filter(issue => issue.nivel === 'error');
  assert.deepEqual(plain(pending.map(issue => issue.mensaje)), ['Revise y apruebe las condiciones de esta cotización.']);
  record.details.aprobacionCondiciones = { huella: details.termsFingerprint(record.details.condiciones), por: 'admin', en: '2026-10-12T15:00:00.000Z' };
  assert.deepEqual(plain(details.quotationReadiness('vuelo', record.details, record.items, now).filter(issue => issue.nivel === 'error')), []);
  const unconfirmed = { ...record.details, vuelos: { ...record.details.vuelos, confirmado: false }, equipajeConfirmado: false };
  const errors = details.quotationReadiness('vuelo', unconfirmed, record.items, now).filter(issue => issue.nivel === 'error').map(issue => issue.seccion);
  assert.ok(errors.includes('vuelos') && errors.includes('equipaje'));
  const expired = details.quotationReadiness('vuelo', record.details, record.items, new Date('2026-12-01T00:00:00Z'));
  assert.ok(expired.some(issue => issue.seccion === 'validez' && issue.nivel === 'error'));
  const unknownBaggage = { ...record.details, equipaje: [{ ...record.details.equipaje[0], documentado: { estado: '', piezas: null, peso: '', medidas: '' } }] };
  assert.ok(details.quotationReadiness('vuelo', unknownBaggage, record.items, now).some(issue => /documentado/.test(issue.mensaje)));
});

test('readiness checks hotel dates and discounts larger than the total', () => {
  const record = samples['hotel-con-fotos']();
  const now = new Date('2026-10-12T15:00:00Z');
  const badDates = { ...record.details, hoteles: [{ ...record.details.hoteles[0], checkOut: record.details.hoteles[0].checkIn }] };
  assert.ok(details.quotationReadiness('hotel', badDates, record.items, now).some(issue => /posterior a la entrada/.test(issue.mensaje)));
  const items = [...record.items, { descripcion: 'X', tipo: 'Descuento', cantidad: 1, precio_unitario: 99999 }];
  assert.ok(details.quotationReadiness('hotel', record.details, items, now).some(issue => /descuentos superan/.test(issue.mensaje)));
});

test('nights and trip dates', () => {
  assert.equal(details.nights('2026-12-20', '2026-12-26'), 6);
  assert.equal(details.nights('2026-12-26', '2026-12-20'), 0);
  const record = samples['paquete-vuelo-hotel']();
  assert.deepEqual(plain(details.derivedTripDates(record.details)), { salida: '2026-10-15', regreso: '2026-10-25' });
});

test('terms fingerprint changes with any edit and approval is resolved on the server', () => {
  const clauses = ['Uno.', 'Dos.'];
  const fingerprint = details.termsFingerprint(clauses);
  assert.match(fingerprint, /^[0-9a-f]{14}$/);
  assert.equal(details.termsFingerprint(['Uno.', 'Dos.']), fingerprint);
  assert.notEqual(details.termsFingerprint(['Uno.', 'Dos!']), fingerprint);
  assert.notEqual(details.termsFingerprint(['Dos.', 'Uno.']), fingerprint);
  const submitted = { condiciones: clauses, aprobacionCondiciones: { huella: fingerprint, por: 'forged', en: '2000-01-01T00:00:00.000Z' } };
  assert.deepEqual(plain(details.resolveTermsApproval(submitted, null, 'admin-1', '2026-10-12T15:00:00.000Z')), { huella: fingerprint, por: 'admin-1', en: '2026-10-12T15:00:00.000Z' });
  const previous = { huella: fingerprint, por: 'admin-0', en: '2026-10-01T00:00:00.000Z' };
  assert.deepEqual(plain(details.resolveTermsApproval(submitted, previous, 'admin-1', 'later')), previous);
  assert.equal(details.resolveTermsApproval({ ...submitted, condiciones: ['Otro.'] }, previous, 'admin-1', 'later'), null);
  assert.equal(details.resolveTermsApproval({ condiciones: [], aprobacionCondiciones: { huella: details.termsFingerprint([]) } }, null, 'admin-1', 'later'), null);
});
