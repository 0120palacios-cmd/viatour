import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details as detailsModule } from './pdf-support.mjs';
import { load } from './security-support.mjs';

// V7 service catalog: records are sanitized per type and a quotation always receives a copy whose
// inclusions and conditions must be confirmed again.
const catalog = load('src/lib/catalog.ts', { '@/lib/quotation-details': detailsModule }, { crypto });
const services = load('src/lib/service-catalog.ts', { '@/lib/quotation-details': detailsModule, '@/lib/catalog': catalog }, { crypto });
const plain = value => JSON.parse(JSON.stringify(value));

const tour = () => services.sanitizeServiceEntry({ id: '7f4c1a52-1111-4a5b-9c3d-000000000001', tipo: 'tour', nombre: 'Snorkel en West End', operador: 'Operador local', destino: 'Roatán', descripcion: 'Tour de snorkel en el arrecife', lugar: 'Muelle de West End', duracion: '3 horas', modalidad: 'compartido', inclusiones: [{ nombre: 'Equipo', estado: 'incluido' }, { nombre: 'Propinas', estado: 'no_incluido' }], cancelacion: '24 horas antes', notasInternas: 'Neto confidencial', embarque: 'no aplica' });

test('records keep only the fields of their type; unknown types become "otro"', () => {
  const entry = tour();
  assert.equal(entry.embarque, '', 'ferry fields are dropped for a tour');
  const ferry = services.sanitizeServiceEntry({ tipo: 'ferry', nombre: 'Galaxy Wave', lugar: 'Muelle', duracion: '1 hora', modalidad: 'privado', embarque: '45 minutos antes' });
  assert.deepEqual([ferry.lugar, ferry.duracion, ferry.modalidad, ferry.embarque], ['', '', '', '45 minutos antes']);
  assert.equal(services.sanitizeServiceEntry({ tipo: 'crucero', nombre: 'X' }).tipo, 'otro');
  assert.equal(services.sanitizeServiceEntry({ tipo: 'tour', modalidad: 'vip' }).modalidad, '');
});

test('rows round-trip and the editor never receives internal notes', () => {
  const entry = tour();
  const back = services.serviceEntryFromRow({ ...services.serviceEntryToRow(entry), id: entry.id, updated_at: '2026-10-15T10:00:00Z' });
  assert.equal(back.nombre, entry.nombre);
  assert.equal(back.notasInternas, 'Neto confidencial');
  assert.equal(services.serviceForEditor(back).notasInternas, '');
});

test("applying a service copies reusable data, keeps the advisor's dates and asks to confirm inclusions", () => {
  const current = { descripcion: '', operador: '', fecha: '2026-11-11', hora: '08:00', fechaFin: '', lugar: 'Lobby del hotel', duracion: '', modalidad: '', inclusiones: [], inclusionesConfirmadas: true, cancelacion: '' };
  const source = tour();
  const next = services.applyCatalogService(current, source);
  assert.equal(next.descripcion, 'Tour de snorkel en el arrecife');
  assert.equal(next.fecha, '2026-11-11');
  assert.equal(next.hora, '08:00');
  assert.equal(next.lugar, 'Muelle de West End');
  assert.equal(next.inclusionesConfirmadas, false);
  assert.equal(next.inclusiones.length, 2);
  // Copies get new ids: editing them never touches the catalog record.
  assert.notEqual(next.inclusiones[0].id, source.inclusiones[0].id);
});

test('applying a shipping line fills conditions and empty operators, keeps legs, and unconfirms', () => {
  const line = services.sanitizeServiceEntry({ tipo: 'ferry', nombre: 'Galaxy Wave', operador: 'Naviera de prueba', equipajeIncluido: '1 maleta', cambios: 'Con cargo', embarque: '45 minutos antes', documentos: 'Pasaporte' });
  const ferry = { legs: [{ id: 'a', tipo: 'ida', operador: '', origenPuerto: 'La Ceiba', destinoPuerto: 'Roatán' }, { id: 'b', tipo: 'regreso', operador: 'Otra naviera', origenPuerto: 'Roatán', destinoPuerto: 'La Ceiba' }], equipajeIncluido: '', equipajeAdicional: 'Con cargo', inclusiones: [], inclusionesConfirmadas: true, cambios: '', cancelacion: 'Propia', embarque: '', documentos: '', confirmado: true };
  const next = services.applyCatalogFerry(ferry, line);
  assert.deepEqual(plain(next.legs.map(leg => leg.operador)), ['Naviera de prueba', 'Otra naviera']);
  assert.deepEqual(plain(next.legs.map(leg => leg.origenPuerto)), ['La Ceiba', 'Roatán']);
  assert.equal(next.equipajeIncluido, '1 maleta');
  assert.equal(next.equipajeAdicional, 'Con cargo', "an empty catalog field keeps the advisor's text");
  assert.equal(next.cancelacion, 'Propia');
  assert.equal(next.confirmado, false);
  assert.equal(next.inclusionesConfirmadas, false);
});

test('search ignores accents and case across name, operator and destination', () => {
  const entry = tour();
  assert.equal(services.serviceMatches(entry, 'roatan'), true);
  assert.equal(services.serviceMatches(entry, 'SNORKEL operador'), true);
  assert.equal(services.serviceMatches(entry, 'cancún'), false);
  assert.equal(services.serviceMatches(entry, '  '), true);
});
