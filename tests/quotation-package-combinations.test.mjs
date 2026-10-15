import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { details as d, parser, pdf } from './pdf-support.mjs';
import { load } from './security-support.mjs';

// V6: a combined package accepts any service types, in any order, with repeats; none is required.
// Each combination below is built from complete services, must be sendable, price correctly per service
// and as a package, survive saving (sanitizing) unchanged, and render as one real PDF.

const data = load('src/lib/quotation-data.ts', { 'server-only': {}, '@/lib/quotation-details': d });
const plain = value => JSON.parse(JSON.stringify(value));
const now = new Date('2026-10-12T15:00:00Z');
const expiry = d.expiryFromPreset(24, now);
const piece = (estado, piezas = null) => ({ estado, piezas, peso: '', medidas: '' });
const aa = fs.readFileSync('tests/fixtures/american-google.txt', 'utf8').replace(/\r\n/g, '\n');

let counter = 0;
const nextId = kind => `${kind}${++counter}`;
const services = {
  vuelo: () => ({ ...d.emptyComponent('vuelo', nextId('vuelo')), vuelo: {
    vuelos: { journeys: parser.parseItinerary(aa, { referencia: '2026-10-14' }).journeys, textoOriginal: '', confirmado: true, boletosSeparados: false },
    tarifas: [{ ...d.emptyFare(), aerolinea: 'American Airlines', cabina: 'Económica' }],
    equipaje: [{ ...d.emptyBaggage(), personal: piece('incluido', 1), mano: piece('incluido', 1), documentado: piece('con_cargo') }], equipajeConfirmado: true } }),
  hotel: (nombre = 'Hotel de prueba Centro', checkIn = '2026-11-10', checkOut = '2026-11-14') => ({ ...d.emptyComponent('hotel', nextId('hotel')), hotel: { ...d.emptyHotel(), nombre, destino: 'Ciudad de prueba', checkIn, checkOut, planComidas: 'Desayuno incluido', impuestos: 'incluidos', cancelacion: 'Sin cargo hasta 72 horas antes.' } }),
  ferry: (salida = '2026-11-15') => ({ ...d.emptyComponent('ferry', nextId('ferry')), ferry: { ...d.emptyFerry(), legs: [{ ...d.emptyFerryLeg('ida'), operador: 'Naviera de prueba', origenPuerto: 'La Ceiba', destinoPuerto: 'Roatán', salidaFecha: salida, salidaHora: '09:30', llegadaFecha: salida, llegadaHora: '11:10', duracionMin: 100 }], equipajeIncluido: '1 maleta de 23 kg', confirmado: true } }),
  traslado: (fecha = '2026-11-10') => ({ ...d.emptyComponent('traslado', nextId('traslado')), servicio: { ...d.emptyService(), descripcion: 'Traslado aeropuerto – hotel', fecha, hora: '17:00', modalidad: 'privado' } }),
  tour: (fecha = '2026-11-12') => ({ ...d.emptyComponent('tour', nextId('tour')), servicio: { ...d.emptyService(), descripcion: 'Tour por la ciudad', fecha, hora: '08:00', inclusiones: [{ id: 'g', nombre: 'Guía', estado: 'incluido', detalle: '' }], inclusionesConfirmadas: true } }),
  seguro: () => ({ ...d.emptyComponent('seguro', nextId('seguro')), servicio: { ...d.emptyService(), descripcion: 'Seguro de viaje', fecha: '2026-11-10', fechaFin: '2026-11-24' } }),
};

const combinations = {
  'Vuelo + Ferry (sin hotel)': () => [services.vuelo(), services.ferry()],
  'Hotel + Ferry (sin vuelo)': () => [services.hotel(), services.ferry()],
  'Vuelo + Hotel': () => [services.vuelo(), services.hotel()],
  'Dos hoteles sin otros servicios': () => [services.hotel('Hotel de prueba Uno', '2026-11-10', '2026-11-12'), services.hotel('Hotel de prueba Dos', '2026-11-12', '2026-11-15')],
  'Ferry + Traslado': () => [services.ferry(), services.traslado('2026-11-15')],
  'Hotel + Tour + Traslado': () => [services.traslado(), services.hotel(), services.tour()],
  'Varios ferris': () => [services.ferry('2026-11-15'), services.ferry('2026-11-18')],
  'Varios vuelos': () => [services.vuelo(), services.vuelo()],
  'Tours + Traslados (sin vuelo ni hotel)': () => [services.traslado(), services.tour(), services.tour('2026-11-13'), services.traslado('2026-11-14')],
  'Cuatro tipos distintos, empezando por un seguro': () => [services.seguro(), services.vuelo(), services.hotel(), services.ferry(), services.traslado('2026-11-15')],
};

function build(components, mostrarPrecios) {
  const items = [
    ...components.map((component, index) => ({ descripcion: d.componentTitle(component), tipo: d.packageServiceItemTypes[component.tipo], cantidad: 2, precio_unitario: 100 + index * 10.25 })),
    { descripcion: 'Descuento de paquete', tipo: 'Descuento', cantidad: 1, precio_unitario: 15.5 },
  ];
  const condiciones = d.termsTemplates.combinado;
  const details = d.sanitizeDetails({
    pasajeros: { adultos: 2 }, condiciones, aprobacionCondiciones: { huella: d.termsFingerprint(condiciones), por: 'x', en: now.toISOString() },
    validez: { venceEn: expiry, zona: 'America/Tegucigalpa' },
    paquete: { nombre: 'Paquete de prueba', mostrarPrecios, componentes: components, lineas: [...components.map(component => component.id), ''] },
  });
  const quotation = { id: '00000000-0000-4000-8000-000000000009', codigo: 'COT-20261012-AB12', customer_id: null, cliente_nombre: 'Cliente de prueba', cliente_email: 'cliente@example.com', cliente_telefono: null, destino: 'Destino de prueba', moneda: 'USD', validez: '2026-10-13', notas: null, total: 0, estado: 'borrador', agente_id: 'a', created_at: now.toISOString(), tipo: 'combinado', detalles: details, vence_en: expiry, version: 0 };
  return data.toRecord(quotation, items.map((item, orden) => ({ ...item, orden })), true);
}

for (const [name, make] of Object.entries(combinations)) {
  test(`combination: ${name}`, async () => {
    const components = make();
    const record = build(components, true);
    // Kept exactly as built: same order, types and data (what a sent version freezes).
    assert.deepEqual(plain(record.details.paquete.componentes.map(component => component.tipo)), components.map(component => component.tipo));
    assert.deepEqual(plain(record.details.paquete.componentes), plain(components));
    // Sendable: no service type is required.
    const blocking = record.details && d.quotationReadiness('combinado', record.details, record.items, now).filter(issue => issue.nivel === 'error');
    assert.deepEqual(plain(blocking), []);
    // Each service has its own price; with the package discount the parts add up to the total.
    const perService = components.map(component => d.componentAmount(record.items, record.details.paquete.lineas, component.id));
    assert.ok(perService.every(amount => amount > 0));
    const summary = d.pricingSummary(record.items, record.details);
    assert.equal(Math.round((perService.reduce((sum, amount) => sum + amount, 0) - 15.5) * 100), Math.round(summary.total * 100));
    // One real PDF, itemized and package-total.
    for (const mode of [true, false]) {
      const buffer = await pdf.renderQuotationPdf(build(components, mode), { now });
      assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
      assert.ok(pdf.pdfPageCount(buffer) >= 1 && pdf.pdfPageCount(buffer) <= 4, `${name}: ${pdf.pdfPageCount(buffer)} pages`);
    }
  });
}

test('the service-type registry drives every type; each new component holds exactly its own data', () => {
  const structures = ['vuelo', 'hotel', 'ferry', 'servicio'];
  for (const kind of d.packageServiceKinds) {
    const definition = d.packageServiceTypes[kind];
    assert.ok(definition.label && definition.descripcion, kind);
    assert.ok(structures.includes(definition.data), kind);
    assert.ok(d.itemTypes.includes(definition.itemType), `${kind} suggests an unknown price-line type`);
    const component = d.emptyComponent(kind);
    assert.deepEqual(structures.filter(key => component[key] !== null), [definition.data], kind);
    assert.equal(d.packageServiceLabels[kind], definition.label);
    const saved = d.sanitizeDetails({ paquete: { componentes: [component] } }).paquete.componentes[0];
    assert.equal(saved.tipo, kind);
  }
});

test('services can be added, duplicated, reordered and removed while the package stays valid', () => {
  let list = [services.hotel()];
  list = [...list, services.ferry(), services.traslado('2026-11-15')];
  list.splice(1, 0, d.duplicateComponent(list[0]));
  assert.deepEqual(list.map(component => component.tipo), ['hotel', 'hotel', 'ferry', 'traslado']);
  [list[2], list[3]] = [list[3], list[2]];
  list = list.filter(component => component.tipo !== 'hotel' || component.id === list[0].id);
  const record = build(list.map(component => component.hotel ? { ...component, hotel: { ...component.hotel, inclusionesConfirmadas: true } } : component), false);
  assert.deepEqual(plain(record.details.paquete.componentes.map(component => component.tipo)), ['hotel', 'traslado', 'ferry']);
  assert.equal(new Set(record.details.paquete.componentes.map(component => component.id)).size, 3);
  assert.deepEqual(plain(d.quotationReadiness('combinado', record.details, record.items, now).filter(issue => issue.nivel === 'error')), []);
});

test('hotels are checked against the package flights (warnings only)', () => {
  const flight = services.vuelo();
  const journeys = flight.vuelo.vuelos.journeys;
  const arrival = journeys[0].segmentos.at(-1).llegadaFecha;
  const homeward = journeys.at(-1).segmentos[0].salidaFecha;
  const day = (iso, delta) => new Date(Date.parse(`${iso}T12:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);
  const check = (checkIn, checkOut) => {
    const details = { ...d.defaultDetails('combinado'), paquete: { ...d.emptyPackage(), componentes: [flight, services.hotel('Hotel de prueba', checkIn, checkOut)] } };
    return d.quotationReadiness('combinado', details, [{ descripcion: 'Paquete', tipo: 'Paquete', cantidad: 1, precio_unitario: 100 }], now).filter(issue => issue.seccion === 'paquete');
  };
  assert.deepEqual(plain(check(arrival, homeward)), [], 'a stay matching the flights raises nothing');
  const early = check(day(arrival, -1), homeward);
  assert.equal(early.length, 1); assert.equal(early[0].nivel, 'aviso'); assert.match(early[0].mensaje, /antes de la llegada del vuelo/);
  assert.match(check(day(arrival, 1), homeward)[0].mensaje, /primera noche/);
  assert.match(check(arrival, day(homeward, 1))[0].mensaje, /después del vuelo de regreso/);
});
