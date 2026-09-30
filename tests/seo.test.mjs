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

const siteConfig = { url: 'https://miviatour.com', tagline: 'sueña, descubre, sonríe.', supportEmail: 'soporte@miviatour.com', whatsappNumber: '50488668704', social: { facebook: '', instagram: '', tiktok: '' }, googleProfileUrl: '' };
const seo = load('src/lib/seo.ts', { '@/i18n/config': { defaultLocale: 'es', localizedPath: path => path }, '@/lib/site-config': { siteConfig }, 'next-intl/server': {} });

test('a trimmed title never ends on a connector word', () => {
  const title = seo.fitMetaTitle('viatour | Punta Cana Todo Incluido a su medida desde Honduras con asesoría');
  assert.ok(title.length <= 60);
  assert.doesNotMatch(title, /\s(a|su|desde|de|y|con)$/i);
  assert.equal(seo.fitMetaTitle('viatour | Paquetes desde Honduras'), 'viatour | Paquetes desde Honduras');
});

test('package titles fall back to a shorter complete phrase instead of cutting one', () => {
  const name = 'Buenos Aires y Bariloche';
  assert.equal(seo.pickMetaTitle(`viatour | ${name} a su medida desde Honduras`, `viatour | ${name} desde Honduras`, `viatour | ${name}`), 'viatour | Buenos Aires y Bariloche desde Honduras');
  assert.equal(seo.pickMetaTitle('viatour | Cartagena a su medida desde Honduras', 'viatour | Cartagena desde Honduras'), 'viatour | Cartagena a su medida desde Honduras');
  const long = 'Colombia Completa: Bogotá, Medellín y Cartagena';
  assert.equal(seo.pickMetaTitle(`viatour | ${long} a su medida desde Honduras`, `viatour | ${long} desde Honduras`, `viatour | ${long}`), `viatour | ${long}`);
});

test('listing pages describe their catalogue as an ItemList attached to the site', () => {
  const schema = seo.collectionSchema('/paquetes', 'Paquetes', [{ name: 'Punta Cana', path: '/paquetes/punta-cana', image: '/paquetes/punta-cana/1.jpg' }, { name: 'Dubái', path: '/paquetes/dubai' }]);
  assert.equal(schema['@type'], 'CollectionPage');
  assert.equal(schema.isPartOf['@id'], 'https://miviatour.com/#website');
  assert.equal(schema.mainEntity.numberOfItems, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(schema.mainEntity.itemListElement[0])), { '@type': 'ListItem', position: 1, name: 'Punta Cana', url: 'https://miviatour.com/paquetes/punta-cana', image: 'https://miviatour.com/paquetes/punta-cana/1.jpg' });
  assert.equal('image' in schema.mainEntity.itemListElement[1], false);
});
