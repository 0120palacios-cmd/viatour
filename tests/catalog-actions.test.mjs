import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details as detailsModule } from './pdf-support.mjs';
import { load } from './security-support.mjs';

// Catalog server actions with an in-memory client. Admin access is enforced by adminSession() here and by
// RLS in the database (verified separately with scripts/test-quotations-v6-migration.mjs).
const catalog = load('src/lib/catalog.ts', { '@/lib/quotation-details': detailsModule }, { crypto });
const types = load('src/lib/quotation-types.ts');
const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
const serviceCatalog = load('src/lib/service-catalog.ts', { '@/lib/quotation-details': detailsModule, '@/lib/catalog': catalog }, { crypto });
const json = value => JSON.parse(JSON.stringify(value));

function fakeClient({ error = null, staleUpdates = false } = {}) {
  const tables = { hotel_catalog: [], airline_catalog: [], airline_fare_presets: [], service_catalog: [] };
  let counter = 0;
  const from = table => {
    const state = { op: 'select', values: null, filters: [] };
    const run = () => {
      if (error) return { data: null, error };
      if (state.op === 'insert') { const row = { id: `7f4c1a52-1111-4a5b-9c3d-${String(++counter).padStart(12, '0')}`, updated_at: `2026-10-14T10:00:0${counter}Z`, ...state.values }; tables[table].push(row); return { data: row, error: null }; }
      const rows = tables[table].filter(row => state.filters.every(([key, value]) => row[key] === value));
      if (state.op === 'update') { if (staleUpdates) return { data: null, error: null }; for (const row of rows) Object.assign(row, state.values, { updated_at: '2026-10-14T11:00:00Z' }); return { data: rows[0] ?? null, error: null }; }
      return { data: rows[0] ?? null, error: null };
    };
    const api = {
      select() { return api; }, eq(key, value) { state.filters.push([key, value]); return api; },
      insert(values) { state.op = 'insert'; state.values = values; return api; }, update(values) { state.op = 'update'; state.values = values; return api; },
      async single() { const result = run(); return result.data || result.error ? result : { data: null, error: { code: 'PGRST116' } }; }, async maybeSingle() { return run(); },
    };
    return api;
  };
  return { tables, client: { from } };
}

function catalogActions(db, admin = true) {
  return load('src/app/admin/catalogos/actions.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/admin': { adminSession: async () => admin ? { client: db.client, user: { id: 'agent-1' } } : null },
    '@/lib/catalog': catalog, '@/lib/quotation-details': detailsModule, '@/lib/quotation-validation': validation, '@/lib/service-catalog': serviceCatalog,
  });
}

test('catalog writes require an administrator session and keep the form open when it expired', async () => {
  const db = fakeClient();
  const result = await catalogActions(db, false).saveHotelEntry(JSON.stringify({ nombre: 'Hotel', ciudad: 'Lima' }));
  assert.match(result.error, /sesión venció/);
  assert.equal(db.tables.hotel_catalog.length, 0);
});

test('a hotel is created with sanitized values only (no unknown columns, no unsafe links)', async () => {
  const db = fakeClient();
  const result = await catalogActions(db).saveHotelEntry(JSON.stringify({ nombre: ' Hotel de prueba ', ciudad: 'Cancún', sitioWeb: 'javascript:alert(1)', creado_por: 'otro', precio: 99, fotos: [{ path: '../secreto.jpg' }] }));
  assert.equal(result.success, 'Hotel agregado al catálogo.');
  const [row] = db.tables.hotel_catalog;
  assert.equal(row.nombre, 'Hotel de prueba');
  assert.equal(row.sitio_web, null);
  assert.deepEqual(json(row.fotos), []);
  assert.equal('creado_por' in row || 'precio' in row, false);
});

test('validation errors and malformed payloads are reported without writing', async () => {
  const db = fakeClient();
  const api = catalogActions(db);
  assert.match((await api.saveHotelEntry(JSON.stringify({ nombre: '' }))).error, /nombre del hotel/);
  assert.match((await api.saveHotelEntry('{no json')).error, /inválidos/);
  assert.match((await api.saveAirlineEntry(JSON.stringify({ nombre: 'X', iata: 'AAA' }))).error, /IATA/);
  assert.match((await api.saveFarePreset(JSON.stringify({ nombre: 'Main Cabin' }))).error, /pertenecer a una aerolínea/);
  assert.equal(db.tables.hotel_catalog.length + db.tables.airline_catalog.length + db.tables.airline_fare_presets.length, 0);
});

test('a stale edit is a conflict instead of overwriting another admin\'s changes', async () => {
  const db = fakeClient({ staleUpdates: true });
  db.tables.hotel_catalog.push({ id: '7f4c1a52-1111-4a5b-9c3d-000000000099', nombre: 'H', updated_at: '2026-10-14T09:00:00Z' });
  const result = await catalogActions(db).saveHotelEntry(JSON.stringify({ id: '7f4c1a52-1111-4a5b-9c3d-000000000099', nombre: 'H2', ciudad: 'Lima', updatedAt: '2026-10-14T08:00:00Z' }));
  assert.equal(result.conflict, true);
  assert.equal(db.tables.hotel_catalog[0].nombre, 'H');
});

test('duplicates and a missing schema get clear messages', async () => {
  assert.match((await catalogActions(fakeClient({ error: { code: '23505' } })).saveAirlineEntry(JSON.stringify({ nombre: 'American Airlines', iata: 'AA' }))).error, /Ya existe/);
  assert.match((await catalogActions(fakeClient({ error: { code: 'PGRST205' } })).saveHotelEntry(JSON.stringify({ nombre: 'H', ciudad: 'Lima' }))).error, /quotations_v6\.sql/);
});

test('saving a quotation hotel to the catalog copies only reusable data', async () => {
  const db = fakeClient();
  const stay = { ...detailsModule.emptyHotel('h1'), nombre: 'Hotel West End', destino: 'Roatán', checkIn: '2026-12-18', checkOut: '2026-12-20', inclusiones: [{ id: 'i', nombre: 'Desayuno', estado: 'incluido', detalle: '' }] };
  const result = await catalogActions(db).saveHotelFromQuotation(JSON.stringify(stay));
  assert.match(result.success, /catálogo/);
  const [row] = db.tables.hotel_catalog;
  assert.equal(row.nombre, 'Hotel West End');
  assert.equal(row.destino, 'Roatán');
  assert.ok(!JSON.stringify(row).includes('2026-12-18'));
  assert.equal(json(row.inclusiones)[0].estado, 'incluido');
});

test('a fare preset is stored for its airline with its baggage', async () => {
  const db = fakeClient();
  const airline = await catalogActions(db).saveAirlineEntry(JSON.stringify({ nombre: 'American Airlines', iata: 'aa' }));
  assert.equal(db.tables.airline_catalog[0].iata, 'AA');
  const preset = await catalogActions(db).saveFarePreset(JSON.stringify({ airlineId: airline.id, nombre: 'Main Cabin', equipaje: { documentado: { estado: 'con_cargo', peso: '23 kg' } }, verificadoEn: '2026-10-01' }));
  assert.equal(preset.success, 'Tarifa agregada.');
  const [row] = db.tables.airline_fare_presets;
  assert.equal(row.airline_id, airline.id);
  assert.equal(row.equipaje.documentado.estado, 'con_cargo');
  assert.equal(row.verificado_en, '2026-10-01');
});

// ----- V7 service catalog -----

test('a service is created, edited with a concurrency check, and deactivated', async () => {
  const db = fakeClient();
  const api = catalogActions(db);
  const created = await api.saveServiceEntry(JSON.stringify({ tipo: 'tour', nombre: 'Snorkel en West End', operador: 'Operador local', destino: 'Roatán', modalidad: 'compartido', inclusiones: [{ nombre: 'Equipo', estado: 'incluido' }], equipajeIncluido: 'no aplica a tours' }));
  assert.match(created.success, /agregado/);
  const row = db.tables.service_catalog[0];
  assert.equal(row.tipo, 'tour');
  assert.equal(row.equipaje_incluido, null, 'ferry-only fields are dropped for other types');
  assert.equal(row.inclusiones.length, 1);
  const edited = await api.saveServiceEntry(JSON.stringify({ id: created.id, updatedAt: created.updatedAt, tipo: 'tour', nombre: 'Snorkel en West End', duracion: '3 horas' }));
  assert.match(edited.success, /guardado/);
  assert.equal(db.tables.service_catalog[0].duracion, '3 horas');
  assert.match((await api.setServiceActive(created.id, false)).success, /desactivado/);
  assert.equal(db.tables.service_catalog[0].activo, false);
});

test('service writes reject unknown types, empty names, expired sessions and stale edits', async () => {
  const db = fakeClient();
  assert.match((await catalogActions(db).saveServiceEntry(JSON.stringify({ tipo: 'crucero', nombre: 'X' }))).error, /inválidos/);
  assert.match((await catalogActions(db).saveServiceEntry(JSON.stringify({ tipo: 'tour', nombre: '  ' }))).error, /nombre del servicio/);
  assert.match((await catalogActions(db, false).saveServiceEntry(JSON.stringify({ tipo: 'tour', nombre: 'X' }))).error, /sesión venció/);
  const stale = fakeClient({ staleUpdates: true });
  const result = await catalogActions(stale).saveServiceEntry(JSON.stringify({ id: '7f4c1a52-1111-4a5b-9c3d-000000000001', updatedAt: '2026-01-01T00:00:00Z', tipo: 'tour', nombre: 'X' }));
  assert.equal(result.conflict, true);
  assert.equal(stale.tables.service_catalog.length, 0);
});

test('service catalog errors explain the missing table and duplicates', async () => {
  const missing = await catalogActions(fakeClient({ error: { code: '42P01' } })).saveServiceEntry(JSON.stringify({ tipo: 'traslado', nombre: 'Aeropuerto – hotel' }));
  assert.match(missing.error, /service_catalog_v7\.sql/);
  const duplicate = await catalogActions(fakeClient({ error: { code: '23505' } })).saveServiceEntry(JSON.stringify({ tipo: 'traslado', nombre: 'Aeropuerto – hotel' }));
  assert.match(duplicate.error, /Ya existe un servicio/);
});

test('saving a service from a quotation keeps reusable data only (no dates)', async () => {
  const db = fakeClient();
  const component = { id: 'c1', tipo: 'traslado', titulo: 'Traslado de llegada', servicio: { descripcion: 'Aeropuerto de Cancún – hotel', operador: 'Transportes de prueba', fecha: '2026-11-10', hora: '14:30', lugar: 'Terminal 3', modalidad: 'privado', inclusiones: [{ nombre: 'Equipaje', estado: 'incluido' }], inclusionesConfirmadas: true, cancelacion: '24 horas' } };
  const result = await catalogActions(db).saveServiceFromQuotation(JSON.stringify(component));
  assert.match(result.success, /Guardado en el catálogo/);
  const row = db.tables.service_catalog[0];
  assert.equal(row.tipo, 'traslado');
  assert.equal(row.nombre, 'Traslado de llegada');
  assert.equal(row.modalidad, 'privado');
  assert.ok(!JSON.stringify(row).includes('2026-11-10') && !JSON.stringify(row).includes('14:30'), 'no dates or times reach the catalog');
});

test('saving a ferry from a quotation stores the shipping line conditions, not the legs', async () => {
  const db = fakeClient();
  const ferry = { legs: [{ tipo: 'ida', operador: 'Naviera de prueba', origenPuerto: 'La Ceiba', destinoPuerto: 'Roatán', salidaFecha: '2026-11-10', salidaHora: '09:30' }], equipajeIncluido: '1 maleta de 23 kg', cambios: 'Con cargo', embarque: '45 minutos antes', documentos: 'Identidad o pasaporte', inclusiones: [] };
  const result = await catalogActions(db).saveServiceFromQuotation(JSON.stringify({ tipo: 'ferry', titulo: 'Naviera de prueba', ferry }));
  assert.match(result.success, /Guardado/);
  const row = db.tables.service_catalog[0];
  assert.deepEqual({ tipo: row.tipo, nombre: row.nombre, operador: row.operador, equipaje: row.equipaje_incluido, embarque: row.embarque }, { tipo: 'ferry', nombre: 'Naviera de prueba', operador: 'Naviera de prueba', equipaje: '1 maleta de 23 kg', embarque: '45 minutos antes' });
  assert.ok(!JSON.stringify(row).includes('La Ceiba'), 'legs and ports stay in the quotation');
});
