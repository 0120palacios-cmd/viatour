import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createCanvas} from '@napi-rs/canvas';import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const folder='output/pdf/travel-operations',out=path.join(folder,'previews');fs.mkdirSync(out,{recursive:true});const report=[];
for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.pdf'))){const loading=getDocument({data:new Uint8Array(fs.readFileSync(path.join(folder,file))),disableFontFace:true,useSystemFonts:true});const doc=await loading.promise;let text='',links=[];
 for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);assert.equal(page.view[2],612);assert.equal(page.view[3],792);text+=(await page.getTextContent()).items.map(x=>x.str??'').join(' ')+'\n';links.push(...(await page.getAnnotations()).map(x=>x.url));const viewport=page.getViewport({scale:1.3}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;fs.writeFileSync(path.join(out,`${file.slice(0,-4)}-${i}.png`),canvas.toBuffer('image/png'));}
 assert.doesNotMatch(text,/PASSPORTSECRET|1990-01-01|INTERNAL|service_role/);
 if(file.startsWith('itinerary')){assert.match(text,/Su itinerario de viaje/);assert.ok(links.includes('https://www.miviatour.com/mi-reserva'));assert.doesNotMatch(text,/Total aceptado|Saldo pendiente|Precio unitario/);}
 if(file==='receipt.pdf'){assert.match(text,/200[.,]00/);assert.match(text,/950[.,]00/);}
 if(file==='itinerary-combined.pdf'){assert.match(text,/Terminal 3/);assert.match(text,/Chichén Itzá/);assert.match(text,/23 kg/);}
 if(file==='itinerary-many-passengers.pdf'){assert.match(text,/Pasajero de prueba 18/);assert.match(text,/TEST-p17/);}
 if(file==='itinerary-ticketing.pdf'){assert.match(text,/En proceso de emisión/);assert.doesNotMatch(text,/Boleto TEST/);}
 fs.writeFileSync(path.join(out,file.replace('.pdf','.txt')),text);report.push({file,pages:doc.numPages,letter:true,checks:'PASS'});await loading.destroy();}
fs.writeFileSync(path.join(folder,'inspection.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
