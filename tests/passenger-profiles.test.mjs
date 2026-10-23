import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { load } from './security-support.mjs';

// Step 6: passenger profiles. Synthetic data only; the key is a test value generated here.
const key = crypto.randomBytes(32).toString('hex');
const travel = load('src/lib/travel-operations.ts');
const vault = load('src/lib/travel-vault.ts', { 'server-only': {}, 'node:crypto': crypto }, { process: { env: { TRAVEL_DATA_KEY: key } }, Buffer });
const otherVault = load('src/lib/travel-vault.ts', { 'server-only': {}, 'node:crypto': crypto }, { process: { env: { TRAVEL_DATA_KEY: crypto.randomBytes(32).toString('hex') } }, Buffer });
const profiles = load('src/lib/passenger-profiles.ts', { 'server-only': {}, '@/lib/travel-vault': vault, '@/lib/travel-operations': travel });
const plain = value => JSON.parse(JSON.stringify(value));
const ID = '7a7a7a7a-0000-4000-8000-000000000001', CUSTOMER = '8b8b8b8b-0000-4000-8000-000000000002';
const input = { firstName: ' Ana ', middleName: 'María', lastName: 'Pérez  López', category: 'adulto', nationality: 'Honduras', documentType: 'pasaporte', issuingCountry: 'Honduras', expiryDate: '2031-05-01', birthDate: '1990-02-03', sex: 'Femenino', documentNumber: 'f123-4567', phone: '+50499999999', email: 'ANA@EXAMPLE.TEST', emergencyContact: '', assistance: '', notes: '' };

test('a profile is cleaned and validated before it is saved', () => {
  const ok = profiles.validateProfile(input, '2026-10-23');
  assert.deepEqual([ok.value.firstName, ok.value.lastName, ok.value.documentNumber, ok.value.email], ['Ana', 'Pérez López', 'F1234567', 'ana@example.test']);
  assert.match(profiles.validateProfile({ ...input, lastName: '' }).error, /apellidos/);
  assert.match(profiles.validateProfile({ ...input, birthDate: '2030-01-01' }, '2026-10-23').error, /nacimiento/);
  assert.match(profiles.validateProfile({ ...input, documentNumber: '12' }).error, /número del documento/);
  assert.equal(profiles.validateProfile({ ...input, category: 'mascota', documentType: 'licencia' }).value.category, 'adulto');
});

test('only names, nationality, document type, country, expiry and the last 4 characters are stored in clear', () => {
  const row = profiles.toRow(ID, CUSTOMER, profiles.validateProfile(input).value);
  assert.equal(row.documento_final, '4567');
  assert.match(row.privado, /^v1\./);
  const clear = JSON.stringify({ ...row, privado: undefined });
  for (const secret of ['F1234567', '1990-02-03', 'Femenino', '+50499999999', 'ana@example.test']) assert.ok(!clear.includes(secret), secret);
  assert.deepEqual(plain(profiles.openProfile(row.privado, ID)), { birthDate: '1990-02-03', sex: 'Femenino', documentNumber: 'F1234567', phone: '+50499999999', email: 'ana@example.test', emergencyContact: '', assistance: '', notes: '' });
});

test('sealed data cannot be opened for another profile or with another key', () => {
  const row = profiles.toRow(ID, CUSTOMER, profiles.validateProfile(input).value);
  assert.equal(profiles.openProfile(row.privado, CUSTOMER), null);
  const elsewhere = load('src/lib/passenger-profiles.ts', { 'server-only': {}, '@/lib/travel-vault': otherVault, '@/lib/travel-operations': travel });
  assert.equal(elsewhere.openProfile(row.privado, ID), null);
});

test('a profile becomes a reservation passenger with the same id and all its data', () => {
  const row = profiles.toRow(ID, CUSTOMER, profiles.validateProfile(input).value);
  const profile = { id: ID, customerId: CUSTOMER, firstName: 'Ana', middleName: 'María', lastName: 'Pérez López', category: 'adulto', nationality: 'Honduras', documentType: 'pasaporte', issuingCountry: 'Honduras', expiryDate: '2031-05-01', documentLast4: '4567', photoPath: '', passportPath: '', passportDeleteAfter: '', private: profiles.openProfile(row.privado, ID), updatedAt: '' };
  const passenger = plain(profiles.profileToPassenger(profile));
  assert.equal(passenger.id, ID);
  assert.deepEqual([passenger.documentNumber, passenger.birthDate, passenger.expiryDate, passenger.sex], ['F1234567', '1990-02-03', '2031-05-01', 'Femenino']);
  assert.doesNotThrow(() => travel.validateTravel({ ...travel.emptyTravel(), passengers: [passenger] }, '2026-12-01'), 'it passes the passenger file validation');
  assert.equal(profiles.addDays('2026-12-14', 30), '2027-01-13');
});

test('images can only be attached to their own profile folder with the expected name', async () => {
  const calls = [];
  const db = {
    from: () => ({ select() { return this; }, update(values) { calls.push(values); return this; }, eq() { return this; }, async maybeSingle() { return { data: { customer_id: CUSTOMER, foto_path: null, pasaporte_path: null, pasaporte_borrar_despues: null, id: ID }, error: null }; } }),
    storage: { from: () => ({ remove: async paths => { calls.push({ removed: paths }); return { error: null }; } }) },
  };
  const actions = load('src/app/admin/clientes/passenger-actions.ts', {
    'node:crypto': crypto, 'next/cache': { revalidatePath() {} }, '@/lib/admin': { requireAdmin: async () => ({ client: db }) },
    '@/lib/quotation-validation': load('src/lib/quotation-validation.ts', { '@/lib/quotation-types': {} }), '@/lib/passenger-profiles': profiles,
  });
  const good = `${ID}/pasaporte-${'b'.repeat(32)}.jpg`;
  for (const bad of [`${CUSTOMER}/pasaporte-${'b'.repeat(32)}.jpg`, `${ID}/foto-${'b'.repeat(32)}.jpg`, `${ID}/pasaporte-x.jpg`, `../${ID}/pasaporte-${'b'.repeat(32)}.jpg`]) {
    assert.equal((await actions.attachPassengerImage(ID, 'pasaporte', bad)).error, 'Imagen inválida.', bad);
  }
  assert.equal(calls.length, 0);
  assert.match((await actions.attachPassengerImage(ID, 'pasaporte', good)).success, /Se eliminará automáticamente 30 días/);
  assert.equal(calls[0].pasaporte_path, good);
  assert.match(calls[0].pasaporte_borrar_despues, /^\d{4}-\d{2}-\d{2}$/);
});
