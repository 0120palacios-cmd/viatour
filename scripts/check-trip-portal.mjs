// Visual and responsive QA of the traveller portal with anonymized fixtures (src/lib/trip-fixtures.ts).
// Needs a local server serving /qa/viaje/* (`next dev`, or `next start` with TRIP_FIXTURES=1).
// Usage: node scripts/check-trip-portal.mjs <path to playwright/package.json> [origin]
// No database, session or email is involved: the fixture page renders the shared portal component only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [pkg, origin = 'http://localhost:3021'] = process.argv.slice(2);
if (!pkg) throw new Error('Pass the path to an installed playwright/package.json');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pkg), 'index.mjs')).href);
const out = 'output/trip-portal';
fs.mkdirSync(out, { recursive: true });
const cases = ['miami-emitido', 'miami-pendiente', 'un-viajero', 'cancun-listo', 'grupo-multidestino', 'orlando-familia', 'boletos-parciales', 'hotel-solo', 'en-viaje', 'sin-guia', 'completado', 'cancelada'];
const widths = [320, 375, 390, 430, 768, 1024, 1440];
// Every Mi viaje page: the summary and the four sections (?seccion=).
const sections = ['', 'itinerario', 'viajeros', 'documentos', 'destino'];
const browser = await chromium.launch({ channel: process.env.PORTAL_BROWSER ?? 'msedge', headless: true });
const report = [];
try {
  // Customer endpoints refuse anonymous requests before reading data (no session cookie in this browser).
  const anonymous = await browser.newContext();
  for (const route of ['/api/mi-reserva/itinerario', '/api/mi-reserva/itinerario?format=ics', '/api/mi-reserva/pdf', '/api/mi-reserva/mensajes', '/api/mi-reserva/recibos/11111111-1111-4111-8111-111111111111', '/api/mi-reserva/documentos?ruta=x', '/api/mi-reserva/mensajes/adjuntos/11111111-1111-4111-8111-111111111111']) {
    const status = (await anonymous.request.get(origin + route)).status();
    assert.equal(status, 401, `${route} answered ${status}`);
    report.push({ check: route, status });
  }
  // The chat screen needs the same session: without it, back to the access form.
  const chat = await anonymous.request.get(origin + '/mi-reserva/mensajes', { maxRedirects: 0 });
  assert.ok([302, 303, 307, 308].includes(chat.status()) && (chat.headers().location ?? '').endsWith('/mi-reserva'), `/mi-reserva/mensajes must redirect, got ${chat.status()}`);
  report.push({ check: '/mi-reserva/mensajes', status: chat.status() });
  for (const route of ['/api/mi-reserva/servicios', '/api/mi-reserva/opinion']) {
    const status = (await anonymous.request.post(origin + route, { data: { service: 'auto', rating: 5 } })).status();
    assert.equal(status, 401, `${route} answered ${status}`);
    report.push({ check: `POST ${route}`, status });
  }
  for (const section of ['itinerario', 'viajeros', 'documentos', 'destino']) {
    const response = await anonymous.request.get(`${origin}/mi-reserva/${section}`, { maxRedirects: 0 });
    assert.ok([302, 303, 307, 308].includes(response.status()) && (response.headers().location ?? '').endsWith('/mi-reserva'), `/mi-reserva/${section} must redirect, got ${response.status()}`);
    report.push({ check: `/mi-reserva/${section}`, status: response.status() });
  }
  for (const route of ['/admin/reservas/11111111-1111-4111-8111-111111111111/client-preview', '/admin/reservas/11111111-1111-4111-8111-111111111111/correo']) {
    const response = await anonymous.request.get(origin + route, { maxRedirects: 0 });
    assert.ok([302, 303, 307, 308].includes(response.status()) && (response.headers().location ?? '').includes('/admin/login'), `${route} must redirect to login, got ${response.status()}`);
    report.push({ check: route, status: response.status() });
  }
  const cookies = await anonymous.cookies();
  assert.ok(!cookies.some(cookie => /viatour-portal/.test(cookie.name)), 'no portal cookie may be issued');
  await anonymous.close();
  for (const name of cases) for (const section of sections) {
    // The summary in both views at every width; each section in the customer view at phone and desktop widths.
    for (const mode of section ? ['cliente'] : ['preview', 'cliente']) {
      for (const width of section ? [320, 390, 1440] : widths) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 768 ? 2 : 1 });
        await context.addInitScript(key => { try { localStorage.setItem(key, 'rejected'); } catch {} }, 'viatour-consent-v1');
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && !/mi-reserva\/mensajes|401|Failed to load resource/.test(message.text())) errors.push(message.text()); });
        await page.goto(`${origin}/qa/viaje/${name}?modo=${mode}${section ? `&seccion=${section}` : ''}`, { waitUntil: 'load' });
        const label = section ? `${name}-${section}` : name;
        await page.waitForTimeout(800);
        // Scroll through once so lazy images load before full-page captures, then back to the top.
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 40)); } window.scrollTo(0, 0); });
        await page.waitForTimeout(500);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const body = await page.locator('main').innerText();
        // Touch targets: every visible link and button inside the portal is at least 40px tall (most are 44+).
        const small = await page.evaluate(() => [...document.querySelectorAll('main a, main button, main summary, main label:has(input[type=radio])')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40 && !el.closest('p'); }).map(el => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)));
        const h1 = await page.locator('main h1').count();
        assert.equal(overflow <= 0, true, `${name} ${mode} ${width}px horizontal overflow ${overflow}px`);
        assert.equal(h1, 1, `${name} one h1`);
        assert.doesNotMatch(body, /PASSPORT|birthDate|documentNumber|notasInternas|undefined|NaN|\[object Object\]/);
        assert.deepEqual(errors, [], `${name} ${mode} ${width}px page errors`);
        if ((mode === 'cliente' && [390, 1440].includes(width)) || (mode === 'preview' && width === 390 && name === cases[0])) await page.screenshot({ path: `${out}/${label}-${mode}-${width}.png`, fullPage: true });
        if (mode === 'cliente' && width === 390) await page.screenshot({ path: `${out}/${label}-${mode}-390-first.png`, clip: { x: 0, y: 0, width: 390, height: 844 } });
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        report.push({ name: label, mode, width, overflow, height, smallTargets: small });
        await context.close();
      }
    }
  }
  // Chat screen: messages (miami-emitido), support-request fallback (grupo-multidestino), empty (un-viajero).
  for (const name of ['miami-emitido', 'grupo-multidestino', 'un-viajero']) {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: width < 768 ? 2 : 1 });
      await context.addInitScript(key => { try { localStorage.setItem(key, 'rejected'); } catch {} }, 'viatour-consent-v1');
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/qa/viaje/${name}/mensajes?modo=cliente`, { waitUntil: 'load' });
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const small = await page.evaluate(() => [...document.querySelectorAll('main a, main button')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40 && !el.closest('p'); }).map(el => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)));
      assert.equal(overflow <= 0, true, `chat ${name} ${width}px overflow ${overflow}px`);
      assert.equal(await page.locator('main h1').count(), 1, `chat ${name} one h1`);
      assert.deepEqual(errors, [], `chat ${name} ${width}px page errors`);
      await page.screenshot({ path: `${out}/chat-${name}-${width}.png`, fullPage: false });
      report.push({ name: `chat-${name}`, width, overflow, smallTargets: small });
      await context.close();
    }
  }
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  const flagged = report.filter(item => item.smallTargets?.length);
  console.log(JSON.stringify({ checks: report.length, overflow: 0, smallTargets: flagged.slice(0, 5) }, null, 2));
} finally {
  await browser.close();
}
