import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

// Chainable Supabase double: every filter returns the builder; awaiting resolves the table's result.
function client(tables, log = []) {
  const builder = (table, op) => {
    const q = { filters: [] };
    const chain = new Proxy({}, { get: (_t, prop) => prop === 'then' ? (resolve, reject) => Promise.resolve(typeof tables[`${table}:${op}`] === 'function' ? tables[`${table}:${op}`](q) : tables[`${table}:${op}`] ?? { data: [], error: null }).then(resolve, reject) : (...args) => { q.filters.push([prop, ...args]); if (prop === 'select' && op === 'update') op = 'update'; return chain; } });
    return chain;
  };
  return {
    from: table => ({ select: (...a) => { log.push([table, 'select', ...a]); return builder(table, 'select'); }, update: values => { log.push([table, 'update', values]); return builder(table, 'update'); } }),
    storage: { from: () => ({ list: async () => ({ data: [{ name: 'pasaporte.pdf' }] }), remove: async paths => { log.push(['storage', 'remove', paths]); return { error: null }; } }) },
  };
}

function job(extra = {}) {
  const emails = [], invites = [];
  const leadAdmin = load('src/lib/lead-admin.ts');
  const api = load('src/lib/daily-job.ts', {
    'server-only': {},
    '@/lib/review-invitation-send': { inviteToReview: async (_c, nombre, email) => { invites.push([nombre, email]); return { ok: true, id: 'i' }; } },
    '@/lib/notifications': { sendResendEmail: async value => { emails.push(value); }, captureNotificationFailure() {} },
    '@/lib/site-config': { siteConfig: { url: 'https://miviatour.com', supportEmail: 'soporte@miviatour.com' } },
    '@/lib/lead-admin': leadAdmin,
    ...extra,
  });
  return { api, emails, invites };
}

const now = new Date('2026-09-29T15:00:00Z'); // 09:00 in Honduras
const tables = {
  'leads:select': { data: [{ nombre: 'Ana', servicio: 'Paquete', destino: 'Cartagena', created_at: '2026-09-27T15:00:00Z', telefono: '+50499998888', referencia: 'VT-AAAAA' }], error: null },
  'quotations:update': { data: [{ codigo: 'COT-1', cliente_nombre: 'Luis', destino: 'Cancún' }], error: null },
  'quotations:select': { data: [{ codigo: 'COT-2', cliente_nombre: 'Rosa', destino: 'Madrid', validez: '2026-10-10', created_at: '2026-09-20T00:00:00Z' }], error: null },
  'reservations:select': q => q.filters.some(f => f[0] === 'eq' && f[2] === 'completada')
    ? { data: [{ id: 'r3', codigo: 'RES-3', cliente_nombre: 'Eva', cliente_email: 'eva@example.invalid', fecha_fin: '2026-09-27' }, { id: 'r4', codigo: 'RES-4', cliente_nombre: 'Ivo', cliente_email: 'ivo@example.invalid', fecha_fin: '2026-09-10' }], error: null }
    : q.filters.some(f => f[0] === 'lt' && f[1] === 'fecha_fin') ? { data: [{ id: 'r9', codigo: 'RES-9' }], error: null }
    : { data: [{ id: 'r1', codigo: 'RES-1', cliente_nombre: 'Juan', cliente_email: 'juan@example.invalid', destino: 'Punta Cana', fecha_inicio: '2026-10-06', total: 2000, moneda: 'USD', estado: 'confirmada' }, { id: 'r2', codigo: 'RES-2', cliente_nombre: 'Sara', cliente_email: 'sara@example.invalid', destino: 'Roma', fecha_inicio: '2026-10-13', total: 3000, moneda: 'USD', estado: 'pendiente' }], error: null },
  'payments:select': { data: [{ reservation_id: 'r1', monto: 2000, moneda: 'USD' }, { reservation_id: 'r2', monto: 1000, moneda: 'USD' }, { reservation_id: 'r2', monto: 500, moneda: 'HNL' }], error: null },
  'review_invitations:select': { data: [{ email: 'IVO@example.invalid' }], error: null },
};

test('dates follow Honduras time', () => {
  const { api } = job();
  assert.equal(api.hondurasDate(new Date('2026-09-30T04:00:00Z')), '2026-09-29');
  assert.equal(api.addDays('2026-12-30', 3), '2027-01-02');
});

test('digest lists stale leads, expired and unanswered quotes, trips, balances and missing invitations', async () => {
  const log = [];
  const { api, emails, invites } = job();
  const report = await api.sendDailyDigest(client(tables, log), { now });
  assert.equal(report.today, '2026-09-29');
  assert.match(report.text, /VT-AAAAA · Ana · Paquete · Cartagena · \+50499998888/);
  assert.match(report.text, /COT-1 · Luis/); assert.match(report.text, /COT-2 · Rosa/);
  assert.match(report.text, /2026-10-06 · RES-1 · Juan/);
  assert.match(report.text, /RES-2 · Sara · saldo 2[,.]000\.00 USD/);
  assert.doesNotMatch(report.text, /RES-1 · Juan · saldo/);
  assert.match(report.text, /RES-3 · Eva/); assert.doesNotMatch(report.text, /RES-4 · Ivo/);
  assert.equal(invites.length, 0);
  assert.equal(emails.length, 1); assert.equal(emails[0].idempotencyKey, 'daily-digest/2026-09-29'); assert.equal(emails[0].to[0], 'soporte@miviatour.com');
  assert.deepEqual(JSON.parse(JSON.stringify(log.find(e => e[0] === 'quotations' && e[1] === 'update')[2])), { estado: 'expirada' });
  assert.equal(log.some(e => e[0] === 'storage'), false);
});

test('opt-in automations fire only on their exact day', async () => {
  const log = [];
  const { api, emails, invites } = job();
  await api.runDailyJob(client(tables, log), { now, autoReviews: true, customerReminders: true, docRetentionDays: 90 });
  // Eva returned exactly two days ago; Ivo already has an invitation.
  assert.deepEqual(JSON.parse(JSON.stringify(invites)), [['Eva', 'eva@example.invalid']]);
  // Juan travels in exactly 7 days; Sara travels in 14 days with a balance.
  assert.deepEqual(emails.map(e => e.to[0]).sort(), ['juan@example.invalid', 'sara@example.invalid']);
  assert.ok(emails.every(e => /^(trip-7|balance-14)\/r[12]\/2026-09-29$/.test(e.idempotencyKey)));
  assert.deepEqual(JSON.parse(JSON.stringify(log.find(e => e[0] === 'storage')[2])), ['r9/pasaporte.pdf']);
});

test('cron route requires the bearer secret', async () => {
  let ran = 0;
  const route = load('src/app/api/cron/daily/route.ts', { 'node:crypto': await import('node:crypto'), '@/lib/supabase/admin': { createAdminClient: () => ({}) }, '@/lib/daily-job': { sendDailyDigest: async () => { ran++; return { today: 'x', sections: [], actions: [], problems: [] }; } }, '@/lib/notifications': { captureNotificationFailure() {} } }, { process: { env: { CRON_SECRET: 's'.repeat(32) } } });
  for (const auth of [undefined, 'Bearer wrong', `Bearer ${'s'.repeat(31)}`]) assert.equal((await route.GET(new Request('http://local/api/cron/daily', { headers: auth ? { authorization: auth } : {} }))).status, 401);
  assert.equal(ran, 0);
  assert.equal((await route.GET(new Request('http://local/api/cron/daily', { headers: { authorization: `Bearer ${'s'.repeat(32)}` } }))).status, 200);
  assert.equal(ran, 1);
  const disabled = load('src/app/api/cron/daily/route.ts', { 'node:crypto': await import('node:crypto'), '@/lib/supabase/admin': {}, '@/lib/daily-job': {}, '@/lib/notifications': {} }, { process: { env: {} } });
  assert.equal((await disabled.GET(new Request('http://local/api/cron/daily', { headers: { authorization: 'Bearer ' } }))).status, 401);
});
