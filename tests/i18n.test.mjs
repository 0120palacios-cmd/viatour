import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flat = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' && value !== null ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}`]);
const read = locale => JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'));

test('Spanish and English messages define the same keys', () => {
  const es = flat(read('es')), en = new Set(flat(read('en')));
  assert.deepEqual(es.filter(key => !en.has(key)), []);
  assert.deepEqual([...en].filter(key => !es.includes(key)), []);
});

test('Spanish copy addresses the customer as usted and uses no emojis', () => {
  const values = flat(read('es')).length && JSON.stringify(read('es'));
  // Common tú forms that have slipped into copy before.
  for (const word of ['Encuéntranos', 'Escríbenos', 'Contáctanos', 'Síguenos', 'tu viaje', 'tus datos']) assert.equal(values.includes(word), false, word);
  assert.equal(/\p{Extended_Pictographic}/u.test(values), false);
});
