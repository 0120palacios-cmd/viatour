// Anonymous application-rendered quotation for independent visual comparison.
import fs from 'node:fs';
import {pdf} from '../tests/pdf-support.mjs';
import {samples,photoBuffers,sampleNow} from '../tests/fixtures/quotation-samples.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import assert from 'node:assert/strict';
const record=samples['vuelo-directo-ida-y-vuelta']();
const buffer=await pdf.renderQuotationPdf(record,{photos:photoBuffers(record),now:sampleNow});
fs.mkdirSync('output/pdf/final-audit',{recursive:true});
fs.writeFileSync('output/pdf/final-audit/quotation.pdf',buffer);
const loading=getDocument({data:new Uint8Array(buffer),disableFontFace:true,useSystemFonts:true});
const doc=await loading.promise;
for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);assert.equal(page.view[2],612);assert.equal(page.view[3],792);const viewport=page.getViewport({scale:1.3}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;fs.writeFileSync(`output/pdf/final-audit/quotation-${n}.png`,canvas.toBuffer('image/png'));}
console.log(`${doc.numPages} quotation pages rendered, Letter verified`);await loading.destroy();
