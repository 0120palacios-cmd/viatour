import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

const homeDestinations = [
  { slug: 'punta-cana', nombre: 'Punta Cana', image: '/destinos/punta-cana.jpg' },
  { slug: 'cartagena', nombre: 'Cartagena', image: '/destinos/cartagena.jpg' },
  { slug: 'europa', nombre: 'Europa', image: '/destinos/europa.jpg' },
  { slug: 'dubai', nombre: 'Dubái', image: '/destinos/dubai.jpg' },
  { slug: 'cruceros', nombre: 'Cruceros', image: '/destinos/cruceros.jpg' },
  { slug: 'cancun', nombre: 'Cancún', image: '/destinos/cancun.jpg' },
];
const utils = load('src/lib/guide-utils.ts', { '@/lib/home-destinations': { homeDestinations } });

test('a guide takes the destination named first in its title', () => {
  assert.equal(utils.guideDestination('Cómo viajar a Punta Cana desde Honduras')?.slug, 'punta-cana');
  assert.equal(utils.guideDestination('Cancún o Punta Cana: cómo elegir su destino')?.slug, 'cancun');
  assert.equal(utils.guideDestination('Dubai desde Honduras: guía práctica')?.slug, 'dubai');
  assert.equal(utils.guideDestination('Viajar a Europa desde Honduras: ETIAS')?.slug, 'europa');
  assert.equal(utils.guideDestination('Cruceros desde Honduras')?.slug, 'cruceros');
});

test('guides about no single destination keep the tonal cover', () => {
  assert.equal(utils.guideDestination('Requisitos para viajar fuera de Honduras'), null);
  assert.equal(utils.guideDestination('A dónde viajar en temporada alta desde Honduras'), null);
  // Whole words only: "Europeas" is not "Europa".
  assert.equal(utils.guideDestination('Ciudades europeas'), null);
});

test('reading time rounds to whole minutes and is never zero', () => {
  assert.equal(utils.readingMinutes('Hola.'), 1);
  assert.equal(utils.readingMinutes(Array(1000).fill('palabra').join(' ')), 5);
});

test('guide outline lists section headings with unique, accent-free anchors', () => {
  // #### renders as a sub-heading (h3) and stays out of the contents list.
  const outline = utils.guideOutline('## Pasaporte vigente\n\nTexto\n\n#### Detalle\n\n### Visas según el **destino**\n\n## Pasaporte vigente\n');
  assert.deepEqual(Array.from(outline, item => item.id), ['pasaporte-vigente', 'visas-segun-el-destino', 'pasaporte-vigente-2']);
  assert.deepEqual(Array.from(outline, item => item.text), ['Pasaporte vigente', 'Visas según el destino', 'Pasaporte vigente']);
});
