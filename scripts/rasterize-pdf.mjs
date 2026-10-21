// Renders each page of the given PDFs to PNG next to them (visual QA helper). Usage: node scripts/rasterize-pdf.mjs <file.pdf>...
import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
for (const file of process.argv.slice(2)) {
  const loading = getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableFontFace: true, useSystemFonts: true });
  const pdf = await loading.promise;
  for (let index = 1; index <= pdf.numPages; index++) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    fs.writeFileSync(file.replace(/\.pdf$/, `-${index}.png`), canvas.toBuffer('image/png'));
  }
  console.log(file.split(/[\/]/).pop(), pdf.numPages, 'pages');
  await loading.destroy();
}
