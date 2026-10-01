import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';

const { travelStyles, findTravelStyle, matchesTravelStyle, matchesSearch, extraDestinations } = load('src/lib/travel-styles.ts');

const pkg = (values) => ({ nombre: '', destino: '', resumen: '', categoria: null, etiquetas: [], slug: 'x', ...values });

test('travel styles have unique slugs and are backed by tags or a region', () => {
  assert.equal(new Set(travelStyles.map(style => style.slug)).size, travelStyles.length);
  for (const style of travelStyles) assert.ok(style.tags?.length || style.region, style.slug);
  assert.equal(findTravelStyle('luna-de-miel').key, 'honeymoon');
  assert.equal(findTravelStyle('no-existe'), undefined);
  assert.equal(findTravelStyle(undefined), undefined);
});

test('a style matches by tag or by region, never by nothing', () => {
  const honeymoon = findTravelStyle('luna-de-miel');
  const beach = findTravelStyle('playa-caribe');
  const cruises = findTravelStyle('cruceros');
  assert.equal(matchesTravelStyle(pkg({ etiquetas: ['parejas', 'luna-de-miel'] }), honeymoon), true);
  assert.equal(matchesTravelStyle(pkg({ etiquetas: ['parejas'] }), honeymoon), false);
  assert.equal(matchesTravelStyle(pkg({ categoria: 'Caribe' }), beach), true);
  assert.equal(matchesTravelStyle(pkg({ categoria: 'Europa' }), beach), false);
  assert.equal(matchesTravelStyle(pkg({ categoria: 'Cruceros' }), cruises), true);
  assert.equal(matchesTravelStyle(pkg({ etiquetas: null }), honeymoon), false);
});

test('search ignores accents and case and needs every word', () => {
  const japan = pkg({ nombre: 'Japón: Tokio, Kioto y Osaka', destino: 'Japón', categoria: 'Asia', etiquetas: ['cultura', 'bucket-list'] });
  assert.equal(matchesSearch(japan, 'japon'), true);
  assert.equal(matchesSearch(japan, 'KIOTO asia'), true);
  assert.equal(matchesSearch(japan, 'bucket list'), true);
  assert.equal(matchesSearch(japan, 'japon playa'), false);
  assert.equal(matchesSearch(japan, '   '), true);
});

test('extra destinations skip featured places, lists and duplicates', () => {
  const items = [
    pkg({ destino: 'Punta Cana', slug: 'pc' }),
    pkg({ destino: 'Cartagena y Ciudad de Panamá', slug: 'cp' }),
    pkg({ destino: 'España, Francia y Suiza', slug: 'efs' }),
    pkg({ destino: 'Japón', slug: 'japon' }),
    pkg({ destino: 'japon', slug: 'japon-2' }),
    pkg({ destino: 'Grecia', slug: 'grecia' }),
  ];
  const result = extraDestinations(items, ['Punta Cana', 'Cartagena']);
  assert.equal(result.map(item => item.slug).join(','), 'japon,grecia');
  assert.equal(extraDestinations(items, [], 1).length, 1);
});
