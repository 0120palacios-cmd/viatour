import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { load } from './security-support.mjs';

const { packageMatchesDestination, normalizePlace } = load('src/lib/destination-match.ts');
const packages = JSON.parse(fs.readFileSync('data/packages.json', 'utf8')).map(item => ({ destination_id: null, ...item }));
const destinations = JSON.parse(fs.readFileSync('data/destinations.json', 'utf8')).filter(item => item.publicado).map(item => ({ id: `id-${item.slug}`, ...item }));
const linked = slug => packages.filter(item => packageMatchesDestination(item, destinations.find(d => d.slug === slug))).map(item => item.slug).sort();

test('every published destination with real packages links them, regions included', () => {
  assert.deepEqual(linked('punta-cana'), ['punta-cana-luna-de-miel', 'punta-cana-todo-incluido']);
  assert.deepEqual(linked('panama'), ['cartagena-y-panama']);
  assert.deepEqual(linked('cartagena'), ['cartagena-all-inclusive', 'cartagena-y-panama']);
  assert.deepEqual(linked('rio-de-janeiro'), ['carnaval-de-rio', 'rio-de-janeiro-clasico']);
  assert.deepEqual(linked('cruceros'), ['crucero-caribe', 'crucero-mediterraneo']);
  assert.deepEqual(linked('medio-oriente'), ['dubai-abu-dhabi', 'egipto-cairo-crucero-nilo', 'tierra-santa-israel']);
  assert.deepEqual(linked('europa'), ['espana-francia-suiza', 'espana-madrid-andalucia-barcelona', 'fin-de-ano-londres-belgica-amsterdam', 'grecia-atenas-santorini', 'italia-roma-florencia-venecia', 'paris-disneyland', 'quinceaneras-por-europa', 'turquia-estambul-capadocia']);
  assert.deepEqual(linked('salinitas'), []);
});

test('names match whole words only, and a database link always wins', () => {
  const dest = { id: 'd1', slug: 'roma', nombre: 'Roma' };
  assert.equal(packageMatchesDestination({ destination_id: null, destino: 'Romania', categoria: null }, dest), false);
  assert.equal(packageMatchesDestination({ destination_id: null, destino: 'Italia: Roma y Florencia', categoria: null }, dest), true);
  assert.equal(packageMatchesDestination({ destination_id: 'd1', destino: 'Otro', categoria: null }, dest), true);
  assert.equal(normalizePlace('Río de Janeiro'), 'rio-de-janeiro');
});

test('only real durations are shown on cards and package pages', () => {
  const { displayDuration } = load('src/lib/display-rules.ts');
  assert.equal(displayDuration('7 días / 6 noches'), '7 días / 6 noches');
  assert.equal(displayDuration('Consulte con su asesor'), null);
  assert.equal(displayDuration('  '), null);
  assert.equal(displayDuration(null), null);
});
