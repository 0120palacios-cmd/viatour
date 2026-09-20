// Local browser QA. Submissions and Cloudflare are intercepted; no real records are created.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3011';
const errors = [];
let expires = 0, verifications = 0;
page.on('pageerror', error => errors.push(error.message));
await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={render(el,options){window.widgetCount=(window.widgetCount||0)+1; if(options.appearance!=='interaction-only')throw Error('visible widget');setTimeout(()=>options.callback('test-token'),10);return 'widget'},remove(){},reset(){}};` }));
await page.route('**/api/human', route => {
  if (route.request().method() === 'POST') { verifications++; expires = Date.now() + 1800000; }
  return route.fulfill({ json: { ok: true, expires } });
});
await page.route('**/api/newsletter', route => route.fulfill({ status: 201, json: { ok: true } }));
await page.route('**/api/leads', route => route.fulfill({ status: 201, json: { ok: true, id: 'test' } }));
await page.route('**/api/reviews', route => route.fulfill({ status: 201, json: { ok: true, id: 'test' } }));
try {
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/paquetes', '/destinos', '/contacto', '/opiniones', '/opiniones/nueva', '/blog']) {
      await page.goto(origin + path);
      await page.getByRole('button', { name: 'Rechazar', exact: true }).click({ timeout: 1500 }).catch(() => {});
      await page.locator('main').waitFor();
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        containers: [...document.querySelectorAll('main.container-site, main .container-site')].map(el => ({ left: el.getBoundingClientRect().left, padding: parseFloat(getComputedStyle(el).paddingLeft), right: el.getBoundingClientRect().right })),
        overflow: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute').map(el => `${el.tagName}.${el.className}`).slice(0, 8),
      }));
      assert.ok(layout.scroll <= width, `${path} ${width}: ${JSON.stringify(layout)}`);
      assert.ok(layout.containers.every(c => c.padding >= (width < 640 ? 16 : 24)), `${path} gutters ${width}: ${JSON.stringify(layout)}`);
      if (path === '/') {
        if (width < 1200) {
          await page.getByRole('button', { name: 'Abrir menú' }).click();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `menu overflow ${width}`);
          await page.getByRole('button', { name: 'Cerrar menú' }).click();
          await page.getByRole('dialog').waitFor({ state: 'hidden' });
        }
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('[data-orientation="horizontal"]').filter({ has: page.locator('h1') }).count() > 0, true);
        if (process.env.POLISH_SCREENSHOTS) await page.screenshot({ path: `${process.env.POLISH_SCREENSHOTS}/hero-compact-${width}.png` });
        await page.getByRole('button', { name: 'Más opciones', exact: true }).click();
        for (const name of ['Vuelos', 'Hoteles', 'Paquetes', 'Viaje a medida']) {
          await page.getByRole('tab', { name, exact: true }).click();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `expanded ${name} ${width}`);
        }
      }
      if (process.env.POLISH_SCREENSHOTS && ['/', '/contacto', '/destinos'].includes(path)) await page.screenshot({ path: `${process.env.POLISH_SCREENSHOTS}/${path === '/' ? 'home' : path.slice(1)}-${width}.png`, fullPage: true });
      console.log(`PASS ${width} ${path}`);
    }
  }
  assert.equal(verifications, 1, 'one shared verification across forms and navigation');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin);
  assert.equal(await page.locator('section[aria-labelledby="hero-title"] img').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS shared verification and reduced motion; no browser runtime errors.');
} finally { await browser.close(); }
