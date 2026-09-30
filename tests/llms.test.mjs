import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

const { buildLlmsTxt, buildLlmsFullTxt } = load('src/lib/llms.ts');

const content = {
  siteUrl: 'https://miviatour.com',
  whatsappNumber: '50488668704',
  supportEmail: 'soporte@miviatour.com',
  cities: ['San Pedro Sula', 'Tegucigalpa'],
  reviews: { total: 176, promedio: 4.4, c5: 118, c4: 34, c3: 5, c2: 9, c1: 10 },
  packages: [{ id: 'p1', slug: 'punta-cana-todo-incluido', nombre: 'Punta Cana Todo Incluido', destino: 'Punta Cana', duracion: '5 días / 4 noches', categoria: 'Caribe', resumen: 'Resort frente al mar.', descripcion: 'Descanse frente al Caribe.', incluye: ['Hotel', 'Traslados'], no_incluye: ['Propinas'], itinerario: 'Día 1: Llegada\nDía 2: Playa', precio_desde: 999, moneda: 'USD' }],
  destinations: [{ id: 'd1', slug: 'punta-cana', nombre: 'Punta Cana', intro: 'Playas de arena blanca.', cuerpo: 'Texto largo.', mejor_epoca: 'De diciembre a abril.', meta_descripcion: null, faqs: [{ pregunta: '¿Necesito visa?', respuesta: 'Consulte los requisitos.' }] }],
  posts: [{ id: 'b1', slug: 'guia-punta-cana', titulo: 'Cómo viajar a Punta Cana', categoria: 'Guías', extracto: 'Todo lo que necesita saber.', cuerpo: '## Cuándo ir\n\nDe diciembre a abril.', publicado_en: '2026-09-23', updated_at: '2026-09-23' }],
  faqs: [{ id: 'f1', pregunta: '¿La cotización tiene costo?', respuesta: 'No, es sin costo ni compromiso.' }],
};

test('llms.txt follows the llmstxt.org shape with linked sections', () => {
  const text = buildLlmsTxt(content);
  assert.match(text, /^# viatour\n\n> /);
  for (const heading of ['## Servicios', '## Paquetes de viaje', '## Destinos', '## Guías de viaje', '## Ayuda para planificar', '## Políticas', '## Optional']) assert.ok(text.includes(heading), heading);
  assert.ok(text.includes('- [Punta Cana Todo Incluido](https://miviatour.com/paquetes/punta-cana-todo-incluido): Punta Cana · 5 días / 4 noches · Caribe'));
  assert.ok(text.includes('https://miviatour.com/llms-full.txt'));
  assert.ok(text.includes('4.4 de 5 en 176 opiniones'));
  assert.ok(text.includes('San Pedro Sula, Tegucigalpa'));
});

test('llms files never publish prices, even when a package has one', () => {
  for (const text of [buildLlmsTxt(content), buildLlmsFullTxt(content)]) {
    assert.equal(text.includes('999'), false);
    assert.equal(/\$\s?\d/.test(text), false);
  }
});

test('llms-full.txt carries the full published text', () => {
  const text = buildLlmsFullTxt(content);
  assert.ok(text.includes('Incluye:\n- Hotel\n- Traslados'));
  assert.ok(text.includes('No incluye:\n- Propinas'));
  assert.ok(text.includes('1. Día 1: Llegada\n2. Día 2: Playa'));
  assert.ok(text.includes('Mejor época para viajar: De diciembre a abril.'));
  assert.ok(text.includes('### ¿La cotización tiene costo?'));
  // Guide headings move below the file's own "###" entries.
  assert.ok(text.includes('##### Cuándo ir'));
});

test('llms files degrade to the fixed facts when content is unavailable', () => {
  const empty = { ...content, packages: [], destinations: [], posts: [], faqs: [], reviews: null, cities: [] };
  const text = buildLlmsTxt(empty);
  assert.ok(text.includes('## Servicios'));
  assert.equal(text.includes('## Paquetes de viaje'), false);
  assert.equal(text.includes('opiniones publicadas en el sitio'), false);
  assert.ok(text.includes('- Área de servicio: Honduras.'));
});
