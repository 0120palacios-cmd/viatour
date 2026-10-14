import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details as detailsModule } from './pdf-support.mjs';
import { load } from './security-support.mjs';

// Catalog server actions with an in-memory client. Admin access is enforced by adminSession() here and by
// RLS in the database (verified separately with scripts/test-quotations-v6-migration.mjs).
const catalog = load('src/lib/catalog.ts', { '@/lib/quotation-details': detailsModule }, { crypto });
const types = load('src/lib/quotation-types.ts');
const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
const json = value => JSON.parse(JSON.stringify(value));

function fakeClient({ error = null, staleUpdates = false } = {}) {
  const tables = { hotel_catalog: [], airline_catalog: [], airline_fare_presets: [] };
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
    '@/lib/catalog': catalog, '@/lib/quotation-details': detailsModule, '@/lib/quotation-validation': validation,
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
