import fs from 'node:fs';import path from 'node:path';import * as renderer from '@react-pdf/renderer';import * as jsx from 'react/jsx-runtime';
import {load} from '../tests/security-support.mjs';import {loadTsx,details,reference,itinerary} from '../tests/pdf-support.mjs';import {samples} from '../tests/fixtures/quotation-samples.mjs';
const travelServices=load('src/lib/travel-services.ts',{'@/lib/quotation-details':details});
const ops=load('src/lib/travel-operations.ts',{}, {Set}),types=load('src/lib/reservation-types.ts');
const deps={'server-only':{},'node:fs':fs,'node:path':path,'@react-pdf/renderer':renderer,'react/jsx-runtime':jsx,'@/lib/quotation-details':details,'@/lib/travel-services':travelServices,'@/lib/travel-operations':ops,'@/lib/reservation-types':types,'@/lib/flight-reference':reference,'@/lib/flight-itinerary':itinerary};
const pdf=loadTsx('src/lib/itinerary-pdf.tsx',deps),receipt=loadTsx('src/lib/receipt-pdf.tsx',deps);
const out='output/pdf/travel-operations';fs.mkdirSync(out,{recursive:true});
const cases={direct:'vuelo-directo-ida-y-vuelta',connections:'vuelo-dos-conexiones',mixed:'vuelo-aerolineas-mixtas',hotel:'hotel-habitaciones-complejas',ferry:'ferry-ida-y-vuelta',combined:'combinado-vuelo-hotel-traslado'};
for(const [label,name] of Object.entries(cases)){
 const record=samples[name]();record.quotation.detalles=record.details;
 const r={...record.quotation,id:'11111111-1111-4111-8111-111111111111',codigo:'RES-QA-'+label,estado:'pendiente',prerreserva:label==='ferry',supplier_status:'pendiente',accepted_snapshot:{quotation:record.quotation,items:record.items}};
 const services=travelServices.travelServices(record.details),dates=[...services.vuelos.journeys.flatMap(j=>j.segmentos.flatMap(f=>[f.salidaFecha,f.llegadaFecha])),...services.hoteles.flatMap(h=>[h.checkIn,h.checkOut]),...services.ferry.legs.flatMap(f=>[f.salidaFecha,f.llegadaFecha])].filter(Boolean).sort();r.fecha_inicio=dates[0];r.fecha_fin=dates.at(-1);
 const travel={...ops.emptyTravel(),reviewed:true,passengers:[{...ops.emptyPassenger('p1'),firstName:'Ana María',lastName:'Prueba',documentNumber:'PASSPORTSECRET',birthDate:'1990-01-01'}]};
 fs.writeFileSync(`${out}/itinerary-${label}.pdf`,await pdf.renderItineraryPdf(r,ops.publicTravel(travel),1));
 if(label==='direct'){
  travel.passengers=Array.from({length:18},(_,i)=>({...ops.emptyPassenger('p'+i),firstName:'Pasajero de prueba '+(i+1),lastName:'Apellido compuesto'}));travel.status='emitida';travel.confirmedAt='2026-01-01';travel.tickets=travel.passengers.map(p=>({passengerId:p.id,airline:'Aerolínea de prueba',pnr:'QA123',number:'TEST-'+p.id,issueDate:'2026-01-01',segments:'Tramos de muestra'}));r.supplier_status='confirmada';
  fs.writeFileSync(`${out}/itinerary-many-passengers.pdf`,await pdf.renderItineraryPdf(r,ops.publicTravel(travel),2));
  travel.status='en_emision';travel.estimateApproved=true;fs.writeFileSync(`${out}/itinerary-ticketing.pdf`,await pdf.renderItineraryPdf(r,ops.publicTravel(travel),3));
 }
}
fs.writeFileSync(`${out}/receipt.pdf`,await receipt.renderReceiptPdf({id:'qa',number:'REC-QA-0001',reservation_id:'qa',created_at:'2026-10-20',snapshot:{customer:'Cliente de prueba',reservation:'RES-QA',amount:200,currency:'USD',method:'transferencia',reference:'QA-REFERENCE',date:'2026-10-20',balance:950}}));
console.log('9 anonymized travel PDFs generated. No database or email used.');
