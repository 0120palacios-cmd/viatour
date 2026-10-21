import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const folder='output/pdf/commercial-recovery';
const previews=path.join(folder,'previews');fs.mkdirSync(previews,{recursive:true});
const report=[];
for(const file of fs.readdirSync(folder).filter(name=>name.endsWith('.pdf'))){
 const loading=getDocument({data:new Uint8Array(fs.readFileSync(path.join(folder,file))),disableFontFace:true,useSystemFonts:true}); const document=await loading.promise;
 let text='',links=[];
 for(let n=1;n<=document.numPages;n++){
  const page=await document.getPage(n);assert.equal(page.view[2],612);assert.equal(page.view[3],792);
  const content=await page.getTextContent();text+=content.items.map(item=>item.str??'').join(' ')+'\n';
  links.push(...(await page.getAnnotations()).filter(a=>a.subtype==='Link').map(a=>a.url));
  const viewport=page.getViewport({scale:1.3}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  fs.writeFileSync(path.join(previews,`${file.slice(0,-4)}-${n}.png`),canvas.toBuffer('image/png'));
 }
 assert.doesNotMatch(text,/INTERNAL DO NOT PRINT|NO PUBLICAR|notasInternas|comision|service_role/);
 assert.match(text,/Saldo pendiente/);assert.match(text,/Pagos registrados/);
 if(file.startsWith('reservation')){assert.ok(links.includes('https://www.miviatour.com/mi-reserva'));assert.match(text,/Pendiente de confirmación/);}
 if(file==='invoice-deposit-balance.pdf'){assert.match(text,/200[.,]00/);assert.match(text,/950[.,]00/);assert.match(text,/500/);}
 if(file==='invoice-discount.pdf')assert.match(text,/1[.,]050[.,]00/);
 fs.writeFileSync(path.join(previews,`${file.slice(0,-4)}.txt`),text);
 report.push({file,pages:document.numPages,letter:true,portalLink:links.includes('https://www.miviatour.com/mi-reserva'),textChecks:'PASS'});
 await loading.destroy();
}
fs.writeFileSync(path.join(folder,'inspection.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
