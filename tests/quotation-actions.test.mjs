import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { load } from './security-support.mjs';
import { details as detailsModule, money, types } from './pdf-support.mjs';
import { samples } from './fixtures/quotation-samples.mjs';

// In-memory stand-in for the Supabase query builder, covering the calls the quotation actions make.
// Nothing here talks to a real database or sends e-mail.
function fakeDb(seed = {}, options = {}) {
  const tables = { customers: [], quotations: [], quotation_items: [], quotation_versions: [], leads: [], reservations: [], hotel_catalog: [], ...structuredClone(seed) };
  const log = [];
  let counter = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;
  function builder(table) {
    const state = { op: 'select', filters: [], values: null, limit: null, order: null };
    const rows = () => tables[table].filter(row => state.filters.every(([kind, key, value]) => {
      const actual = key.includes('->>') ? (row[key.split('->>')[0]] ?? {})[key.split('->>')[1]] : row[key];
      if (kind === 'ilike') return new RegExp(`^${value.split('%').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i').test(String(actual ?? ''));
      return kind === 'eq' ? actual === value : value.includes(actual);
    }));
    const missing = values => options.legacy && table === 'quotations' && values && ['tipo', 'detalles', 'vence_en', 'version', 'version_aceptada'].some(key => key in values);
    // Before docs/sql/quotations_v6.sql the tipo check rejects 'combinado' (Postgres check_violation).
    const packageTypeMissing = values => options.noPackageType && table === 'quotations' && values?.tipo === 'combinado';
    const run = () => {
      if ((state.op === 'insert' || state.op === 'update') && packageTypeMissing(state.values)) return { data: null, error: { code: '23514', message: 'new row for relation "quotations" violates check constraint "quotations_tipo_check"' } };
      if (state.op === 'insert') {
        if (missing(state.values)) return { data: null, error: { code: 'PGRST204' } };
        if (options.failItems && table === 'quotation_items') return { data: null, error: { code: 'X' } };
        const list = (Array.isArray(state.values) ? state.values : [state.values]).map(value => ({ id: uuid(), created_at: '2026-10-12T15:00:00Z', updated_at: '2026-10-12T15:00:00Z', ...value }));
        tables[table].push(...list);
        log.push({ table, op: 'insert', values: list });
        return { data: Array.isArray(state.values) ? list : list[0], error: null };
      }
      if (state.op === 'update') {
        if (missing(state.values)) return { data: null, error: { code: 'PGRST204' } };
        if (options.failVersionCounter && table === 'quotations' && Object.keys(state.values).join() === 'version') return { data: null, error: { code: 'X' } };
        const matched = rows();
        for (const row of matched) Object.assign(row, state.values);
        log.push({ table, op: 'update', values: state.values, count: matched.length });
        return { data: matched, error: null };
      }
      if (state.op === 'delete') {
        const matched = rows();
        tables[table] = tables[table].filter(row => !matched.includes(row));
        log.push({ table, op: 'delete', count: matched.length });
        return { data: matched, error: null };
      }
      const list = [...rows()];
      if (state.order) list.sort((a, b) => (a[state.order.key] > b[state.order.key] ? 1 : a[state.order.key] < b[state.order.key] ? -1 : 0) * (state.order.ascending === false ? -1 : 1));
      return { data: state.limit ? list.slice(0, state.limit) : list, error: null };
    };
    const api = {
      select() { return api; }, order(key, options = {}) { state.order = { key, ascending: options.ascending }; return api; },
      limit(value) { state.limit = value; return api; },
      eq(key, value) { state.filters.push(['eq', key, value]); return api; },
      in(key, value) { state.filters.push(['in', key, value]); return api; },
      ilike(key, value) { state.filters.push(['ilike', key, value]); return api; },
      insert(values) { state.op = 'insert'; state.values = values; return api; },
      update(values) { state.op = 'update'; state.values = values; return api; },
      delete() { state.op = 'delete'; return api; },
      async single() { const result = run(); const data = Array.isArray(result.data) ? result.data[0] : result.data; return result.error ? result : data ? { data, error: null } : { data: null, error: { code: 'PGRST116' } }; },
      async maybeSingle() { const result = run(); return result.error ? result : { data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: null }; },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    return api;
  }
  // replace_quotation_items: the whole replacement happens at once (one transaction in Postgres) and is
  // refused for accepted quotations, like the database trigger.
  async function rpc(name, args) {
    if (options.noRpc || options.legacy) return { data: null, error: { code: 'PGRST202' } };
    // RPC stand-in checks action wiring; scripts/test-commercial-recovery.mjs executes the real SQL.
    if (name === 'accept_quotation') {
      const q=tables.quotations.find(r=>r.id===args.p_id), v=tables.quotation_versions.find(r=>r.id===args.p_version_id && r.quotation_id===args.p_id);
      if(!q || !v || q.estado!=='enviada') return {data:null,error:{code:'23514',message:'Solo puede aceptar una cotización enviada.'}};
      q.estado='aceptada';q.version_aceptada=v.version;q.accepted_version_id=v.id;
      return {data:v.id,error:null};
    }
    if (name === 'convert_accepted_quotation') {
      const existing=tables.reservations.find(r=>r.quotation_id===args.p_id);if(existing)return {data:existing.id,error:null};
      const q=tables.quotations.find(r=>r.id===args.p_id),v=tables.quotation_versions.find(r=>r.id===args.p_version_id);
      if(!q || q.estado!=='aceptada' || q.accepted_version_id!==v?.id)return {data:null,error:{code:'23514'}};
      const r={...v.snapshot.quotation,id:uuid(),quotation_id:q.id,agente_id:q.agente_id,estado:'pendiente',prerreserva:args.p_prereservation,accepted_snapshot:v.snapshot};tables.reservations.push(r);
      tables.reservation_items.push(...v.snapshot.items.map(x=>({...x,id:uuid(),reservation_id:r.id})));return {data:r.id,error:null};
    }
    if(name==='create_reservation_invoice') {
      const r=tables.reservations.find(r=>r.id===args.p_id);const i={id:uuid(),reservation_id:r.id,total:r.total,items:tables.reservation_items.filter(x=>x.reservation_id===r.id)};tables.invoices.push(i);return {data:i.id,error:null};
    }
    assert.equal(name, 'replace_quotation_items');
    const quotation = tables.quotations.find(row => row.id === args.p_quotation_id);
    if (!quotation) return { data: null, error: { code: 'P0002' } };
    if (quotation.estado === 'aceptada') return { data: null, error: { code: '23514' } };
    tables.quotation_items = tables.quotation_items.filter(row => row.quotation_id !== args.p_quotation_id);
    tables.quotation_items.push(...args.p_items.map((item, orden) => ({ id: uuid(), quotation_id: args.p_quotation_id, ...item, orden })));
    quotation.total = money.totalAmount(args.p_items);
    log.push({ table: 'quotation_items', op: 'replace', count: args.p_items.length });
    return { data: quotation.total, error: null };
  }
  const files = options.files ?? [];
  const storage = { from: () => ({
    async list(_prefix, { limit, offset }) { return { data: files.slice(offset, offset + limit).map(file => ({ name: file.path.slice(6), created_at: file.created_at })), error: null }; },
    async remove(paths) {
      const text = JSON.stringify(tables.quotations) + JSON.stringify(tables.quotation_versions) + JSON.stringify(tables.hotel_catalog);
      const allowed = paths.filter(path => !text.includes(path) && Date.parse(files.find(file => file.path === path)?.created_at) < Date.now() - 7 * 86400000);
      for (const path of allowed) files.splice(files.findIndex(file => file.path === path), 1);
      return { data: allowed.map(name => ({ name })), error: null };
    },
  }) };
  return { tables, log, files, client: { from: builder, rpc, storage } };
}

const redirect = path => { throw new Error(`redirect:${path}`); };
const validation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
const payloadModule = load('src/lib/quotation-payload.ts', { '@/lib/quotation-details': detailsModule, '@/lib/quotation-types': types, '@/lib/quotation-validation': validation });

function actions(db, { admin = true, user = 'agent-1', fetch = async () => ({ ok: true }), env = { RESEND_API_KEY: 'test-only' }, rendered = [] } = {}) {
  const data = load('src/lib/quotation-data.ts', { 'server-only': {}, '@/lib/quotation-details': detailsModule });
  return load('src/app/admin/cotizaciones/actions.ts', {
    'node:crypto': crypto, 'next/navigation': { redirect }, 'next/cache': { revalidatePath() {} },
    '@/lib/commercial-errors': load('src/lib/commercial-errors.ts'), '@/lib/admin': { requireAdmin: async () => { if (!admin) throw new Error('denied'); return { client: db.client, user: { id: user } }; }, adminSession: async () => admin ? { client: db.client, user: { id: user } } : null },
    '@/lib/catalog': load('src/lib/catalog.ts', { '@/lib/quotation-details': detailsModule }, { crypto }), '@/lib/quotation-data': data, '@/lib/quotation-pdf': { renderQuotationPdf: async (record, options) => { rendered.push({ record, options }); return Buffer.from('%PDF-test'); }, quotationPdfFilename: () => 'cotizacion.pdf' },
    '@/lib/quotation-media': { loadQuotationPhotos: async () => new Map(), quotationMediaBucket: 'quotation-media' }, '@/lib/quotation-details': detailsModule, '@/lib/quotation-payload': payloadModule,
    '@/lib/quotation-validation': validation, '@/lib/quotation-types': types, '@/lib/money': money, '@/lib/notifications': { captureNotificationFailure() {} },
    '@/lib/site-config': { siteConfig: { supportEmail: 'soporte@miviatour.com' } }, '@/lib/lead-admin': { customerWhatsappHref: () => '' }, '@/lib/lead-validation': { normalizePhone: value => value },
    '@/app/admin/reservas/actions': { convertQuotationToReservation: async () => ({}) },
  }, { process: { env }, fetch });
}

function payload(overrides = {}) {
  const record = samples['vuelo-directo-ida-y-vuelta']();
  return {
    id: null, expectedUpdatedAt: null, leadId: null, customerId: null,
    cliente: { nombre: 'Ana Pérez', email: 'ana@example.com', telefono: '' }, tipo: 'vuelo', destino: 'Miami', moneda: 'USD', notas: '',
    // Validity relative to the real clock: the actions compare it with the current time.
    detalles: { ...record.details, validez: { ...record.details.validez, venceEn: new Date(Date.now() + 86400000).toISOString() }, refCreacion: 'token-abcdef123456', aprobacionCondiciones: { huella: detailsModule.termsFingerprint(record.details.condiciones), por: '', en: '' } },
    items: [{ descripcion: 'Tarifa aérea', tipo: 'Tarifa aérea', cantidad: '2', precio_unitario: '312.00' }, { descripcion: 'Promoción', tipo: 'Descuento', cantidad: '1', precio_unitario: '20' }],
    ...overrides,
  };
}

test('saving requires an administrator and an expired session keeps the editor open', async () => {
  const db = fakeDb();
  const api = actions(db, { admin: false });
  const result = await api.saveQuotation(JSON.stringify(payload()));
  assert.equal(result.sessionExpired, true);
  assert.match(result.error, /sesión venció/);
  assert.equal(db.log.length, 0);
  const form = new FormData(); form.set('id', '00000000-0000-4000-8000-000000000001');
  await assert.rejects(api.sendQuotation({}, form), /denied/);
  await assert.rejects(api.duplicateQuotation('00000000-0000-4000-8000-000000000001'), /denied/);
  await assert.rejects(api.updateQuotationStatus({}, form), /denied/);
});

test('a new flight draft stores structured details, items and the total with discounts', async () => {
  const db = fakeDb();
  const result = await actions(db).saveQuotation(JSON.stringify(payload()));
  assert.equal(result.success, 'Cotización guardada.');
  const [quotation] = db.tables.quotations;
  assert.equal(quotation.tipo, 'vuelo');
  assert.equal(quotation.estado, 'borrador');
  assert.match(quotation.codigo, /^COT-\d{8}-[0-9A-F]{4}$/);
  assert.equal(quotation.total, 604);
  assert.equal(quotation.detalles.vuelos.journeys.length, 2);
  assert.equal(quotation.vence_en, quotation.detalles.validez.venceEn);
  assert.equal(db.tables.customers.length, 1);
  assert.deepEqual(db.tables.quotation_items.map(item => [item.descripcion, item.precio_unitario]), [['Tarifa aérea', 312], ['Promoción', 20]]);
});

test('a retried create with the same token does not insert a second quotation', async () => {
  const db = fakeDb();
  const api = actions(db);
  const first = await api.saveQuotation(JSON.stringify(payload()));
  const second = await api.saveQuotation(JSON.stringify(payload()));
  assert.equal(first.quotationId, second.quotationId);
  assert.equal(db.tables.quotations.length, 1);
});

test('a draft without e-mail or prices can be saved; no customer is created yet', async () => {
  const db = fakeDb();
  const result = await actions(db).saveQuotation(JSON.stringify(payload({ cliente: { nombre: 'Cliente sin correo', email: '', telefono: '' }, items: [] })));
  assert.ok(result.quotationId);
  assert.equal(db.tables.customers.length, 0);
  assert.equal(db.tables.quotation_items.length, 0);
});

test('before the SQL is applied, editing inserts new items first and then removes the previous ones', async () => {
  const db = fakeDb({}, { noRpc: true });
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  const before = db.tables.quotation_items.map(item => item.id);
  const edited = await api.saveQuotation(JSON.stringify(payload({ id: created.quotationId, expectedUpdatedAt: created.updatedAt, items: [{ descripcion: 'Nueva tarifa', tipo: 'Tarifa aérea', cantidad: '1', precio_unitario: '500' }] })));
  assert.equal(edited.success, 'Cotización guardada.');
  assert.deepEqual(db.tables.quotation_items.map(item => item.descripcion), ['Nueva tarifa']);
  assert.ok(!db.tables.quotation_items.some(item => before.includes(item.id)));
  const operations = db.log.filter(entry => entry.table === 'quotation_items').map(entry => entry.op);
  assert.deepEqual(operations.slice(-2), ['insert', 'delete']);
});

test('a failed item insert keeps the previous prices', async () => {
  const db = fakeDb();
  const created = await actions(db).saveQuotation(JSON.stringify(payload()));
  const failing = actions(fakeDb(db.tables, { failItems: true, noRpc: true }));
  const result = await failing.saveQuotation(JSON.stringify(payload({ id: created.quotationId, expectedUpdatedAt: created.updatedAt })));
  assert.match(result.error, /no se pudieron guardar sus precios/);
});

test('a stale edit is rejected as a conflict instead of overwriting', async () => {
  const db = fakeDb();
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  await api.saveQuotation(JSON.stringify(payload({ id: created.quotationId, expectedUpdatedAt: created.updatedAt, destino: 'Orlando' })));
  const stale = await api.saveQuotation(JSON.stringify(payload({ id: created.quotationId, expectedUpdatedAt: created.updatedAt, destino: 'Cancún' })));
  assert.equal(stale.conflict, true);
  assert.equal(db.tables.quotations[0].destino, 'Orlando');
});

test('without the V5 columns, structured quotations explain the SQL and general ones still save', async () => {
  const db = fakeDb({}, { legacy: true });
  const api = actions(db);
  const flight = await api.saveQuotation(JSON.stringify(payload()));
  assert.match(flight.error, /quotations_v5\.sql/);
  const general = await api.saveQuotation(JSON.stringify(payload({ tipo: 'general', detalles: { ...detailsModule.defaultDetails('general'), refCreacion: 'token-general-123' } })));
  assert.ok(general.quotationId);
  assert.equal('tipo' in db.tables.quotations[0], false);
});

test('sending is blocked while the quotation is incomplete; nothing is e-mailed', async () => {
  const db = fakeDb();
  let calls = 0;
  const api = actions(db, { fetch: async () => { calls++; return { ok: true }; } });
  const unconfirmed = payload();
  unconfirmed.detalles = { ...unconfirmed.detalles, vuelos: { ...unconfirmed.detalles.vuelos, confirmado: false } };
  const created = await api.saveQuotation(JSON.stringify(unconfirmed));
  const form = new FormData(); form.set('id', created.quotationId);
  const result = await api.sendQuotation({}, form);
  assert.match(result.error, /Confirme el itinerario/);
  assert.equal(calls, 0);
  assert.equal(db.tables.quotation_versions.length, 0);
});

test('sending freezes a version, renders from it and marks the quotation sent', async () => {
  const db = fakeDb();
  const requests = [];
  const rendered = [];
  const api = actions(db, { rendered, fetch: async (url, init) => { requests.push({ url, init }); return { ok: true }; } });
  const secret = payload();
  secret.detalles = { ...secret.detalles, notasInternas: 'NOTA-INTERNA-COMISION-12%' };
  const created = await api.saveQuotation(JSON.stringify(secret));
  const form = new FormData(); form.set('id', created.quotationId);
  const result = await api.sendQuotation({}, form);
  assert.equal(result.success, 'Versión 1 enviada al correo del cliente.');
  assert.equal(db.tables.quotation_versions.length, 1);
  assert.equal(db.tables.quotation_versions[0].snapshot.quotation.version, 1);
  assert.equal(db.tables.quotations[0].estado, 'enviada');
  assert.equal(requests[0].init.headers['Idempotency-Key'], `quotation/${created.quotationId}/v1`);
  assert.equal(rendered[0].options.versionNumber, 1);
  const body = JSON.parse(requests[0].init.body);
  assert.ok(!JSON.stringify(body).includes('NOTA-INTERNA'));
});

test('an expired quotation cannot be sent', async () => {
  const db = fakeDb();
  const api = actions(db);
  const expired = payload();
  expired.detalles = { ...expired.detalles, validez: { ...expired.detalles.validez, venceEn: '2026-01-01T00:00:00.000Z' } };
  const created = await api.saveQuotation(JSON.stringify(expired));
  const form = new FormData(); form.set('id', created.quotationId);
  assert.match((await api.sendQuotation({}, form)).error, /validez ya venció/);
});

test('duplicating creates a new draft whose itinerary and baggage must be confirmed again', async () => {
  const db = fakeDb();
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  await assert.rejects(api.duplicateQuotation(created.quotationId), /redirect:\/admin\/cotizaciones\/.+\?duplicada=1/);
  assert.equal(db.tables.quotations.length, 2);
  const copy = db.tables.quotations[1];
  assert.notEqual(copy.codigo, db.tables.quotations[0].codigo);
  assert.equal(copy.estado, 'borrador');
  assert.equal(copy.detalles.vuelos.confirmado, false);
  assert.equal(copy.detalles.equipajeConfirmado, false);
  assert.equal(copy.detalles.validez.venceEn, '');
  assert.equal(db.tables.quotation_items.filter(item => item.quotation_id === copy.id).length, 2);
});

test('payload validation rejects oversized, malformed and inconsistent input', () => {
  const parse = value => payloadModule.parseQuotationPayload(value);
  assert.ok(parse('x'.repeat(payloadModule.maxPayloadBytes + 1)).error);
  assert.ok(parse('{not json').error);
  assert.ok(parse('[]').error);
  assert.match(parse(JSON.stringify(payload({ cliente: { nombre: '   ', email: '' } }))).error, /nombre del cliente/);
  assert.match(parse(JSON.stringify(payload({ cliente: { nombre: 'A', email: 'no-es-correo' } }))).error, /correo/);
  assert.match(parse(JSON.stringify(payload({ moneda: 'EUR' }))).error, /moneda/);
  assert.match(parse(JSON.stringify(payload({ items: [{ descripcion: 'X', tipo: 'Hotel', cantidad: '-1', precio_unitario: '5' }] }))).error, /concepto de precio 1/i);
  assert.match(parse(JSON.stringify(payload({ items: [{ descripcion: 'X', tipo: 'Hotel', cantidad: '1', precio_unitario: '1e9' }] }))).error, /concepto de precio 1/i);
  assert.ok(parse(JSON.stringify(payload({ id: 'not-a-uuid' }))).error);
  const ok = parse(JSON.stringify(payload({ cliente: { nombre: 'Ana\u0000 <b>Pérez</b>', email: 'ANA@EXAMPLE.COM', telefono: '' }, tipo: 'crucero' })));
  assert.equal(ok.payload.cliente.nombre, 'Ana  <b>Pérez</b>');
  assert.equal(ok.payload.cliente.email, 'ana@example.com');
  assert.equal(ok.payload.tipo, 'general');
});

test('a failed version counter update never blocks the next send', async () => {
  const db = fakeDb({}, { failVersionCounter: true });
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  const form = new FormData(); form.set('id', created.quotationId);
  assert.equal((await api.sendQuotation({}, form)).success, 'Versión 1 enviada al correo del cliente.');
  assert.ok(!db.tables.quotations[0].version, 'the counter update failed as simulated');
  assert.equal((await api.sendQuotation({}, form)).success, 'Versión 2 enviada al correo del cliente.');
  assert.deepEqual(db.tables.quotation_versions.map(row => row.version), [1, 2]);
});

test('a discounted quotation keeps the same total through reservation and invoice', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const api = actions(db);
  const items = [
    { descripcion: 'Tarifa aérea — Adulto', tipo: 'Tarifa aérea', cantidad: '2', precio_unitario: '489.00' },
    { descripcion: 'Impuestos y tasas', tipo: 'Impuestos y tasas', cantidad: '2', precio_unitario: '142.30' },
    { descripcion: 'Descuento de temporada', tipo: 'Descuento', cantidad: '1', precio_unitario: '50' },
  ];
  const created = await api.saveQuotation(JSON.stringify(payload({ items })));
  assert.equal(db.tables.quotations[0].total, 1212.6);
  await api.sendQuotation({}, form({ id: created.quotationId }));
  await api.updateQuotationStatus({}, form({ id: created.quotationId, estado: 'aceptada', version_id: db.tables.quotation_versions[0].id, confirmado: 'si' }));
  const reservationTypes = load('src/lib/reservation-types.ts');
  const reservationData = load('src/lib/reservation-data.ts', { 'server-only': {}, '@/lib/invoice-query': load('src/lib/invoice-query.ts') });
  const reservations = load('src/app/admin/reservas/actions.ts', {
    'node:crypto': crypto, 'next/navigation': { redirect }, 'next/cache': { revalidatePath() {} },
    '@/lib/commercial-errors': load('src/lib/commercial-errors.ts'), '@/lib/admin': { requireAdmin: async () => ({ client: db.client, user: { id: 'agent-1' } }) }, '@/lib/reservation-data': reservationData,
    '@/lib/reservation-types': reservationTypes, '@/lib/quotation-validation': validation, '@/lib/invoice-pdf': { renderInvoicePdf: async () => Buffer.from('') },
    '@/lib/site-config': { siteConfig: {} }, '@/lib/notifications': { captureNotificationFailure() {} }, '@/lib/lead-admin': { customerWhatsappHref: () => '' },
    '@/lib/lead-validation': { leadSegments: [], normalizePhone: value => value }, '@/lib/money': money, '@/lib/invoice-query': load('src/lib/invoice-query.ts'),
  });
  const convert = form({ quotation_id: created.quotationId, version_id: db.tables.quotations[0].accepted_version_id, confirmado: 'si', modo: 'reserva', apellido: 'Pérez' });
  await assert.rejects(reservations.convertQuotationToReservation({}, convert), /redirect:\/admin\/reservas\//);
  const [reservation] = db.tables.reservations;
  assert.equal(reservation.total, 1212.6);
  const copied = db.tables.reservation_items;
  assert.equal(copied.length, 3);
  assert.equal(money.totalAmount(copied), 1212.6);
  const invoice = new FormData(); invoice.set('reservation_id', reservation.id); invoice.set('fecha_vencimiento', '2026-10-20');
  assert.ok((await reservations.createInvoice({}, invoice)).success || db.tables.invoices.length === 1);
  assert.equal(db.tables.invoices[0].total, 1212.6);
  assert.equal(money.totalAmount(db.tables.invoices[0].items), 1212.6);
});

// ---- Hardening (2026-10-12) ----

function reservationActions(db, user = 'agent-1') {
  return load('src/app/admin/reservas/actions.ts', {
    'node:crypto': crypto, 'next/navigation': { redirect }, 'next/cache': { revalidatePath() {} },
    '@/lib/commercial-errors': load('src/lib/commercial-errors.ts'), '@/lib/admin': { requireAdmin: async () => ({ client: db.client, user: { id: user } }) }, '@/lib/reservation-data': load('src/lib/reservation-data.ts', { 'server-only': {}, '@/lib/invoice-query': load('src/lib/invoice-query.ts') }),
    '@/lib/reservation-types': load('src/lib/reservation-types.ts'), '@/lib/quotation-validation': validation, '@/lib/invoice-pdf': { renderInvoicePdf: async () => Buffer.from('') },
    '@/lib/site-config': { siteConfig: {} }, '@/lib/notifications': { captureNotificationFailure() {} }, '@/lib/lead-admin': { customerWhatsappHref: () => '' },
    '@/lib/lead-validation': { leadSegments: [], normalizePhone: value => value }, '@/lib/money': money, '@/lib/invoice-query': load('src/lib/invoice-query.ts'),
  });
}
const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
async function sentAndAccepted(db) {
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  await api.sendQuotation({}, form({ id: created.quotationId }));
  const accepted = await api.updateQuotationStatus({}, form({ id: created.quotationId, estado: 'aceptada', version_id: db.tables.quotation_versions.at(-1)?.id ?? '', confirmado: 'si' }));
  return { api, id: created.quotationId, accepted };
}

test('accepting records the sent version; the accepted quotation can no longer be edited or re-sent', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const { api, id, accepted } = await sentAndAccepted(db);
  assert.match(accepted.success, /Cotización aceptada/);
  assert.equal(db.tables.quotations[0].version_aceptada, 1);
  const before = JSON.stringify(db.tables.quotation_items);
  const edit = await api.saveQuotation(JSON.stringify(payload({ id, items: [{ descripcion: 'Otra tarifa', tipo: 'Tarifa aérea', cantidad: '1', precio_unitario: '1' }] })));
  assert.equal(edit.locked, true);
  assert.match(edit.error, /enmienda/);
  assert.equal(JSON.stringify(db.tables.quotation_items), before);
  assert.match((await api.sendQuotation({}, form({ id }))).error, /cree una enmienda/);
});

test('an amendment is a new draft that references the accepted quotation, which stays unchanged', async () => {
  const db = fakeDb();
  const { api, id } = await sentAndAccepted(db);
  const original = structuredClone(db.tables.quotations[0]);
  await assert.rejects(api.duplicateQuotation(id, 'enmienda'), /redirect:\/admin\/cotizaciones\/.+\?enmienda=1/);
  const amendment = db.tables.quotations[1];
  assert.equal(amendment.estado, 'borrador');
  assert.equal(amendment.detalles.enmiendaDe, original.codigo);
  assert.equal(amendment.detalles.aprobacionCondiciones, null);
  assert.deepEqual(JSON.parse(JSON.stringify(db.tables.quotations[0])), JSON.parse(JSON.stringify(original)));
});

test('the reservation is created from the accepted version, once, with the original advisor', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const { id } = await sentAndAccepted(db);
  // Even if live rows were altered behind the application, the accepted snapshot is what gets converted.
  db.tables.quotation_items.push({ id: 'stray', quotation_id: id, descripcion: 'Duplicado', tipo: 'Tarifa aérea', cantidad: 2, precio_unitario: 312, orden: 9 });
  const reservations = reservationActions(db, 'agent-2');
  await assert.rejects(reservations.convertQuotationToReservation({}, form({ quotation_id: id, version_id: db.tables.quotations[0].accepted_version_id, confirmado: 'si', modo: 'reserva', apellido: 'Pérez' })), /redirect:\/admin\/reservas\//);
  await assert.rejects(reservations.convertQuotationToReservation({}, form({ quotation_id: id, version_id: db.tables.quotations[0].accepted_version_id, confirmado: 'si', modo: 'reserva', apellido: 'Pérez' })), /redirect:\/admin\/reservas\//);
  assert.equal(db.tables.reservations.length, 1);
  assert.equal(db.tables.reservations[0].total, 604);
  assert.equal(db.tables.reservations[0].agente_id, 'agent-1');
  assert.deepEqual(db.tables.reservation_items.map(item => item.descripcion), ['Tarifa aérea', 'Promoción']);
});

test('a converted quotation cannot be moved out of "aceptada"', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const { api, id } = await sentAndAccepted(db);
  await assert.rejects(reservationActions(db).convertQuotationToReservation({}, form({ quotation_id: id, version_id: db.tables.quotations[0].accepted_version_id, confirmado: 'si', modo: 'reserva', apellido: 'Pérez' })), /redirect/);
  assert.match((await api.updateQuotationStatus({}, form({ id, estado: 'rechazada' }))).error, /requiere una enmienda/);
  assert.equal(db.tables.quotations[0].estado, 'aceptada');
});

test('prices are replaced in one atomic step once the SQL is applied', async () => {
  const db = fakeDb();
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  await api.saveQuotation(JSON.stringify(payload({ id: created.quotationId, expectedUpdatedAt: db.tables.quotations[0].updated_at, items: [{ descripcion: 'Nueva', tipo: 'Hotel', cantidad: '3', precio_unitario: '0.33' }] })));
  assert.match((await api.saveQuotation(JSON.stringify(payload({ id: created.quotationId, items: [{ descripcion: 'X', tipo: 'Hotel', cantidad: '1.5', precio_unitario: '1' }] })))).error, /número entero/);
  assert.deepEqual(db.log.filter(entry => entry.table === 'quotation_items').map(entry => entry.op), ['replace', 'replace']);
  assert.deepEqual(db.tables.quotation_items.map(item => item.descripcion), ['Nueva']);
  assert.equal(db.tables.quotations[0].total, 0.99);
});

test('editing never reassigns the advisor; only the explicit assignment does', async () => {
  const db = fakeDb();
  const created = await actions(db, { user: 'agent-1' }).saveQuotation(JSON.stringify(payload()));
  assert.equal(db.tables.quotations[0].agente_id, 'agent-1');
  const other = actions(db, { user: 'agent-2' });
  await other.saveQuotation(JSON.stringify(payload({ id: created.quotationId, destino: 'Orlando' })));
  assert.equal(db.tables.quotations[0].destino, 'Orlando');
  assert.equal(db.tables.quotations[0].agente_id, 'agent-1');
  assert.equal((await other.assignQuotationToMe({}, form({ id: created.quotationId }))).success, 'La cotización quedó asignada a usted.');
  assert.equal(db.tables.quotations[0].agente_id, 'agent-2');
});

test('a shared e-mail alone does not link the quotation to another customer', async () => {
  const db = fakeDb({ customers: [{ id: '00000000-0000-4000-8000-0000000000c1', nombre: 'María Pérez', email: 'familia@example.com' }] });
  const result = await actions(db).saveQuotation(JSON.stringify(payload({ cliente: { nombre: 'Ana Pérez', email: 'familia@example.com', telefono: '' } })));
  assert.equal(db.tables.quotations[0].customer_id, null);
  assert.deepEqual(JSON.parse(JSON.stringify(result.customerSuggestions)), [{ id: '00000000-0000-4000-8000-0000000000c1', nombre: 'María Pérez' }]);
  assert.equal(db.tables.customers.length, 1);
});

test('same e-mail and same name (ignoring accents and case) links the existing customer', async () => {
  const db = fakeDb({ customers: [{ id: '00000000-0000-4000-8000-0000000000c1', nombre: 'ANA  PEREZ', email: 'ana@example.com' }] });
  await actions(db).saveQuotation(JSON.stringify(payload()));
  assert.equal(db.tables.quotations[0].customer_id, '00000000-0000-4000-8000-0000000000c1');
});

test('an explicitly chosen customer must exist', async () => {
  const db = fakeDb();
  const result = await actions(db).saveQuotation(JSON.stringify(payload({ customerId: '00000000-0000-4000-8000-0000000000ff' })));
  assert.match(result.error, /ya no existe/);
  assert.equal(db.tables.quotations.length, 0);
});

test('conditions must be approved by an admin; the server records who and when', async () => {
  const db = fakeDb();
  const api = actions(db, { user: 'agent-7' });
  const unapproved = payload();
  unapproved.detalles = { ...unapproved.detalles, aprobacionCondiciones: null };
  const created = await api.saveQuotation(JSON.stringify(unapproved));
  assert.equal(db.tables.quotations[0].detalles.aprobacionCondiciones, null);
  assert.match((await api.sendQuotation({}, form({ id: created.quotationId }))).error, /apruebe las condiciones/);
  // The browser can only state the fingerprint; approver and date come from the session.
  const approved = payload({ id: created.quotationId });
  approved.detalles = { ...approved.detalles, aprobacionCondiciones: { ...approved.detalles.aprobacionCondiciones, por: 'someone-else', en: '2020-01-01T00:00:00.000Z' } };
  await api.saveQuotation(JSON.stringify(approved));
  const record = structuredClone(db.tables.quotations[0].detalles.aprobacionCondiciones);
  assert.equal(record.por, 'agent-7');
  assert.notEqual(record.en, '2020-01-01T00:00:00.000Z');
  // Re-saving the same text keeps the original approval; changing a clause removes it and blocks sending.
  await api.saveQuotation(JSON.stringify(approved));
  assert.deepEqual(structuredClone(db.tables.quotations[0].detalles.aprobacionCondiciones), record);
  const changed = payload({ id: created.quotationId });
  changed.detalles = { ...changed.detalles, condiciones: [...changed.detalles.condiciones.slice(0, -1), 'Texto distinto no aprobado.'] };
  await api.saveQuotation(JSON.stringify(changed));
  assert.equal(db.tables.quotations[0].detalles.aprobacionCondiciones, null);
  assert.match((await api.sendQuotation({}, form({ id: created.quotationId }))).error, /apruebe las condiciones/);
  assert.equal(db.tables.quotation_versions.length, 0);
});

test('the sent PDF uses exactly the approved saved conditions', async () => {
  const db = fakeDb();
  const rendered = [];
  const api = actions(db, { rendered });
  const created = await api.saveQuotation(JSON.stringify(payload()));
  await api.sendQuotation({}, form({ id: created.quotationId }));
  const expected = JSON.parse(JSON.stringify(payload().detalles.condiciones));
  assert.deepEqual(JSON.parse(JSON.stringify(rendered[0].record.details.condiciones)), expected);
  assert.deepEqual(JSON.parse(JSON.stringify(db.tables.quotation_versions[0].snapshot.quotation.detalles.condiciones)), expected);
});

test('photo cleanup only removes old photos that no quotation or sent version uses', async () => {
  const old = '2026-01-01T00:00:00Z';
  const recent = new Date().toISOString();
  const used = 'hotel/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg';
  const inVersion = 'hotel/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpg';
  const orphan = 'hotel/cccccccccccccccccccccccccccccccc.jpg';
  const fresh = 'hotel/dddddddddddddddddddddddddddddddd.jpg';
  const inCatalog = 'hotel/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.jpg';
  const db = fakeDb({ quotations: [{ id: 'q1', detalles: { hoteles: [{ fotos: [{ path: used }] }] } }], quotation_versions: [{ id: 'v1', snapshot: { quotation: { detalles: { hoteles: [{ fotos: [{ path: inVersion }] }] } } } }], hotel_catalog: [{ id: 'h1', fotos: [{ path: inCatalog }] }] }, { files: [used, inVersion, orphan, fresh, inCatalog].map(path => ({ path, created_at: path === fresh ? recent : old })) });
  const api = actions(db);
  const review = await api.cleanupUnusedHotelPhotos({}, form({ accion: 'revisar' }));
  assert.deepEqual([review.checked, review.unused], [5, 1]);
  assert.equal(db.files.length, 5);
  const removed = await api.cleanupUnusedHotelPhotos({}, form({ accion: 'eliminar' }));
  assert.match(removed.success, /Se eliminaron 1 foto sin uso/);
  assert.deepEqual(db.files.map(file => file.path).sort(), [used, inVersion, fresh, inCatalog].sort());
});

test('money is exact at half-cent boundaries and matches PostgreSQL round()', () => {
  // 1.15 x 2.30 = 2.645 -> 2.65 (floating point gives 2.6449999...)
  assert.equal(money.lineAmount({ tipo: 'Hotel', cantidad: 1.15, precio_unitario: 2.3 }), 2.65);
  assert.equal(money.lineAmount({ tipo: 'Hotel', cantidad: 1.5, precio_unitario: 0.33 }), 0.5);
  assert.equal(money.lineAmount({ tipo: 'Descuento', cantidad: 1.15, precio_unitario: 2.3 }), -2.65);
  assert.equal(money.totalAmount([{ tipo: 'Hotel', cantidad: 3, precio_unitario: 19.99 }, { tipo: 'Descuento', cantidad: 1, precio_unitario: 0.01 }]), 59.96);
});

// ---- V6 combined packages ----

const json = value => JSON.parse(JSON.stringify(value));

function packagePayload(overrides = {}) {
  const record = samples['combinado-vuelo-hotel-traslado']();
  return {
    id: null, expectedUpdatedAt: null, leadId: null, customerId: null,
    cliente: { nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '' }, tipo: 'combinado', destino: 'Cancún, México', moneda: 'USD', notas: '',
    detalles: { ...record.details, validez: { ...record.details.validez, venceEn: new Date(Date.now() + 86400000).toISOString() }, refCreacion: 'token-paquete-123456', aprobacionCondiciones: { huella: detailsModule.termsFingerprint(record.details.condiciones), por: '', en: '' } },
    items: record.items.map(item => ({ descripcion: item.descripcion, tipo: item.tipo, cantidad: String(item.cantidad), precio_unitario: String(item.precio_unitario) })),
    ...overrides,
  };
}

test('a combined package saves its ordered services, line links and the exact total', async () => {
  const db = fakeDb();
  const result = await actions(db).saveQuotation(JSON.stringify(packagePayload()));
  assert.equal(result.success, 'Cotización guardada.');
  const [row] = db.tables.quotations;
  assert.equal(row.tipo, 'combinado');
  assert.deepEqual(json(row.detalles.paquete.componentes.map(component => component.tipo)), ['vuelo', 'hotel', 'traslado', 'tour']);
  assert.deepEqual(json(row.detalles.paquete.lineas), ['', '', '']);
  assert.equal(row.total, 4029.5);
  assert.equal(row.detalles.fechaSalida, '2026-12-19', 'trip dates come from the services');
  assert.equal(row.detalles.fechaRegreso, '2026-12-26');
  assert.equal(db.tables.quotation_items.length, 3);
});

test('before the V6 SQL, a combined package explains what to run instead of reporting a lock', async () => {
  const db = fakeDb({}, { noPackageType: true });
  const result = await actions(db).saveQuotation(JSON.stringify(packagePayload()));
  assert.equal(result.locked, undefined);
  assert.match(result.error, /quotations_v6\.sql/);
  assert.equal(db.tables.quotations.length, 0);
  assert.equal((await actions(db).saveQuotation(JSON.stringify(payload()))).success, 'Cotización guardada.', 'other kinds keep working');
});

test('sending a package freezes every service in the version; later edits do not change it', async () => {
  const db = fakeDb();
  const rendered = [];
  const api = actions(db, { rendered });
  const created = await api.saveQuotation(JSON.stringify(packagePayload()));
  assert.equal((await api.sendQuotation({}, form({ id: created.quotationId }))).success, 'Versión 1 enviada al correo del cliente.');
  const frozen = structuredClone(db.tables.quotation_versions[0].snapshot);
  assert.equal(frozen.quotation.detalles.paquete.componentes.length, 4);
  assert.equal(rendered[0].record.kind, 'combinado');
  assert.equal(rendered[0].record.details.paquete.componentes[1].hotel.nombre, 'Hotel de prueba Riviera');
  const edited = packagePayload({ id: created.quotationId, expectedUpdatedAt: db.tables.quotations[0].updated_at });
  edited.detalles.paquete.componentes = edited.detalles.paquete.componentes.slice(0, 2);
  await api.saveQuotation(JSON.stringify(edited));
  assert.equal(db.tables.quotations[0].detalles.paquete.componentes.length, 2);
  assert.deepEqual(json(db.tables.quotation_versions[0].snapshot), json(frozen));
});

test('an incomplete package cannot be sent and an expired one neither', async () => {
  const db = fakeDb();
  let calls = 0;
  const api = actions(db, { fetch: async () => { calls++; return { ok: true }; } });
  const incomplete = packagePayload();
  incomplete.detalles.paquete.componentes[1].hotel.inclusionesConfirmadas = false;
  const first = await api.saveQuotation(JSON.stringify(incomplete));
  assert.match((await api.sendQuotation({}, form({ id: first.quotationId }))).error, /Servicio 2 \(Hotel\)/);
  const expired = packagePayload({ detalles: { ...packagePayload().detalles, refCreacion: 'token-paquete-vencido', validez: { ...packagePayload().detalles.validez, venceEn: '2026-01-01T00:00:00.000Z' } } });
  const second = await api.saveQuotation(JSON.stringify(expired));
  assert.match((await api.sendQuotation({}, form({ id: second.quotationId }))).error, /validez ya venció/);
  assert.equal(calls, 0);
});

test('duplicating or amending a package asks to confirm its flights again and keeps prices and links', async () => {
  const db = fakeDb();
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(packagePayload()));
  await assert.rejects(api.duplicateQuotation(created.quotationId), /redirect/);
  const copy = db.tables.quotations[1];
  const flight = copy.detalles.paquete.componentes[0];
  assert.equal(flight.vuelo.vuelos.confirmado, false);
  assert.equal(flight.vuelo.equipajeConfirmado, false);
  assert.equal(db.tables.quotations[0].detalles.paquete.componentes[0].vuelo.vuelos.confirmado, true, 'the original is untouched');
  assert.deepEqual(json(copy.detalles.paquete.lineas), ['', '', '']);
  assert.equal(db.tables.quotation_items.filter(item => item.quotation_id === copy.id).length, 3);
  assert.equal(copy.tipo, 'combinado');
});

test('an accepted package converts into a reservation from exactly the accepted version', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(packagePayload()));
  await api.sendQuotation({}, form({ id: created.quotationId }));
  assert.match((await api.updateQuotationStatus({}, form({ id: created.quotationId, estado: 'aceptada', version_id: db.tables.quotation_versions.at(-1)?.id ?? '', confirmado: 'si' }))).success, /Cotización aceptada/);
  const locked = await api.saveQuotation(JSON.stringify(packagePayload({ id: created.quotationId })));
  assert.equal(locked.locked, true);
  await assert.rejects(reservationActions(db).convertQuotationToReservation({}, form({ quotation_id: created.quotationId, version_id: db.tables.quotations[0].accepted_version_id, confirmado: 'si', modo: 'reserva', apellido: 'Pérez' })), /redirect:\/admin\/reservas\//);
  assert.equal(db.tables.reservations.length, 1);
  assert.equal(db.tables.reservations[0].total, 4029.5);
  assert.deepEqual(json(db.tables.reservation_items.map(item => item.descripcion)), json(db.tables.quotation_versions[0].snapshot.items.map(item => item.descripcion)));
  assert.equal(money.totalAmount(db.tables.reservation_items), 4029.5);
});

test('a package without flights (hotel + ferry) keeps its exact services in the sent version and the amendment', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const api = actions(db);
  const record = samples['combinado-hotel-ferry']();
  const body = overrides => packagePayload({ destino: 'Roatán', detalles: { ...record.details, validez: { ...record.details.validez, venceEn: new Date(Date.now() + 86400000).toISOString() }, refCreacion: 'token-hotel-ferry-1', aprobacionCondiciones: { huella: detailsModule.termsFingerprint(record.details.condiciones), por: '', en: '' } }, items: record.items.map(item => ({ descripcion: item.descripcion, tipo: item.tipo, cantidad: String(item.cantidad), precio_unitario: String(item.precio_unitario) })), ...overrides });
  const created = await api.saveQuotation(JSON.stringify(body()));
  assert.equal((await api.sendQuotation({}, form({ id: created.quotationId }))).success, 'Versión 1 enviada al correo del cliente.');
  const issued = json(db.tables.quotation_versions[0].snapshot);
  assert.deepEqual(issued.quotation.detalles.paquete.componentes.map(component => component.tipo), ['ferry', 'hotel']);
  // The draft keeps changing: a transfer is added and the ferry removed.
  const edited = body({ id: created.quotationId, expectedUpdatedAt: db.tables.quotations[0].updated_at });
  edited.detalles.paquete.componentes = [edited.detalles.paquete.componentes[1], { ...detailsModule.emptyComponent('traslado', 'traslado9'), servicio: { ...detailsModule.emptyService(), descripcion: 'Traslado muelle – hotel', fecha: '2026-12-18' } }];
  edited.detalles.paquete.lineas = ['', '', '', ''];
  assert.equal((await api.saveQuotation(JSON.stringify(edited))).success, 'Cotización guardada.');
  assert.deepEqual(json(db.tables.quotations[0].detalles.paquete.componentes.map(component => component.tipo)), ['hotel', 'traslado']);
  assert.deepEqual(json(db.tables.quotation_versions[0].snapshot), issued, 'the issued version is unchanged');
  // Sent again, accepted, amended: the amendment starts from the accepted combination.
  await api.sendQuotation({}, form({ id: created.quotationId }));
  await api.updateQuotationStatus({}, form({ id: created.quotationId, estado: 'aceptada', version_id: db.tables.quotation_versions.at(-1)?.id ?? '', confirmado: 'si' }));
  await assert.rejects(api.duplicateQuotation(created.quotationId, 'enmienda'), /redirect/);
  const amendment = db.tables.quotations.at(-1);
  assert.deepEqual(json(amendment.detalles.paquete.componentes.map(component => component.tipo)), ['hotel', 'traslado']);
  assert.equal(json(db.tables.quotation_versions.map(version => version.snapshot.quotation.detalles.paquete.componentes.length)).join(), '2,2');
});

test('accepting an unsent quotation is rejected without creating a version', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const api = actions(db); const created = await api.saveQuotation(JSON.stringify(payload()));
  const result = await api.updateQuotationStatus({}, form({ id: created.quotationId, estado: 'aceptada', version_id: '11111111-1111-4111-8111-111111111111', confirmado: 'si' }));
  assert.match(result.error, /enviada/); assert.equal(db.tables.quotation_versions.length,0); assert.equal(db.tables.quotations[0].estado,'borrador');
});

test('accepting after a send records the sent version and freezes nothing new', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const { accepted } = await sentAndAccepted(db);
  assert.match(accepted.success, /Cotización aceptada/);
  assert.equal(db.tables.quotation_versions.length, 1);
  assert.equal(db.tables.quotation_versions[0].snapshot.origen, undefined);
});

// Admin overhaul, phase 1: quotations shared by WhatsApp or in person (most of them) can be accepted.
test('registering a WhatsApp send freezes the version with its channel, sends nothing and allows acceptance', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  let calls = 0;
  const api = actions(db, { fetch: async () => { calls++; return { ok: true }; } });
  const created = await api.saveQuotation(JSON.stringify(payload({ cliente: { nombre: 'Ana Pérez', email: '', telefono: '+50499998888' } })));
  const unconfirmed = await api.registerQuotationSent({}, form({ id: created.quotationId, canal: 'whatsapp' }));
  assert.match(unconfirmed.error, /Confirme/);
  const result = await api.registerQuotationSent({}, form({ id: created.quotationId, canal: 'whatsapp', confirmado: 'si' }));
  assert.match(result.success, /Versión 1 registrada como enviada por WhatsApp/);
  assert.equal(result.versionPdf, `/api/admin/cotizaciones/${created.quotationId}/pdf?version=1`);
  assert.equal(calls, 0, 'no e-mail is sent');
  const [quotation] = db.tables.quotations, [version] = db.tables.quotation_versions;
  assert.equal(quotation.estado, 'enviada');
  assert.equal(quotation.sent_version_id, version.id);
  assert.equal(version.snapshot.canal, 'whatsapp');
  const accepted = await api.updateQuotationStatus({}, form({ id: created.quotationId, estado: 'aceptada', version_id: version.id, confirmado: 'si' }));
  assert.match(accepted.success, /Cotización aceptada/);
});

test('registering a send is refused for an unknown channel, an incomplete quotation or an accepted one', async () => {
  const db = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const api = actions(db);
  const created = await api.saveQuotation(JSON.stringify(payload()));
  assert.match((await api.registerQuotationSent({}, form({ id: created.quotationId, canal: 'correo', confirmado: 'si' }))).error, /Elija/);
  const unconfirmed = payload({ id: created.quotationId, expectedUpdatedAt: db.tables.quotations[0].updated_at });
  unconfirmed.detalles = { ...unconfirmed.detalles, vuelos: { ...unconfirmed.detalles.vuelos, confirmado: false } };
  await api.saveQuotation(JSON.stringify(unconfirmed));
  assert.match((await api.registerQuotationSent({}, form({ id: created.quotationId, canal: 'whatsapp', confirmado: 'si' }))).error, /Confirme el itinerario/);
  assert.equal(db.tables.quotation_versions.length, 0);
  const acceptedDb = fakeDb({ reservation_items: [], payments: [], invoices: [] });
  const { id } = await sentAndAccepted(acceptedDb);
  assert.match((await actions(acceptedDb).registerQuotationSent({}, form({ id, canal: 'presencial', confirmado: 'si' }))).error, /ya aceptó/);
});

test('a quotation without e-mail is linked to its customer by phone', async () => {
  const db = fakeDb();
  const api = actions(db);
  const whatsappOnly = cliente => payload({ cliente, detalles: { ...payload().detalles, refCreacion: `token-${cliente.nombre.length}-${db.tables.quotations.length}abcdef` } });
  await api.saveQuotation(JSON.stringify(whatsappOnly({ nombre: 'Ana Pérez', email: '', telefono: '+50499998888' })));
  assert.equal(db.tables.customers.length, 1);
  assert.equal(db.tables.customers[0].email, null);
  assert.equal(db.tables.customers[0].telefono, '+50499998888');
  await api.saveQuotation(JSON.stringify(whatsappOnly({ nombre: 'ana perez', email: '', telefono: '+50499998888' })));
  assert.equal(db.tables.customers.length, 1, 'same phone and same name reuses the customer');
  assert.equal(db.tables.quotations[1].customer_id, db.tables.customers[0].id);
  const other = await api.saveQuotation(JSON.stringify(whatsappOnly({ nombre: 'Luis Gómez', email: '', telefono: '+50499998888' })));
  assert.equal(db.tables.customers.length, 1, 'a shared phone alone is only a suggestion');
  assert.equal(other.customerSuggestions.length, 1);
});
