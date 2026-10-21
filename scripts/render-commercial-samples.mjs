// Anonymized fixtures only. Uses the application renderers, no database or network.
import fs from 'node:fs';
import path from 'node:path';
import * as renderer from '@react-pdf/renderer';
import * as jsx from 'react/jsx-runtime';
import { load } from '../tests/security-support.mjs';
import { loadTsx, pdf, details, money } from '../tests/pdf-support.mjs';
import { samples } from '../tests/fixtures/quotation-samples.mjs';
const types=load('src/lib/reservation-types.ts');
const data=load('src/lib/quotation-data.ts',{'server-only':{},'@/lib/quotation-details':details});
const reservationPdf=load('src/lib/reservation-pdf.ts',{'server-only':{},'@/lib/quotation-data':data,'@/lib/quotation-pdf':pdf,'@/lib/reservation-types':types,'@/lib/money':money});
const invoicePdf=loadTsx('src/lib/invoice-pdf.tsx',{'server-only':{},'node:fs':fs,'node:path':path,'@react-pdf/renderer':renderer,'react/jsx-runtime':jsx,'@/lib/money':money,'@/lib/reservation-types':types});
const out='output/pdf/commercial-recovery';fs.mkdirSync(out,{recursive:true});
for(const [label,name] of Object.entries({flight:'vuelo-directo-ida-y-vuelta',hotel:'hotel-habitaciones-complejas',ferry:'ferry-ida-y-vuelta',combined:'combinado-vuelo-hotel-traslado'})){
 const record=samples[name]();record.quotation.detalles=record.details;record.quotation.version=1;
 const reservation={...record.quotation,id:'11111111-1111-4111-8111-111111111111',codigo:`RES-PRUEBA-${label}`,estado:'pendiente',prerreserva:label==='ferry',supplier_status:'pendiente',accepted_snapshot:{quotation:record.quotation,items:record.items},total:money.totalAmount(record.items),notas:'INTERNAL DO NOT PRINT'};
 const buffer=await reservationPdf.renderReservationPdf(reservation,record.items,[]);
 fs.writeFileSync(`${out}/reservation-${label}.pdf`,buffer);console.log(label,pdf.pdfPageCount(buffer),'pages');
}
for(const label of ['taxes','discount','deposit-balance']){
 const items=[{descripcion:'Servicio de prueba',tipo:'Hotel',cantidad:2,precio_unitario:500,orden:0},{descripcion:'Impuestos y tasas informados',tipo:'Impuestos y tasas',cantidad:1,precio_unitario:150,orden:1}];
 if(label==='discount')items.push({descripcion:'Descuento informado',tipo:'Descuento',cantidad:1,precio_unitario:100,orden:2});
 const invoice={id:'11111111-1111-4111-8111-111111111111',numero:`FAC-PRUEBA-${label}`,cliente_nombre:'Cliente de prueba',cliente_email:'qa@example.invalid',cliente_telefono:null,items,total:money.totalAmount(items),moneda:'USD',fecha_emision:'2026-10-20',fecha_vencimiento:'2026-11-20',estado:'borrador',notas:'INTERNAL DO NOT PRINT',commercial_snapshot:{reservation_code:'RES-PRUEBA',payment_terms:{deposito:label==='deposit-balance'?'500':''}},payments_received:label==='deposit-balance'?200:0};
 const buffer=await invoicePdf.renderInvoicePdf(invoice);fs.writeFileSync(`${out}/invoice-${label}.pdf`,buffer);console.log(label,pdf.pdfPageCount(buffer),'pages');
}
