// Assembles output/owner-review-mi-viaje-premium/ from the CURRENT build: screenshots of every Mi viaje
// screen and state, the request, chat-attachment and feedback flows, and the itinerary PDFs, all from the
// anonymized fixtures (src/lib/trip-fixtures.ts). No database, session, storage or email: the QA pages and
// their mock APIs store nothing.
// Needs a local server serving /qa/viaje/* (`next start` with TRIP_FIXTURES=1).
// Usage: node scripts/build-owner-review-premium.mjs <path to playwright/package.json> [origin]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [pkg, origin = 'http://localhost:3021'] = process.argv.slice(2);
if (!pkg) throw new Error('Pass the path to an installed playwright/package.json');
const { chromium } = await import(pathToFileURL(path.join(path.dirname(pkg), 'index.mjs')).href);
const root = 'output/owner-review-mi-viaje-premium';
const folders = ['01-mobile-overview', '02-mobile-navigation', '03-airline-confirmation', '04-destination', '05-things-to-do', '06-rental-car', '07-services', '08-chat', '09-chat-attachments', '10-review-flow', '11-ugc-referral', '12-desktop', '13-itinerary-pdf', '14-trip-states'];
for (const folder of folders) fs.mkdirSync(path.join(root, folder), { recursive: true });
const browser = await chromium.launch({ channel: process.env.PORTAL_BROWSER ?? 'msedge', headless: true });
const listed = [];

async function open(url, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: width < 768 ? 2 : 1, hasTouch: width < 768, isMobile: width < 768 });
  await context.addInitScript(() => { try { localStorage.setItem('viatour-consent-v1', 'rejected'); } catch {} });
  const page = await context.newPage();
  await page.goto(origin + url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 40)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(400);
  return { page, close: () => context.close() };
}
async function capture(folder, name, url, { width = 390, full = false, selector, before } = {}) {
  const { page, close } = await open(url, width);
  if (before) await before(page);
  const file = path.join(root, folder, `${name}.png`);
  // Element captures: hide the fixed bottom bar so it does not cover the element.
  if (selector) await page.addStyleTag({ content: 'nav.fixed { display: none !important; }' });
  if (selector) { await page.locator(selector).first().scrollIntoViewIfNeeded(); await page.locator(selector).first().screenshot({ path: file }); }
  else await page.screenshot({ path: file, fullPage: full });
  listed.push(path.relative(root, file));
  await close();
}
const q = (caso, section = '', mode = 'cliente') => `/qa/viaje/${caso}?modo=${mode}${section ? `&seccion=${section}` : ''}`;

// 01 Mobile overview
await capture('01-mobile-overview', 'miami-emitido-first-screen', q('miami-emitido'));
await capture('01-mobile-overview', 'miami-emitido-full', q('miami-emitido'), { full: true });
await capture('01-mobile-overview', 'orlando-familia-full', q('orlando-familia'), { full: true });
await capture('01-mobile-overview', 'iphone-se-320', q('grupo-multidestino'), { width: 320 });
// 02 Navigation
await capture('02-mobile-navigation', 'bottom-bar-itinerario', q('orlando-familia', 'itinerario'));
await capture('02-mobile-navigation', 'bottom-bar-documentos', q('cancun-listo', 'documentos'));
await capture('02-mobile-navigation', 'desktop-tabs', q('orlando-familia', 'destino'), { width: 1440 });
// 03 Airline confirmation
for (const caso of ['miami-emitido', 'orlando-familia', 'boletos-parciales', 'grupo-multidestino', 'completado']) await capture('03-airline-confirmation', caso, q(caso), { selector: 'section[aria-labelledby="confirmation-title"]' });
await capture('03-airline-confirmation', 'viajeros-9-grupo', q('grupo-multidestino', 'viajeros'), { full: true });
await capture('03-airline-confirmation', 'viajeros-emision-parcial', q('boletos-parciales', 'viajeros'), { full: true });
// 04 Destination
await capture('04-destination', 'miami-mobile', q('miami-emitido', 'destino'), { full: true });
await capture('04-destination', 'miami-desktop', q('miami-emitido', 'destino'), { width: 1440, full: true });
await capture('04-destination', 'nueva-york-mobile-first', q('boletos-parciales', 'destino'));
await capture('04-destination', 'panama-hotel-solo-mobile', q('hotel-solo', 'destino'), { full: true });
// 05 Things to do
for (const caso of ['miami-emitido', 'orlando-familia', 'cancun-listo', 'boletos-parciales']) await capture('05-things-to-do', `${caso}-desktop`, q(caso, 'destino'), { width: 1440, selector: 'section[aria-labelledby="todo-title"]' });
await capture('05-things-to-do', 'miami-mobile-carousel', q('miami-emitido', 'destino'), { selector: 'section[aria-labelledby="todo-title"]' });
// 06 Rental car
await capture('06-rental-car', 'upsell-miami', q('miami-emitido', 'destino'), { selector: 'section[aria-labelledby="car-title"]' });
await capture('06-rental-car', 'booked-orlando', q('orlando-familia', 'destino'), { selector: 'section[aria-labelledby="car-title"]' });
await capture('06-rental-car', 'booked-orlando-itinerary', q('orlando-familia', 'itinerario'), { full: true });
await capture('06-rental-car', 'request-dialog', q('miami-emitido', 'destino'), { before: async page => { await page.locator('section[aria-labelledby="car-title"] button').click(); await page.waitForSelector('role=dialog'); await page.fill('role=dialog >> textarea', 'SUV para 2 personas, retiro en el aeropuerto.'); } });
await capture('06-rental-car', 'request-sent', q('miami-emitido', 'destino'), { before: async page => { await page.locator('section[aria-labelledby="car-title"] button').click(); await page.waitForSelector('role=dialog'); await page.click('role=dialog >> button[type=submit]'); await page.waitForSelector('text=Recibimos su solicitud'); } });
// 07 Services
await capture('07-services', 'mejore-su-viaje-flight-only', q('miami-emitido', 'destino'), { selector: '#mejore' });
await capture('07-services', 'mejore-su-viaje-flight-hotel-car', q('orlando-familia', 'destino'), { selector: '#mejore' });
await capture('07-services', 'mejore-su-viaje-hotel-only', q('hotel-solo', 'destino'), { selector: '#mejore' });
await capture('07-services', 'overview-complete-su-viaje', q('orlando-familia'), { selector: 'section[aria-labelledby="offers-title"]' });
await capture('07-services', 'request-status', q('miami-emitido', 'destino'), { selector: 'section[aria-labelledby="requests-title"]' });
// 08 Chat
await capture('08-chat', 'conversation', '/qa/viaje/miami-emitido/mensajes?modo=cliente');
await capture('08-chat', 'empty', '/qa/viaje/un-viajero/mensajes?modo=cliente');
await capture('08-chat', 'support-request-fallback', '/qa/viaje/grupo-multidestino/mensajes?modo=cliente');
await capture('08-chat', 'desktop', '/qa/viaje/miami-emitido/mensajes?modo=cliente', { width: 1440 });
// 09 Attachments
const photo = Buffer.from(await (await fetch(`${origin}/destinos/que-hacer/miami/bayside.jpg`)).arrayBuffer());
const attach = async page => { await page.locator('input[type=file]').setInputFiles({ name: 'foto-maleta.jpg', mimeType: 'image/jpeg', buffer: photo }); await page.waitForSelector('text=foto-maleta.jpg'); await page.fill('textarea', '¿Esta maleta entra como equipaje de mano?'); };
await capture('09-chat-attachments', 'thread-with-photo-and-pdf', '/qa/viaje/miami-emitido/mensajes?modo=cliente', { before: async page => { await page.evaluate(() => window.scrollTo(0, 0)); } });
await capture('09-chat-attachments', 'file-selected', '/qa/viaje/miami-emitido/mensajes?modo=cliente', { before: attach });
await capture('09-chat-attachments', 'sent', '/qa/viaje/miami-emitido/mensajes?modo=cliente', { before: async page => { await attach(page); await page.click('button[type=submit]'); await page.waitForSelector('text=Mensaje enviado'); await page.waitForTimeout(500); } });
await capture('09-chat-attachments', 'refused-svg', '/qa/viaje/miami-emitido/mensajes?modo=cliente', { before: async page => { await page.locator('input[type=file]').setInputFiles({ name: 'archivo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') }); await page.waitForSelector('text=Solo se pueden adjuntar fotos'); } });
// 10 Reviews
await capture('10-review-flow', 'last-day-soft-question', q('en-viaje'), { selector: '#opinion' });
await capture('10-review-flow', 'after-trip-form', q('completado'), { selector: '#opinion' });
await capture('10-review-flow', 'after-trip-sent', q('completado'), { selector: '#opinion', before: async page => { await page.locator('#opinion label:has(input[value="4"])').click(); await page.fill('#opinion textarea', 'Muy buena atención.'); await page.click('#opinion button[type=submit]'); await page.waitForSelector('text=Recibimos su opinión'); } });
// 11 UGC and referrals
await capture('11-ugc-referral', 'after-trip', q('completado'), { full: true });
await capture('11-ugc-referral', 'during-trip-note', q('en-viaje'), { full: true });
await capture('11-ugc-referral', 'before-trip-note', q('miami-emitido', 'destino'), { selector: 'p:has(a[href="/gira"])' });
// 12 Desktop
for (const [caso, section] of [['orlando-familia', ''], ['orlando-familia', 'itinerario'], ['miami-emitido', 'documentos'], ['grupo-multidestino', 'viajeros']]) await capture('12-desktop', `${caso}${section ? `-${section}` : ''}`, q(caso, section), { width: 1440, full: true });
await capture('12-desktop', 'admin-preview-banner', q('miami-emitido', '', 'preview'), { width: 1440 });
// 14 States
for (const caso of ['miami-pendiente', 'un-viajero', 'grupo-multidestino', 'boletos-parciales', 'hotel-solo', 'en-viaje', 'sin-guia', 'completado', 'cancelada']) await capture('14-trip-states', caso, q(caso));
await capture('14-trip-states', 'sin-guia-destino', q('sin-guia', 'destino'), { full: true });
await capture('14-trip-states', 'cancelada-itinerario', q('cancelada', 'itinerario'));
await browser.close();

// 13 Itinerary PDFs (and each page as an image)
for (const caso of ['miami-emitido', 'orlando-familia', 'grupo-multidestino', 'hotel-solo']) {
  const bytes = new Uint8Array(await (await fetch(`${origin}/qa/viaje/${caso}/itinerario.pdf`)).arrayBuffer());
  const file = path.join(root, '13-itinerary-pdf', `itinerario-${caso}.pdf`);
  fs.writeFileSync(file, bytes);
  listed.push(path.relative(root, file));
  const pdf = await getDocument({ data: bytes.slice(), disableFontFace: true, useSystemFonts: true }).promise;
  for (let index = 1; index <= pdf.numPages; index++) {
    const pageObject = await pdf.getPage(index);
    const viewport = pageObject.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await pageObject.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const png = file.replace(/\.pdf$/, `-p${index}.png`);
    fs.writeFileSync(png, canvas.toBuffer('image/png'));
    listed.push(path.relative(root, png));
  }
}
fs.writeFileSync(path.join(root, 'files.json'), JSON.stringify(listed, null, 2));
console.log(`${listed.length} files in ${root}`);
