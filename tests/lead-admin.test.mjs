import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, validation } from './security-support.mjs';

const leadAdmin = load('src/lib/lead-admin.ts');
const id = '12345678-1234-4234-8234-123456789abc';

test('lead contact prefers columns and falls back to payload for rows saved before the SQL', () => {
  assert.deepEqual({ ...leadAdmin.leadContact({ telefono: '+50499998888', email: 'a@b.co', referencia: 'VT-AAAAA', payload: { contacto: { telefono: '+1' } } }), origen: undefined }, { telefono: '+50499998888', email: 'a@b.co', referencia: 'VT-AAAAA', origen: undefined });
  const legacy = leadAdmin.leadContact({ payload: { referencia: 'VT-BBBBB', contacto: { telefono: '+50433334444', email: '' }, origen: { utm_source: 'facebook' } } });
  assert.equal(legacy.telefono, '+50433334444'); assert.equal(legacy.referencia, 'VT-BBBBB'); assert.equal(legacy.origen.utm_source, 'facebook');
  assert.equal(leadAdmin.leadContact({ payload: { formData: { telefono: '9999-8888', email: 'c@d.co' } } }).email, 'c@d.co');
  assert.equal(leadAdmin.leadContact({}).telefono, '');
});

test('customer WhatsApp links use the customer number, never the agency number', () => {
  const href = leadAdmin.customerWhatsappHref('+504 9999-8888', 'Hola');
  assert.equal(href, 'https://wa.me/50499998888?text=Hola');
  assert.equal(leadAdmin.customerWhatsappHref('', 'Hola'), '');
  assert.equal(leadAdmin.customerWhatsappHref('123', 'Hola'), '');
  assert.match(leadAdmin.leadGreeting('Ana', 'VT-AAAAA'), /Hola Ana.*VT-AAAAA/);
});

test('quotation prefill carries lead data and caps lengths', () => {
  const prefill = leadAdmin.leadQuotationPrefill({ id, nombre: 'Ana', destino: 'Cartagena', servicio: 'Paquete', fechas: 'Julio', pasajeros: '2', notas: 'x'.repeat(6000), telefono: '+50499998888', referencia: 'VT-AAAAA' });
  assert.equal(prefill.leadId, id); assert.equal(prefill.telefono, '+50499998888'); assert.equal(prefill.destino, 'Cartagena');
  assert.ok(prefill.notas.length <= 5000); assert.match(prefill.notas, /Servicio: Paquete/);
  assert.equal(leadAdmin.leadAge(new Date(Date.now() - 30 * 60000).toISOString()), 'hace 30 min');
  assert.equal(leadAdmin.leadAge(new Date(Date.now() - 3 * 86400000).toISOString()), 'hace 3 días');
});

function statusAction(errors = []) {
  const updates = [], paths = [];
  const client = { from: table => { assert.equal(table, 'leads'); return { update: values => { updates.push(values); return { eq: () => ({ select: () => ({ single: async () => ({ error: errors.shift() ?? null }) }) }) }; } }; } };
  const actions = load('src/app/admin/(protected)/leads/actions.ts', { 'next/cache': { revalidatePath: p => paths.push(p) }, '@/lib/admin': { requireAdmin: async () => ({ client }) }, '@/lib/lead-admin': leadAdmin });
  return { actions, updates, paths };
}
const form = values => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };

test('lead status requires a known state and a loss reason for perdido', async () => {
  const { actions, updates } = statusAction();
  assert.ok((await actions.updateLeadStatus({}, form({ id: 'bad', estado: 'nuevo' }))).error);
  assert.ok((await actions.updateLeadStatus({}, form({ id, estado: 'borrado' }))).error);
  assert.ok((await actions.updateLeadStatus({}, form({ id, estado: 'perdido', motivo_perdida: 'inventado' }))).error);
  assert.equal(updates.length, 0);
  assert.ok((await actions.updateLeadStatus({}, form({ id, estado: 'perdido', motivo_perdida: 'Precio' }))).success);
  assert.deepEqual({ ...updates[0] }, { estado: 'perdido', motivo_perdida: 'Precio' });
});

test('lead status degrades before the SQL runs and explains a check violation', async () => {
  const missing = statusAction([{ code: 'PGRST204' }]);
  assert.ok((await missing.actions.updateLeadStatus({}, form({ id, estado: 'perdido', motivo_perdida: 'Precio' }))).success);
  assert.deepEqual({ ...missing.updates[1] }, { estado: 'perdido' });
  const check = statusAction([{ code: '23514' }]);
  assert.match((await check.actions.updateLeadStatus({}, form({ id, estado: 'ganado' }))).error, /leads_contact\.sql/);
});

test('validation exports used by admin share links normalise stored phones', () => {
  assert.equal(validation.normalizePhone('+504 9999-8888'), '+50499998888');
});
