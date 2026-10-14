import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details as detailsModule, pdf } from './pdf-support.mjs';
import { load } from './security-support.mjs';
import { samples, photoBuffers, sampleNow } from './fixtures/quotation-samples.mjs';

// V6 combined packages: data model, sanitizing, readiness, pricing and rendering.
const d = detailsModule;
const plain = value => JSON.parse(JSON.stringify(value));
const errors = issues => issues.filter(issue => issue.nivel === 'error');
const later = new Date('2026-10-12T16:00:00Z');

test('a new combined package starts empty and only offers the V6 kinds when creating', () => {
  const details = d.defaultDetails('combinado');
  assert.deepEqual(plain(details.paquete), { nombre: '', componentes: [], mostrarPrecios: false, lineas: [] });
  assert.deepEqual([details.tarifas.length, details.equipaje.length, details.hoteles.length, details.ferry.legs.length], [0, 0, 0, 0]);
  assert.deepEqual(plain(d.creatableKinds), ['vuelo', 'hotel', 'ferry', 'combinado', 'general']);
  assert.ok(d.quotationKinds.includes('paquete'), 'the V5 package stays a valid kind for existing quotations');
  assert.equal(d.quotationKindLabels.paquete, 'Paquete o combinado', 'the PDF label of existing packages does not change');
  assert.deepEqual(plain(d.termsTemplates.combinado), plain(d.termsTemplates.paquete));
});

test('each component keeps only the data of its own type; unknown types and keys are dropped', () => {
  const clean = d.sanitizeDetails({ paquete: { nombre: 'Viaje', componentes: [
    { id: 'a', tipo: 'hotel', hotel: { nombre: 'H', fotos: [{ path: 'hotel/../x.jpg' }] }, vuelo: { vuelos: { journeys: [{}] } }, extra: 'x' },
    { id: 'b', tipo: 'crucero' },
    { id: 'c', tipo: 'traslado', servicio: { descripcion: 'T', fecha: '2026-13-40', modalidad: 'vip', hora: '25:00' }, hotel: { nombre: 'no' } },
    { id: 'a', tipo: 'vuelo' },
  ], lineas: ['a', 'zzz', 'c'] } });
  const [hotel, transfer, flight] = clean.paquete.componentes;
  assert.equal(clean.paquete.componentes.length, 3);
  assert.equal(hotel.vuelo, null);
  assert.equal(hotel.hotel.nombre, 'H');
  assert.deepEqual(plain(hotel.hotel.fotos), []);
  assert.equal('extra' in hotel, false);
  assert.equal(transfer.hotel, null);
  assert.deepEqual([transfer.servicio.fecha, transfer.servicio.modalidad, transfer.servicio.hora], ['', '', '']);
  assert.notEqual(flight.id, 'a', 'duplicate component ids are renamed');
  assert.deepEqual(plain(flight.vuelo.tarifas), []);
  assert.deepEqual(plain(clean.paquete.lineas), ['a', '', 'c']);
  assert.equal(d.sanitizeDetails({ paquete: { componentes: Array.from({ length: 40 }, () => ({ tipo: 'otro' })) } }).paquete.componentes.length, d.maxPackageComponents);
});

test('readiness checks every component with its own V5 rules, prefixed by its position', () => {
  const record = samples['combinado-vuelo-hotel-traslado']();
  assert.deepEqual(plain(errors(d.quotationReadiness('combinado', record.details, record.items, later)).map(issue => issue.mensaje)), ['Revise y apruebe las condiciones de esta cotización.']);
  const broken = plain(record.details);
  broken.paquete.componentes[0].vuelo.vuelos.confirmado = false;
  broken.paquete.componentes[1].hotel.checkOut = '2026-12-18';
  broken.paquete.componentes[2].servicio.descripcion = '';
  broken.paquete.componentes[3].servicio.inclusionesConfirmadas = false;
  const messages = errors(d.quotationReadiness('combinado', d.sanitizeDetails(broken), record.items, later)).map(issue => issue.mensaje);
  assert.ok(messages.includes('Servicio 1 (Vuelo): Confirme el itinerario después de revisarlo.'));
  assert.ok(messages.includes('Servicio 2 (Hotel): Hotel de prueba Riviera: la salida debe ser posterior a la entrada.'));
  assert.ok(messages.includes('Servicio 3 (Traslado): describa el servicio.'));
  assert.ok(messages.includes('Servicio 4 (Tour o excursión): confirme lo que incluye y lo que no.'));
  assert.ok(d.quotationReadiness('combinado', d.defaultDetails('combinado'), [], later).some(issue => issue.mensaje === 'Agregue al menos un servicio al paquete.'));
});

test('the V5 kinds keep exactly the same readiness messages', () => {
  for (const name of ['vuelo-directo-ida-y-vuelta', 'hotel-con-fotos', 'ferry-ida-y-vuelta', 'paquete-vuelo-hotel']) {
    const record = samples[name]();
    const issues = d.quotationReadiness(record.kind, record.details, record.items, later).map(issue => issue.mensaje);
    assert.ok(!issues.some(message => message.startsWith('Servicio ')), name);
  }
  const hotel = samples['hotel-con-fotos']();
  const changed = plain(hotel.details);
  changed.hoteles[0].checkIn = '';
  assert.ok(d.quotationReadiness('hotel', d.sanitizeDetails(changed), hotel.items, later).some(issue => issue.mensaje === 'Hotel de prueba Riviera: indique las fechas de entrada y salida.'));
});

test('itemized pricing attributes each line to its service once; the total is never double-counted', () => {
  const record = samples['combinado-varios-vuelos-y-hoteles']();
  const { lineas, componentes } = record.details.paquete;
  const perService = componentes.map(component => d.componentAmount(record.items, lineas, component.id));
  assert.deepEqual(perService, [1140, 980, 260, 1120, 1240, 128]);
  assert.equal(perService.reduce((sum, value) => sum + value, 0), d.pricingSummary(record.items, record.details).total);
  const hotelFerry = samples['combinado-hotel-ferry']();
  assert.equal(d.componentAmount(hotelFerry.items, hotelFerry.details.paquete.lineas, 'hotel1'), 280, 'a discount linked to a service reduces that service');
  assert.equal(d.pricingSummary(hotelFerry.items, hotelFerry.details).total, 164 + 310 - 30 + 20);
  // Links that do not match the lines are ignored instead of guessed.
  assert.equal(d.componentAmount(record.items, lineas.slice(1), 'vuelo1'), null);
});

test('package-total pricing: one package line, discount, deposit and balance in exact cents', () => {
  const record = samples['combinado-vuelo-hotel-traslado']();
  const summary = d.pricingSummary(record.items, record.details);
  assert.deepEqual([summary.subtotal, summary.descuentos, summary.total, summary.deposito, summary.saldo], [4179.5, 150, 4029.5, 800, 3229.5]);
  assert.equal(record.details.paquete.mostrarPrecios, false);
  assert.ok(d.quotationReadiness('combinado', record.details, record.items, later).every(issue => !/no tiene un concepto de precio propio/.test(issue.mensaje)));
});

test('in itemized mode a service without its own price is pointed out (warning, not blocking)', () => {
  const record = samples['combinado-hotel-ferry']();
  const details = plain(record.details);
  details.paquete.lineas = ['', '', '', ''];
  const issues = d.quotationReadiness('combinado', d.sanitizeDetails(details), record.items, later);
  assert.ok(issues.some(issue => issue.nivel === 'aviso' && issue.mensaje === 'Servicio 1 (Ferry): no tiene un concepto de precio propio; en el PDF aparecerá sin precio.'));
});

test('trip dates, photos and hotel suggestions come from the components', () => {
  const record = samples['combinado-varios-vuelos-y-hoteles']();
  assert.deepEqual(plain(d.derivedTripDates({ ...record.details, fechaSalida: '', fechaRegreso: '' })), { salida: '2026-11-10', regreso: '2026-11-18' });
  const view = d.expandedDetails(record.details);
  assert.equal(view.hoteles.length, 2);
  assert.equal(view.vuelos.journeys.length, 2);
  assert.equal(record.details.hoteles.length, 0, 'the quotation itself is not changed');
  assert.equal(photoBuffers(record).size, 1);
});

test('duplicating a service gives fresh ids and asks to confirm it again', () => {
  const record = samples['combinado-vuelo-hotel-traslado']();
  const [flight, hotel] = record.details.paquete.componentes;
  const copy = d.duplicateComponent(flight);
  assert.notEqual(copy.id, flight.id);
  assert.equal(copy.vuelo.vuelos.confirmado, false);
  assert.equal(copy.vuelo.equipajeConfirmado, false);
  assert.notEqual(copy.vuelo.vuelos.journeys[0].segmentos[0].id, flight.vuelo.vuelos.journeys[0].segmentos[0].id);
  assert.equal(flight.vuelo.vuelos.confirmado, true, 'the original is untouched');
  const hotelCopy = d.duplicateComponent(hotel);
  assert.equal(hotelCopy.hotel.inclusionesConfirmadas, false);
  assert.deepEqual(plain(hotelCopy.hotel.fotos), plain(hotel.hotel.fotos), 'photos are reused, not re-uploaded');
});

test('component titles fall back to the service data', () => {
  assert.equal(d.componentTitle(d.emptyComponent('seguro')), 'Seguro de viaje');
  const flight = samples['combinado-vuelo-hotel-traslado']().details.paquete.componentes[0];
  assert.equal(d.componentTitle(flight), 'SAP – CUN – SAP');
  assert.equal(d.componentTitle({ ...flight, titulo: 'Vuelos' }), 'Vuelos');
});

test('the payload keeps components only for combined packages and drops mismatched line links', () => {
  const types = load('src/lib/quotation-types.ts');
  const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
  const payload = load('src/lib/quotation-payload.ts', { '@/lib/quotation-details': d, '@/lib/quotation-types': types, '@/lib/quotation-validation': validation });
  const record = samples['combinado-hotel-ferry']();
  const body = (tipo, lineas) => JSON.stringify({ cliente: { nombre: 'Ana' }, tipo, moneda: 'USD', detalles: { ...record.details, paquete: { ...record.details.paquete, lineas } }, items: record.items.map(item => ({ ...item, cantidad: String(item.cantidad), precio_unitario: String(item.precio_unitario) })) });
  const combined = payload.parseQuotationPayload(body('combinado', record.details.paquete.lineas)).payload;
  assert.equal(combined.detalles.paquete.componentes.length, 2);
  assert.deepEqual(plain(combined.detalles.paquete.lineas), ['ferry1', 'hotel1', 'hotel1', '']);
  assert.deepEqual(plain(payload.parseQuotationPayload(body('combinado', ['ferry1'])).payload.detalles.paquete.lineas), []);
  assert.equal(payload.parseQuotationPayload(body('hotel', record.details.paquete.lineas)).payload.detalles.paquete.componentes.length, 0);
});

test('combined packages render as real PDFs with the existing layout contract', async () => {
  for (const name of ['combinado-vuelo-hotel-traslado', 'combinado-hotel-ferry', 'combinado-varios-vuelos-y-hoteles']) {
    const record = samples[name]();
    const buffer = await pdf.renderQuotationPdf(record, { photos: photoBuffers(record), now: sampleNow });
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-', name);
    assert.ok(pdf.pdfPageCount(buffer) >= 1 && pdf.pdfPageCount(buffer) <= 3, name);
  }
});

test('an empty package still previews without errors', async () => {
  const base = samples['combinado-hotel-ferry']();
  const record = { ...base, details: { ...base.details, paquete: { ...base.details.paquete, componentes: [], lineas: [] } } };
  const buffer = await pdf.renderQuotationPdf(record, { preview: true, now: sampleNow });
  assert.equal(pdf.pdfPageCount(buffer), 1);
});
