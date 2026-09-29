import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, validation, quote, request } from './security-support.mjs';

function route(errors = []) {
  const rows = [], emails = [];
  const api = load('src/app/api/leads/route.ts', {
    '@/lib/lead-validation': validation,
    '@/lib/public-security': { rateLimit: async () => null, readBody: async r => Buffer.from(await r.arrayBuffer()), verifyTurnstile: async (_r, token) => token === 'valid', publicError: (status, error) => Response.json({ ok: false, error }, { status }) },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: row => { rows.push(row); return { abortSignal: async () => ({ error: errors.shift() ?? null }) }; } }) }) },
    '@/lib/notifications': { notifySubmission: async (...args) => emails.push(args) },
  }, { console: { error() {}, warn() {} } });
  return { ...api, rows, emails };
}

test('phones normalise to E.164 with Honduras as the default country', () => {
  assert.equal(validation.normalizePhone('9999-8888'), '+50499998888');
  assert.equal(validation.normalizePhone('+504 9999 8888'), '+50499998888');
  assert.equal(validation.normalizePhone('(504) 9999-8888'), '+50499998888');
  assert.equal(validation.normalizePhone('+1 (305) 555-0100'), '+13055550100');
  assert.equal(validation.normalizePhone('0034 612 345 678'), '+34612345678');
  for (const bad of ['', '123', 'abc-defg-hij', '+1234567890123456', '99a9-8888']) assert.equal(validation.normalizePhone(bad), '');
});

test('quote forms carry a validated phone, optional email and name into the lead', () => {
  const lead = quote('Vuelos'); Object.assign(lead.formData, { phone: '9999-8888', email: 'viajero@example.invalid' });
  const result = validation.validateLead(lead);
  assert.equal(result.contacto.telefono, '+50499998888');
  assert.equal(result.contacto.email, 'viajero@example.invalid');
  assert.equal(result.fields.Teléfono, '+50499998888');
  const pkg = { servicio: 'Paquete', fields: {}, formData: { slug: 'x', nombre: 'Paquete X', destino: 'Cartagena', origin: 'SPS', dates: 'Julio', adults: '2', children: '0', name: 'Ana', phone: '+504 3333 4444' } };
  const parsed = validation.validateLead(pkg);
  assert.equal(parsed.fields.Nombre, 'Ana');
  assert.equal(parsed.contacto.telefono, '+50433334444');
  for (const mutate of [p => p.formData.phone = '12', p => p.formData.email = 'no-es-correo', p => p.formData.phone = 'x'.repeat(41)]) {
    const invalid = quote('Hoteles'); mutate(invalid); assert.throws(() => validation.validateLead(invalid));
  }
});

test('button-only CTAs may send contact data and stay lightweight', () => {
  const finalCta = validation.validateLead({ servicio: 'Viaje a medida', fields: { Nombre: 'Ana', Notas: 'Luna de miel' }, formData: { name: 'Ana', phone: '99998888', notes: 'Luna de miel' } });
  assert.equal(finalCta.contacto.telefono, '+50499998888');
  assert.equal(finalCta.fields.Notas, 'Luna de miel');
  const destination = validation.validateLead({ servicio: 'destino', fields: { Destino: 'Cartagena' }, formData: { slug: 'cartagena', nombre: 'Cartagena', phone: '99998888' } });
  assert.equal(destination.contacto.telefono, '+50499998888');
});

test('attribution keeps only allowlisted, capped keys; segment is allowlisted', () => {
  const lead = quote(); lead.origen = { pagina: '/paquetes/x', utm_source: 'facebook', evil: 'drop', referrer: 'x'.repeat(500) }; lead.segmento = 'quinceañera';
  const parsed = validation.validateLead(lead);
  assert.deepEqual(Object.keys(parsed.origen).sort(), ['pagina', 'referrer', 'utm_source']);
  assert.equal(parsed.origen.referrer.length, 200);
  assert.equal(parsed.segmento, 'quinceañera');
  lead.segmento = 'otro'; lead.origen = 'not-an-object';
  const other = validation.validateLead(lead);
  assert.equal(other.segmento, ''); assert.deepEqual({ ...other.origen }, {});
});

test('route stores contact columns and returns an unambiguous reference', async () => {
  const lead = quote(); lead.formData.phone = '99998888';
  const api = route(); const response = await api.POST(request(lead));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.match(body.referencia, /^VT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
  assert.equal(api.rows[0].referencia, body.referencia);
  assert.equal(api.rows[0].telefono, '+50499998888');
  assert.equal(api.rows[0].payload.referencia, body.referencia);
  assert.equal(api.emails[0][2].referencia, body.referencia);
});

test('missing SQL columns fall back to the legacy row without losing contact data', async () => {
  const lead = quote(); lead.formData.phone = '99998888';
  const api = route([{ code: 'PGRST204' }]);
  const response = await api.POST(request(lead));
  assert.equal(response.status, 201);
  assert.equal(api.rows.length, 2);
  assert.equal(api.rows[1].telefono, undefined);
  assert.equal(api.rows[1].payload.contacto.telefono, '+50499998888');
  assert.equal(api.emails.length, 1);
});

test('a reference collision is retried once with a new reference', async () => {
  const api = route([{ code: '23505' }]);
  const response = await api.POST(request(quote()));
  assert.equal(response.status, 201);
  assert.equal(api.rows.length, 2);
  assert.notEqual(api.rows[0].referencia, api.rows[1].referencia);
});
