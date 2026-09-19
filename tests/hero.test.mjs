import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the backdrop's actual lifecycle with a deterministic clock/media query.
function backdrop(images, reduce = false) {
  const state = [], effects = [], timers = new Map();
  let cursor = 0, dirty = false, tree, mediaListener, nextTimer = 0;
  const media = { matches: reduce, addEventListener: (_event, fn) => { mediaListener = fn; }, removeEventListener() {} };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => {
        const next = typeof value === 'function' ? value(state[index]) : value;
        if (!Object.is(next, state[index])) { state[index] = next; dirty = true; }
      }];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
        effects[index]?.cleanup?.();
        effects[index] = { deps, pending: fn };
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/image': { default: 'image' }, '@/lib/hero-images': { heroImages: images } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/components/home/hero-backdrop.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name], window: {
    matchMedia: () => media,
    setInterval: (fn, delay) => { assert.equal(delay, 5500); timers.set(++nextTimer, fn); return nextTimer; },
    clearInterval: id => timers.delete(id),
  } });
  function render() {
    do {
      dirty = false; cursor = 0;
      tree = exports.HeroBackdrop({ children: 'content' });
      for (const effect of effects.filter(Boolean)) if (effect.pending) {
        const fn = effect.pending; effect.pending = null; effect.cleanup = fn();
      }
    } while (dirty);
    return tree;
  }
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children ?? null)];
  }
  render();
  return {
    render, nodes, timers,
    get root() { return tree; },
    photos: () => nodes().filter(node => node.type === 'image'),
    tick() { for (const fn of [...timers.values()]) fn(); render(); },
    reduce(value) { media.matches = value; mediaListener(); render(); },
  };
}
const photos = [{ src: '/hero/one.jpg', alt: 'Fotografía de prueba uno' }, { src: '/hero/two.jpg', alt: 'Fotografía de prueba dos' }];

test('empty and failed hero images retain the tonal background without broken images', () => {
  const empty = backdrop([]);
  assert.equal(empty.photos().length, 0);
  assert.equal(empty.timers.size, 0);
  assert.ok(empty.nodes().some(node => node.props.className?.includes('from-ink')));
  const failed = backdrop(photos);
  failed.photos()[0].props.onError(); failed.render();
  assert.equal(failed.photos().length, 1);
  failed.photos()[0].props.onError(); failed.render();
  assert.equal(failed.photos().length, 0);
  assert.equal(failed.timers.size, 0);
  assert.ok(failed.nodes().some(node => node.props.className?.includes('from-ink')));
});

test('hero rotates every 5.5 seconds, pauses for hover/focus and offers a persistent pause', () => {
  const hero = backdrop(photos);
  assert.equal(hero.photos()[0].props.preload, true);
  assert.equal(hero.photos()[1].props.preload, false);
  assert.equal(hero.photos()[0].props.sizes, '100vw');
  hero.photos().forEach(photo => photo.props.onLoad()); hero.render();
  hero.tick();
  assert.equal(hero.photos()[1].props['aria-hidden'], false);
  assert.match(hero.photos()[1].props.className, /opacity-100/);
  hero.root.props.onMouseEnter(); hero.render();
  assert.equal(hero.timers.size, 0);
  hero.root.props.onMouseLeave(); hero.render();
  assert.equal(hero.timers.size, 1);
  hero.root.props.onFocusCapture(); hero.render();
  assert.equal(hero.timers.size, 0);
  hero.root.props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null }); hero.render();
  assert.equal(hero.timers.size, 1);
  hero.nodes().find(node => node.type === 'button').props.onClick(); hero.render();
  assert.equal(hero.timers.size, 0);
});

test('reduced motion displays only the first image, including when preference changes', () => {
  const hero = backdrop(photos, true);
  assert.equal(hero.photos().length, 1);
  assert.equal(hero.photos()[0].props.src, photos[0].src);
  assert.equal(hero.timers.size, 0);
  hero.reduce(false); hero.tick();
  hero.photos().forEach(photo => photo.props.onLoad()); hero.render(); hero.tick();
  assert.equal(hero.photos()[1].props['aria-hidden'], false);
  hero.reduce(true);
  assert.equal(hero.photos().length, 1);
  assert.equal(hero.photos()[0].props['aria-hidden'], false);
  assert.equal(hero.timers.size, 0);
});

test('rotation waits for loaded photos and skips failures in configured order', () => {
  const hero = backdrop([...photos, { src: '/hero/three.jpg', alt: 'Fotografía de prueba tres' }]);
  hero.photos()[0].props.onLoad(); hero.render(); hero.tick();
  assert.equal(hero.timers.size, 0);
  assert.equal(hero.photos()[0].props['aria-hidden'], false);
  hero.photos()[2].props.onLoad(); hero.photos()[1].props.onLoad(); hero.render();
  hero.tick();
  assert.equal(hero.photos()[1].props['aria-hidden'], false);
  hero.photos()[1].props.onError(); hero.render(); hero.tick();
  assert.equal(hero.photos()[1].props.src, '/hero/three.jpg');
  assert.equal(hero.photos()[1].props['aria-hidden'], false);
});
