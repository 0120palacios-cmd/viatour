// Assembles output/owner-review/ from the CURRENT code: portal screenshots, email screenshots (fixtures),
// the four customer documents (quotation, reservation confirmation/summary, itinerary, receipt) and their
// page renders. Anonymized fixtures only: no database, session or email provider. Requires that
// scripts/check-trip-portal.mjs and scripts/inspect-trip-documents.mjs ran against the current build.
// Usage: node scripts/build-owner-review.mjs <playwright package.json>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { pdf } from '../tests/pdf-support.mjs';
import { samples, photoBuffers, sampleNow } from '../tests/fixtures/quotation-samples.mjs';

const root = 'output/owner-review';
const dirs = ['portal/mobile', 'portal/desktop', 'emails', 'pdfs', 'real-reservations'];
for (const dir of dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });
const copy = (from, to) => { fs.copyFileSync(from, path.join(root, to)); return to; };
const listed = [];

// Portal: phone widths (320, 390, 430) and desktop widths (1024, 1440), customer view and admin preview.
for (const file of fs.readdirSync('output/trip-portal').filter(name => name.endsWith('.png'))) {
  const width = Number(file.match(/-(\d+)\.png$/)?.[1]);
  listed.push(copy(path.join('output/trip-portal', file), `portal/${width < 768 ? 'mobile' : 'desktop'}/${file}`));
}

// Documents from the fixtures: Miami (registered: "Resumen de reserva"), Cancún (confirmed and issued),
// group (9 travelers, multi-city), cancelled.
const docs = 'output/trip-documents';
for (const [from, to] of [
  ['miami-pendiente-itinerario.pdf', 'itinerary-miami-connections.pdf'], ['cancun-listo-itinerario.pdf', 'itinerary-cancun-package.pdf'], ['grupo-multidestino-itinerario.pdf', 'itinerary-group-9-travelers.pdf'],
  ['miami-pendiente-confirmacion.pdf', 'reservation-summary-pending.pdf'], ['cancun-listo-confirmacion.pdf', 'reservation-confirmation.pdf'], ['cancelada-confirmacion.pdf', 'reservation-summary-cancelled.pdf'],
  ['miami-pendiente-recibo.pdf', 'receipt.pdf'], ['cancun-listo-recibo.pdf', 'receipt-paid-in-full.pdf'],
]) listed.push(copy(path.join(docs, from), `pdfs/${to}`));
for (const [name, label] of [['vuelo-dos-conexiones', 'quotation-flight.pdf'], ['combinado-vuelo-hotel-traslado', 'quotation-package.pdf']]) {
  const record = samples[name]();
  fs.writeFileSync(path.join(root, 'pdfs', label), await pdf.renderQuotationPdf(record, { photos: photoBuffers(record), now: sampleNow }));
  listed.push(`pdfs/${label}`);
}

// Emails from the fixtures, rendered as a mail client would at phone (375) and desktop (720) widths.
const pkg = process.argv[2];
if (pkg) {
  const { chromium } = await import(pathToFileURL(path.join(path.dirname(pkg), 'index.mjs')).href);
  const browser = await chromium.launch({ channel: process.env.PORTAL_BROWSER ?? 'msedge', headless: true });
  for (const [file, name] of [['miami-pendiente-correo.html', 'itinerary'], ['miami-pendiente-correo-recibo.html', 'receipt'], ['cancelada-correo.html', 'cancellation']]) {
    for (const [width, label] of [[375, 'mobile'], [720, 'desktop']]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
      await page.goto(pathToFileURL(path.resolve(docs, file)).href);
      await page.screenshot({ path: path.join(root, 'emails', `${name}-${label}.png`), fullPage: true });
      listed.push(`emails/${name}-${label}.png`);
      await page.close();
    }
  }
  await browser.close();
  for (const file of ['miami-pendiente-correo.txt', 'miami-pendiente-correo-recibo.txt']) listed.push(copy(path.join(docs, file), `emails/${file.replace('miami-pendiente-correo', 'plain-text-itinerary').replace('plain-text-itinerary-recibo', 'plain-text-receipt')}`));
}
fs.writeFileSync(path.join(root, 'INDEX.txt'), `Owner review package (anonymized fixtures, generated ${new Date().toISOString()}).\nReal reservations: real-reservations/ (masked names; see sanitized-summary.md).\n\n${listed.sort().join('\n')}\n`);
console.log(`${listed.length} files in ${root}`);
