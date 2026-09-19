// Run with Playwright installed, or PLAYWRIGHT_PACKAGE pointing to its package.json.
// All lead/challenge/WhatsApp traffic is intercepted; this creates no real leads.
// Start the local dev server with NEXT_PUBLIC_TURNSTILE_SITE_KEY=hero-smoke-test-key.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { validation } from './security-support.mjs';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: process.env.HERO_BROWSER || 'msedge', headless: true });
const page = await browser.newPage();
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3011';
const errors = [], captures = [], navigations = [];
let outcome = 'success', releaseCapture;
page.on('pageerror', error => errors.push(error.message));
await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={render(el,options){setTimeout(()=>options.callback('test-token'),0);return 'test-widget'},remove(){}};` }));
await page.route('**/api/leads', async route => {
  const payload = route.request().postDataJSON();
  assert.equal(payload.turnstileToken, 'test-token');
  validation.validateLead(payload);
  captures.push(payload);
  if (outcome === 'pending') await new Promise(resolve => { releaseCapture = resolve; });
  await route.fulfill({ status: outcome === 'failure' ? 502 : 201, json: outcome === 'failure' ? { ok: false } : { ok: true, id: 'test-lead' } });
});
await page.route('https://wa.me/**', async route => { navigations.push(route.request().url()); await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Intercepted test handoff</title>' }); });
const hero = page.locator('section[aria-labelledby="hero-title"]');
const form = hero.locator('form');
const submit = () => form.getByRole('button', { name: 'Solicitar cotización por WhatsApp' }).click();
async function ready() {
  await page.goto(origin);
  await page.getByRole('button', { name: 'Rechazar', exact: true }).click({ timeout: 1000 }).catch(() => {});
  await form.getByRole('button', { name: 'Solicitar cotización por WhatsApp' }).waitFor();
}
async function fill(service = 'Vuelos') {
  if (service !== 'Vuelos') await form.getByLabel('Tipo de viaje', { exact: true }).selectOption(service);
  await form.locator('summary').filter({ hasText: 'Destino' }).click();
  if (service === 'Vuelos') await form.locator('[name="origin"]').fill('SAP');
  if (service === 'Paquetes') await form.locator('[name="destination"]').selectOption({ index: 1 });
  else await form.locator('[name="destination"]').fill('Cartagena');
  await form.locator('summary').filter({ hasText: 'Destino' }).click();
  await form.locator('summary').filter({ hasText: 'Fechas' }).click();
  if (['Vuelos', 'Hoteles'].includes(service)) {
    await form.locator('[name="start"]').fill('2027-10-01');
    await form.locator('[name="end"]').fill('2027-10-10');
  } else await form.locator('[name="approximate"]').fill('Octubre de 2027');
  await form.locator('summary').filter({ hasText: 'Fechas' }).click();
  await form.locator('summary').filter({ hasText: 'Pasajeros' }).click();
  await form.locator('[name="adults"]').fill('2');
  await form.locator('summary').filter({ hasText: 'Pasajeros' }).click();
}
try {
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await ready();
    assert.equal(await hero.locator('img').count(), 0, 'config starts empty');
    const passengerControl = form.locator('summary').filter({ hasText: 'Pasajeros' });
    await passengerControl.focus(); await page.keyboard.press('Enter');
    assert.equal(await form.locator('[name="adults"]').isVisible(), true);
    const bounds = await form.locator('[name="adults"]').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `open control clipped at ${width}`);
    await page.keyboard.press('Enter');
    assert.equal(await form.locator('[name="adults"]').isVisible(), false);
    await fill();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `compact overflow at ${width}`);
    if (process.env.HERO_SCREENSHOTS) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${process.env.HERO_SCREENSHOTS}/hero-${width}.png` });
    }
    await form.getByRole('button', { name: 'Más opciones' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await hero.getByRole('tab').count(), 4);
    assert.equal(await form.locator('[name="destination"]').inputValue(), 'Cartagena');
    assert.equal(await form.locator('[name="start"]').inputValue(), '2027-10-01');
    assert.equal(await form.locator('[name="adults"]').inputValue(), '2');
    assert.ok(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'tab'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `expanded overflow at ${width}`);
    await page.keyboard.press('ArrowRight');
    await hero.getByRole('tab', { name: 'Hoteles', selected: true }).waitFor();
  }
  await ready();
  await submit();
  assert.equal(await form.locator('[name="origin"]').isVisible(), true, 'invalid required fields open their compact group');
  assert.equal(await form.locator('[name="origin"]').evaluate(element => element === document.activeElement), true);
  assert.equal(captures.length, 0);
  await ready(); await fill(); outcome = 'failure';
  await submit();
  await form.getByRole('alert').waitFor();
  assert.equal(navigations.length, 0);
  assert.equal(page.url(), `${origin}/`);
  outcome = 'pending'; await submit();
  await page.waitForTimeout(200);
  assert.equal(navigations.length, 0, 'no handoff before server confirms capture');
  assert.ok(releaseCapture); releaseCapture();
  await page.waitForURL('**/wa.me/**', { timeout: 5000 });
  assert.equal(navigations.length, 1);
  assert.ok(navigations[0].startsWith('https://wa.me/50488668704?text='));
  outcome = 'success';
  for (const service of ['Hoteles', 'Paquetes', 'Viaje a medida']) {
    await ready(); await fill(service); await submit();
    await page.waitForURL('**/wa.me/**', { timeout: 5000 });
    assert.equal(captures.at(-1).service, service);
  }
  await ready(); await fill();
  await form.getByRole('button', { name: 'Más opciones' }).click();
  await form.getByLabel('Tipo de viaje').selectOption('Multidestino');
  for (const id of [0, 1]) {
    await form.locator(`[name="origin-${id}"]`).fill(id ? 'Madrid' : 'SAP');
    await form.locator(`[name="destination-${id}"]`).fill(id ? 'SAP' : 'Madrid');
    await form.locator(`[name="date-${id}"]`).fill(id ? '2027-10-10' : '2027-10-01');
  }
  await submit(); await page.waitForURL('**/wa.me/**', { timeout: 5000 });
  assert.equal(captures.at(-1).fields.Tipo, 'Multidestino');
  assert.equal(navigations.length, 5);
  assert.deepEqual(errors, []);
  console.log('PASS: 320/390/1024/1440px without overflow; keyboard compact controls/expansion/tabs; retained values; four compact services; expanded multi-city; failed and pending capture block WhatsApp; success hands off to the unchanged number.');
} finally { await browser.close(); }
