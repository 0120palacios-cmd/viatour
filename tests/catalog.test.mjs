import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details as detailsModule } from './pdf-support.mjs';
import { load } from './security-support.mjs';

// V6 catalogs: hotel, airline and fare-preset records are sanitized like quotation details, and a
// quotation always receives a copy (a later catalog edit never reaches it).
const catalog = load('src/lib/catalog.ts', { '@/lib/quotation-details': detailsModule }, { crypto });
const plain = value => JSON.parse(JSON.stringify(value));
const photo = 'hotel/0123456789abcdef0123456789abcdef.jpg';

const hotelEntry = () => catalog.sanitizeHotelEntry({
  id: '7f4c1a52-1111-4a5b-9c3d-000000000001', nombre: 'Hotel de prueba Riviera', cadena: 'Cadena de prueba', pais: 'México', ciudad: 'Cancún', direccion: 'Blvd. Kukulcán km 12.5',
  estrellas: 5, fotos: [{ path: photo, leyenda: 'Vista' }, { path: 'https://example.com/x.jpg' }], amenidades: ['Piscina', 'Spa', 'Piscina'],
  habitaciones: [{ categoria: 'Deluxe vista al mar', camas: '1 king' }, { categoria: '' }], planes: ['Todo incluido'],
  inclusiones: [{ nombre: 'Todo incluido', estado: 'incluido' }, { nombre: 'Propinas', estado: 'no_incluido' }, { nombre: 'Spa', estado: '' }],
  checkIn: '15:00', checkOut: '12:00', politicas: 'Edad mínima 18 años para registrarse.', cancelacion: 'Sin cargo hasta 7 días antes.', impuestos: 'incluidos',
  sitioWeb: 'javascript:alert(1)', email: 'no-es-correo', notasInternas: 'Contrato 2026, neto confidencial',
});

test('hotel records are sanitized: invalid photos, URLs, e-mails and empty rooms are dropped', () => {
  const entry = hotelEntry();
  assert.deepEqual(plain(entry.fotos.map(item => item.path)), [photo]);
  assert.deepEqual(plain(entry.amenidades), ['Piscina', 'Spa']);
  assert.equal(entry.habitaciones.length, 1);
  assert.equal(entry.sitioWeb, '');
  assert.equal(entry.email, '');
  assert.equal(entry.estrellas, 5);
  assert.equal(catalog.sanitizeHotelEntry({ estrellas: 9 }).estrellas, null);
  assert.deepEqual(plain(catalog.hotelEntryErrors(catalog.sanitizeHotelEntry({}))), ['Indique el nombre del hotel.', 'Indique la ciudad o el destino del hotel.']);
  assert.deepEqual(plain(catalog.hotelEntryErrors(entry)), []);
});

test('a hotel row round-trips between the database shape and the entry', () => {
  const entry = hotelEntry();
  const row = { ...catalog.hotelEntryToRow(entry), id: entry.id, check_in: '15:00:00', check_out: '12:00:00', updated_at: '2026-10-14T10:00:00Z' };
  const back = catalog.hotelEntryFromRow(row);
  assert.equal(back.checkIn, '15:00');
  assert.deepEqual(plain({ ...back, updatedAt: '' }), plain({ ...entry, updatedAt: '' }));
});

test('filling a quotation hotel from the catalog copies reusable data and asks to confirm inclusions', () => {
  const entry = hotelEntry();
  const stay = { ...detailsModule.emptyHotel('h1'), checkIn: '2026-12-19', checkOut: '2026-12-26', habitaciones: [{ id: 'r1', categoria: '', camas: '', cantidad: 1, adultos: 2, ninos: 1, edadesNinos: '8' }] };
  const filled = catalog.applyCatalogHotel(stay, entry);
  assert.equal(filled.catalogoId, entry.id);
  assert.equal(filled.nombre, 'Hotel de prueba Riviera');
  assert.equal(filled.destino, 'Cancún, México');
  assert.deepEqual([filled.checkIn, filled.checkOut], ['2026-12-19', '2026-12-26'], 'dates are the advisor\'s');
  assert.deepEqual(plain(filled.habitaciones), plain(stay.habitaciones), 'occupancy is the advisor\'s');
  assert.equal(filled.planComidas, 'Todo incluido');
  assert.equal(filled.inclusionesConfirmadas, false);
  assert.deepEqual(plain(filled.inclusiones.map(item => [item.nombre, item.estado])), [['Todo incluido', 'incluido'], ['Propinas', 'no_incluido'], ['Spa', '']]);
  assert.equal(filled.amenidades, '', 'facilities are never copied as included services');
  assert.match(filled.condiciones, /Entrada a partir de las 15:00\. Salida hasta las 12:00\. Edad mínima/);
  assert.ok(!JSON.stringify(filled).includes('neto confidencial'), 'internal notes never reach a quotation');
  // A snapshot: changing the catalog record afterwards does not change the quotation.
  entry.inclusiones[0].estado = 'no_incluido';
  entry.fotos.push({ path: 'hotel/ffffffffffffffffffffffffffffffff.jpg', leyenda: '', ancho: 0, alto: 0 });
  entry.nombre = 'Nombre cambiado';
  assert.equal(filled.inclusiones[0].estado, 'incluido');
  assert.equal(filled.fotos.length, 1);
  assert.equal(filled.nombre, 'Hotel de prueba Riviera');
  // The advisor can still edit the copy for this quotation only.
  const edited = { ...filled, inclusiones: filled.inclusiones.map(item => item.nombre === 'Spa' ? { ...item, estado: 'con_cargo' } : item), inclusionesConfirmadas: true };
  assert.equal(detailsModule.sanitizeDetails({ hoteles: [edited] }).hoteles[0].inclusiones[2].estado, 'con_cargo');
  assert.equal(detailsModule.sanitizeDetails({ hoteles: [edited] }).hoteles[0].catalogoId, entry.id);
});

test('a hotel typed in a quotation can become a catalog record without dates or occupancy', () => {
  const stay = { ...detailsModule.emptyHotel('h1'), nombre: 'Hotel nuevo', destino: 'Roatán', checkIn: '2026-12-18', checkOut: '2026-12-20', planComidas: 'Desayuno incluido', fotos: [{ path: photo, leyenda: '', ancho: 1, alto: 1 }],
    habitaciones: [{ id: 'r', categoria: 'Estándar', camas: '1 king', cantidad: 2, adultos: 2, ninos: 0, edadesNinos: '' }, { id: 's', categoria: 'estándar', camas: '', cantidad: 1, adultos: 1, ninos: 0, edadesNinos: '' }] };
  const entry = catalog.catalogEntryFromStay(stay);
  assert.equal(entry.nombre, 'Hotel nuevo');
  assert.deepEqual(plain(entry.habitaciones.map(room => room.categoria)), ['Estándar']);
  assert.deepEqual(plain(entry.planes), ['Desayuno incluido']);
  assert.ok(!JSON.stringify(entry).includes('2026-12-18'));
});

test('airlines: IATA and ICAO codes are validated; presets belong to an airline', () => {
  const entry = catalog.sanitizeAirlineEntry({ nombre: 'American Airlines', iata: 'aa', icao: 'aal' });
  assert.deepEqual([entry.iata, entry.icao], ['AA', 'AAL']);
  const bad = { nombre: 'X', iata: 'AAA', icao: 'A1' };
  assert.equal(catalog.airlineEntryErrors(catalog.sanitizeAirlineEntry(bad), bad).length, 2);
  assert.deepEqual(plain(catalog.presetErrors(catalog.sanitizePreset({}))), ['Indique el nombre de la tarifa, por ejemplo Main Cabin.', 'La tarifa debe pertenecer a una aerolínea.']);
});

test('a fare preset is applied as an editable copy; baggage stays to be confirmed', () => {
  const airline = { nombre: 'American Airlines' };
  const preset = catalog.sanitizePreset({
    id: '7f4c1a52-1111-4a5b-9c3d-0000000000aa', airlineId: '7f4c1a52-1111-4a5b-9c3d-0000000000bb', nombre: 'Main Cabin', cabina: 'Económica', aplicaA: 'Honduras – Estados Unidos',
    equipaje: { personal: { estado: 'incluido', piezas: 1 }, mano: { estado: 'incluido', piezas: 1 }, documentado: { estado: 'con_cargo', peso: '23 kg' } },
    cambios: 'Permitidos con diferencia de tarifa', reembolso: 'no_reembolsable', restricciones: 'No transferible', otrasInclusiones: 'Bebidas sin alcohol', verificadoEn: '2026-10-01',
  });
  const fare = { ...detailsModule.emptyFare('f1'), alcance: 'Ida', claseReserva: 'V' };
  const { fare: applied, baggage } = catalog.applyPreset(fare, preset, airline);
  assert.deepEqual([applied.aerolinea, applied.cabina, applied.tipoTarifa, applied.alcance, applied.claseReserva], ['American Airlines', 'Económica', 'Main Cabin', 'Ida', 'V']);
  assert.equal(applied.plantilla, 'American Airlines · Main Cabin');
  assert.equal(applied.plantillaId, preset.id);
  assert.equal(applied.restricciones, 'No transferible\nBebidas sin alcohol');
  assert.deepEqual([baggage.personal.estado, baggage.documentado.estado, baggage.documentado.peso], ['incluido', 'con_cargo', '23 kg']);
  preset.equipaje.documentado.estado = 'incluido';
  preset.cambios = 'Cambiado';
  assert.equal(baggage.documentado.estado, 'con_cargo', 'later preset edits never reach the quotation');
  assert.equal(applied.cambios, 'Permitidos con diferencia de tarifa');
  const saved = detailsModule.sanitizeDetails({ tarifas: [applied] }).tarifas[0];
  assert.deepEqual([saved.plantilla, saved.plantillaId], [applied.plantilla, applied.plantillaId]);
});

test('catalog search ignores accents and case and needs every word', () => {
  const haystack = catalog.searchText('Hotel Ámbar', 'Cancún', 'México');
  assert.ok(catalog.matchesQuery(haystack, 'ambar cancun'));
  assert.ok(catalog.matchesQuery(haystack, 'MÉXICO'));
  assert.ok(!catalog.matchesQuery(haystack, 'ambar roatan'));
  assert.ok(catalog.isMissingTable({ code: 'PGRST205' }) && catalog.isMissingTable({ code: '42P01' }) && !catalog.isMissingTable({ code: '23505' }));
});

test('the quotation editor never receives internal notes, supplier references or preset sources', () => {
  const hotel = catalog.hotelForEditor(hotelEntry());
  assert.equal(hotel.notasInternas, '');
  assert.equal(hotel.referenciaProveedor, '');
  assert.equal(hotel.nombre, 'Hotel de prueba Riviera');
  const airline = catalog.airlineForEditor(catalog.sanitizeAirlineEntry({ nombre: 'AA', notasInternas: 'contrato', presets: [{ nombre: 'Main', fuente: 'GDS interno' }] }));
  assert.deepEqual([airline.notasInternas, airline.presets[0].fuente, airline.presets[0].nombre], ['', '', 'Main']);
});
