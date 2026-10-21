// Visual QA of the customer documents and emails rendered from anonymized fixtures by the local QA route
// (/qa/viaje/<case>/<document>). Saves each PDF, a PNG per page, its text, and the email HTML/text, then
// checks page size and that no internal or private value leaks. No database, session or email provider.
// Usage: node scripts/inspect-trip-documents.mjs [origin]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const origin = process.argv[2] ?? 'http://localhost:3021';
const out = 'output/trip-documents';
fs.mkdirSync(path.join(out, 'pages'), { recursive: true });
const cases = ['miami-pendiente', 'cancun-listo', 'grupo-multidestino', 'cancelada'];
const forbidden = /INTERNAL DO NOT PRINT|PASSPORT|birthDate|documentNumber|notasInternas|undefined|NaN|\[object Object\]|trip\.[a-z]/;
const report = [];
for (const name of cases) {
  for (const doc of ['itinerario.pdf', 'confirmacion.pdf', 'recibo.pdf']) {
    const response = await fetch(`${origin}/qa/viaje/${name}/${doc}`);
    assert.equal(response.status, 200, `${name}/${doc} ${response.status} ${await response.clone().text().catch(() => '')}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const file = `${name}-${doc}`;
    fs.writeFileSync(path.join(out, file), bytes);
    const loading = getDocument({ data: bytes.slice(), disableFontFace: true, useSystemFonts: true });
    const pdf = await loading.promise;
    let text = '';
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      assert.equal(Math.round(page.view[2]), 612); assert.equal(Math.round(page.view[3]), 792);
      text += (await page.getTextContent()).items.map(item => item.str ?? '').join(' ') + '\n';
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      fs.writeFileSync(path.join(out, 'pages', `${file.replace('.pdf', '')}-${index}.png`), canvas.toBuffer('image/png'));
    }
    assert.doesNotMatch(text, forbidden, `${file} leaks`);
    if (doc === 'itinerario.pdf') assert.doesNotMatch(text, /Total de la reserva|Saldo pendiente|Precio/, `${file} shows money`);
    fs.writeFileSync(path.join(out, file.replace('.pdf', '.txt')), text);
    report.push({ file, pages: pdf.numPages });
    await loading.destroy();
  }
  for (const doc of ['correo.html', 'correo.txt', 'correo-recibo.html', 'correo-recibo.txt']) {
    const response = await fetch(`${origin}/qa/viaje/${name}/${doc}`);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.doesNotMatch(body, forbidden, `${name}/${doc} leaks`);
    // The cancellation notice has no portal button; every other email leads to Mi viaje.
    if (doc.endsWith('.html') && !(name === 'cancelada' && doc === 'correo.html')) assert.match(body, /mi-reserva\?ref=VT-/);
    fs.writeFileSync(path.join(out, `${name}-${doc}`), body);
  }
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
