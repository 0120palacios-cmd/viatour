import { test } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
import { details, pdf } from './pdf-support.mjs';
import { samples, photoBuffers, sampleNow } from './fixtures/quotation-samples.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const invoiceQuery = load('src/lib/invoice-query.ts');
const now = new Date('2026-10-12T15:00:00Z');
const errors = (kind, record) => details.quotationReadiness(kind, record.details, record.items, now).filter(issue => issue.nivel === 'error').map(issue => issue.mensaje);
const approve = record => { record.details.aprobacionCondiciones = { huella: details.termsFingerprint(record.details.condiciones), por: 'admin', en: '2026-10-12T15:00:00.000Z' }; return record; };

// ---- Invoicing on the production schema ----

test('invoice reads retry without the columns production does not have', async () => {
  const asked = [];
  const result = await invoiceQuery.selectInvoices(async fields => {
    asked.push(fields);
    return fields.includes('items') ? { data: null, error: { code: '42703' } } : { data: [{ id: 'i1', total: 10 }], error: null };
  });
  assert.equal(asked.length, 3);
  assert.ok(!asked[2].includes('items') && !asked[2].includes('cliente_email'));
  assert.deepEqual(plain(result), { data: [{ cliente_email: '', cliente_telefono: null, items: [], id: 'i1', total: 10 }], error: null });
});

test('invoice reads use the full columns when they exist and keep other errors', async () => {
  const full = await invoiceQuery.selectInvoices(async () => ({ data: { id: 'i1', items: [{ a: 1 }] }, error: null }));
  assert.deepEqual(plain(full.data.items), [{ a: 1 }]);
  const denied = await invoiceQuery.selectInvoices(async () => ({ data: null, error: { code: '42501' } }));
  assert.equal(denied.error.code, '42501');
});

test('a reservation page no longer fails when invoices lack the newer columns', async () => {
  const reservationData = load('src/lib/reservation-data.ts', { 'server-only': {}, '@/lib/invoice-query': invoiceQuery });
  const response = (data, error = null) => ({ data, error });
  const builder = (table) => {
    const state = { fields: '' };
    const api = {
      select(fields) { state.fields = fields; return api; }, eq() { return api; }, order() { return api; },
      maybeSingle: async () => table === 'reservations' ? response(state.fields.includes('comision') ? { comision: null, segmento: null } : { id: 'r1', codigo: 'RES-1' }) : response(null),
      then(resolve) {
        if (table === 'invoices' && state.fields.includes('items')) return Promise.resolve(response(null, { code: '42703' })).then(resolve);
        return Promise.resolve(response(table === 'invoices' ? [{ id: 'i1', numero: 'FAC-1' }] : [])).then(resolve);
      },
    };
    return api;
  };
  const record = await reservationData.getAdminReservation({ from: builder }, 'r1');
  assert.equal(record.reservation.codigo, 'RES-1');
  assert.deepEqual(plain(record.invoices), [{ cliente_email: '', cliente_telefono: null, items: [], id: 'i1', numero: 'FAC-1' }]);
});

// ---- Hotel inclusions ----

test('hotel inclusions must each have a state and be confirmed before sending', () => {
  const record = approve(samples['hotel-con-fotos']());
  assert.deepEqual(plain(errors('hotel', record)), []);
  record.details.hoteles[0].inclusiones.push({ id: 'x', nombre: 'Gimnasio', estado: '', detalle: '' });
  assert.ok(errors('hotel', record).some(message => /Gimnasio/.test(message)));
  record.details.hoteles[0].inclusiones.pop();
  record.details.hoteles[0].inclusionesConfirmadas = false;
  assert.ok(errors('hotel', record).some(message => /confirme lo que incluye/.test(message)));
});

test('sanitizing keeps only valid inclusion states and drops empty names', () => {
  const clean = details.sanitizeDetails({ hoteles: [{ nombre: 'H', inclusiones: [{ nombre: 'Desayuno', estado: 'incluido' }, { nombre: 'Spa', estado: 'gratis' }, { nombre: '', estado: 'incluido' }], inclusionesConfirmadas: true }] });
  assert.deepEqual(plain(clean.hoteles[0].inclusiones.map(item => [item.nombre, item.estado])), [['Desayuno', 'incluido'], ['Spa', '']]);
});

// ---- Ferry ----

test('a complete ferry quotation is ready; missing operator, ports or times block it', () => {
  const record = approve(samples['ferry-ida-y-vuelta']());
  assert.deepEqual(plain(errors('ferry', record)), []);
  const broken = structuredClone(record);
  broken.details.ferry.legs[0].operador = '';
  broken.details.ferry.legs[1].salidaHora = '';
  const messages = errors('ferry', broken);
  assert.ok(messages.some(message => /Trayecto 1: indique la naviera/.test(message)));
  assert.ok(messages.some(message => /Trayecto 2: indique la fecha y hora de salida/.test(message)));
});

test('ferry legs must be in order and arrive after they leave; confirmation is required', () => {
  const record = approve(samples['ferry-ida-y-vuelta']());
  record.details.ferry.legs[1].salidaFecha = '2026-12-10';
  record.details.ferry.legs[0].llegadaHora = '09:00';
  record.details.ferry.confirmado = false;
  const messages = errors('ferry', record);
  assert.ok(messages.some(message => /sale antes del trayecto anterior/.test(message)));
  assert.ok(messages.some(message => /hora de llegada debe ser posterior/.test(message)));
  assert.ok(messages.some(message => /Confirme los horarios/.test(message)));
});

test('a passenger-only ferry needs only operator, ports, date and time', () => {
  const minimal = details.sanitizeDetails({ ferry: { legs: [{ tipo: 'ida', operador: 'Naviera', origenPuerto: 'La Ceiba', destinoPuerto: 'Utila', salidaFecha: '2026-12-01', salidaHora: '09:30' }], confirmado: true, equipajeIncluido: '1 maleta' }, condiciones: details.termsTemplates.ferry, validez: { venceEn: '2026-12-01T00:00:00.000Z' } });
  minimal.aprobacionCondiciones = { huella: details.termsFingerprint(minimal.condiciones), por: 'a', en: 'b' };
  assert.deepEqual(plain(details.quotationReadiness('ferry', minimal, [{ descripcion: 'Pasaje', tipo: 'Ferry', cantidad: 1, precio_unitario: 30 }], now).filter(issue => issue.nivel === 'error')), []);
});

test('ferry data is sanitized and limited', () => {
  const clean = details.sanitizeDetails({ ferry: { legs: [{ tipo: 'crucero', operador: 'x'.repeat(500), salidaFecha: '2026-02-30', salidaHora: '9:30' }], vehiculos: [{ tipo: 'Auto', cantidad: 99 }, { tipo: '', cantidad: 1 }], reembolso: 'siempre' } });
  const leg = clean.ferry.legs[0];
  assert.deepEqual([leg.tipo, leg.operador.length, leg.salidaFecha, leg.salidaHora], ['tramo', 120, '', '']);
  assert.deepEqual(plain(clean.ferry.vehiculos.map(vehicle => [vehicle.tipo, vehicle.cantidad])), [['Auto', 1]]);
  assert.equal(clean.ferry.reembolso, '');
  assert.deepEqual(plain(details.sanitizeDetails({}).ferry.legs), []);
});

test('ferry dates feed the trip summary and "ferry" is a valid quotation type', () => {
  const record = samples['ferry-ida-y-vuelta']();
  assert.deepEqual(plain(details.derivedTripDates(record.details)), { salida: '2026-12-18', regreso: '2026-12-22' });
  assert.ok(details.quotationKinds.includes('ferry'));
  assert.equal(details.quotationKindLabels.ferry, 'Ferry');
  assert.equal(details.termsTemplates.ferry.length, 7);
});

test('ferry and hotel PDFs render the inclusions and every leg', async () => {
  for (const name of ['ferry-ida-y-vuelta', 'hotel-con-fotos']) {
    const record = samples[name]();
    const buffer = await pdf.renderQuotationPdf(record, { photos: photoBuffers(record), now: sampleNow });
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.pdfPageCount(buffer) <= 2);
  }
});

// ---- Price-line types accepted by production (quotation_items_tipo_check) ----

test('price-line types are canonical; legacy codes map; unknown types are rejected', () => {
  assert.equal(details.canonicalItemType('tarifa aerea'), 'Tarifa aérea');
  assert.equal(details.canonicalItemType('  DESCUENTO '), 'Descuento');
  assert.equal(details.canonicalItemType('vuelo'), 'Tarifa aérea');
  assert.equal(details.canonicalItemType('paquete'), 'Paquete');
  assert.equal(details.canonicalItemType('Promoción especial'), null);
  assert.equal(details.canonicalItemType(''), null);
  assert.ok(details.itemTypes.includes('Ferry') && details.itemTypes.includes('Paquete'));
});

test('the payload rejects a price line with an unknown type and normalizes known ones', () => {
  const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': load('src/lib/quotation-types.ts') });
  const payload = load('src/lib/quotation-payload.ts', { '@/lib/quotation-details': details, '@/lib/quotation-types': load('src/lib/quotation-types.ts'), '@/lib/quotation-validation': validation });
  const base = { cliente: { nombre: 'Ana', email: '' }, moneda: 'USD', tipo: 'general', detalles: {} };
  const bad = payload.parseQuotationPayload(JSON.stringify({ ...base, items: [{ descripcion: 'X', tipo: 'Inventado', cantidad: '1', precio_unitario: '5' }] }));
  assert.match(bad.error, /elija un tipo de la lista/);
  const good = payload.parseQuotationPayload(JSON.stringify({ ...base, items: [{ descripcion: 'X', tipo: 'descuento', cantidad: '1', precio_unitario: '5' }, { descripcion: 'Y', tipo: 'hotel', cantidad: '2', precio_unitario: '5' }] }));
  assert.deepEqual(plain(good.payload.items.map(item => item.tipo)), ['Descuento', 'Hotel']);
});

test('every type the editor offers is accepted by the migrated database constraint', () => {
  const sql = fs.readFileSync('docs/sql/quotations_v5.sql', 'utf8');
  const allowed = sql.slice(sql.indexOf('add constraint quotation_items_tipo_check'), sql.indexOf('-- 5. Una sola reserva'));
  for (const type of details.itemTypes) assert.ok(allowed.includes(`'${type}'`), type);
});
