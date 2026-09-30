import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

const { jsonLdString } = load('src/lib/json-ld.ts');

test('JSON-LD cannot close its script element or start markup', () => {
  const output = jsonLdString({ name: '</script><script>alert(1)</script>', note: 'A & B > C' });
  assert.equal(output.includes('<'), false);
  assert.equal(output.includes('>'), false);
  assert.equal(output.includes('&'), false);
  assert.deepEqual(JSON.parse(output), { name: '</script><script>alert(1)</script>', note: 'A & B > C' });
});

test('JSON-LD escapes the JavaScript line separators', () => {
  const text = `uno${String.fromCharCode(0x2028)}dos${String.fromCharCode(0x2029)}tres`;
  const output = jsonLdString({ text });
  assert.equal(output.includes(String.fromCharCode(0x2028)) || output.includes(String.fromCharCode(0x2029)), false);
  assert.equal(JSON.parse(output).text, text);
});
