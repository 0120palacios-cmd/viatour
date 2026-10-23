import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
import { types } from './pdf-support.mjs';

// Admin customers (phase 1 of the admin overhaul): WhatsApp-only customers need no e-mail, and a phone
// or e-mail already registered points to the existing record instead of creating a duplicate.
const quotationValidation = load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': types });
const contact = load('src/lib/contact-validation.ts');
const leadValidation = load('src/lib/lead-validation.ts', { './contact-validation': contact });
const { validateCustomerForm } = load('src/lib/customer-validation.ts', { '@/lib/quotation-validation': quotationValidation, '@/lib/lead-validation': leadValidation });
const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };

test('a customer needs a name and a phone or an e-mail; the e-mail is optional', () => {
  assert.match(validateCustomerForm(form({ nombre: '', telefono: '99998888' })).error, /nombre/);
  assert.match(validateCustomerForm(form({ nombre: 'Ana Pérez' })).error, /teléfono o un correo/);
  assert.deepEqual(JSON.parse(JSON.stringify(validateCustomerForm(form({ nombre: 'Ana Pérez', telefono: '9999-8888' })).values)), { nombre: 'Ana Pérez', email: null, telefono: '+50499998888', notas: null });
  assert.equal(validateCustomerForm(form({ nombre: 'Ana Pérez', email: 'Ana@Example.com' })).values.email, 'ana@example.com');
  assert.match(validateCustomerForm(form({ nombre: 'Ana Pérez', email: 'no-es-correo' })).error, /correo/);
  assert.match(validateCustomerForm(form({ nombre: 'Ana Pérez', telefono: '12' })).error, /teléfono/);
});

function fakeClient(customers) {
  const writes = [];
  const from = () => {
    const state = { filters: [], values: null, op: 'select' };
    const rows = () => customers.filter(row => state.filters.every(([kind, key, value]) => kind === 'neq' ? row[key] !== value
      : new RegExp(`^${value.split('%').map(part => part.replace(/\\(.)/g, '$1').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i').test(String(row[key] ?? ''))));
    const api = {
      select() { return api; }, limit() { return api; },
      ilike(key, value) { state.filters.push(['ilike', key, value]); return api; },
      neq(key, value) { state.filters.push(['neq', key, value]); return api; },
      eq() { return api; },
      insert(values) { state.op = 'insert'; state.values = values; return api; },
      update(values) { state.op = 'update'; state.values = values; return api; },
      async maybeSingle() { return { data: rows()[0] ?? null, error: null }; },
      async single() { writes.push({ op: state.op, values: state.values }); return { data: { id: 'new-id' }, error: null }; },
      then(resolve) { return Promise.resolve({ data: rows(), error: null }).then(resolve); },
    };
    return api;
  };
  return { writes, client: { from } };
}

function action(db) {
  return load('src/app/admin/clientes/actions.ts', {
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
    '@/lib/admin': { requireAdmin: async () => ({ client: db.client }) }, '@/lib/quotation-validation': quotationValidation,
    '@/lib/customer-validation': { validateCustomerForm }, '@/lib/lead-validation': leadValidation,
  }).saveCustomer;
}

test('a phone already registered (in any format) points to that customer instead of a duplicate', async () => {
  const db = fakeClient([{ id: 'c1', nombre: 'Ana Pérez', email: null, telefono: '+504 9999-8888' }]);
  const result = await action(db)({}, form({ nombre: 'Ana P.', telefono: '99998888' }));
  assert.equal(result.duplicateId, 'c1');
  assert.equal(db.writes.length, 0);
});

test('an e-mail already registered points to that customer; a new WhatsApp-only customer is created without e-mail', async () => {
  const taken = fakeClient([{ id: 'c1', nombre: 'Ana Pérez', email: 'ana@example.com', telefono: null }]);
  assert.equal((await action(taken)({}, form({ nombre: 'Ana', email: 'ANA@example.com' }))).duplicateId, 'c1');
  const fresh = fakeClient([]);
  await assert.rejects(action(fresh)({}, form({ nombre: 'Luis Gómez', telefono: '9999-7777' })), /redirect:\/admin\/clientes\/new-id/);
  assert.deepEqual(JSON.parse(JSON.stringify(fresh.writes[0])), { op: 'insert', values: { nombre: 'Luis Gómez', email: null, telefono: '+50499997777', notas: null } });
});
