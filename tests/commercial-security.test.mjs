import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('reservation confirmation renders only a consistent accepted version and passes payments through',async()=>{
 let rendered;
 const pdf=load('src/lib/reservation-pdf.ts',{'server-only':{},'@/lib/reservation-confirmation-pdf':{renderReservationConfirmationPdf:async(reservation,items,payments)=>{rendered={reservation,items,payments};return Buffer.from('%PDF');}},'@/lib/money':{totalAmount:items=>items.reduce((sum,item)=>sum+item.precio_unitario,0)}});
 const reservation={accepted_snapshot:{quotation:{},items:[{precio_unitario:100}]},total:100,prerreserva:true,estado:'cancelada'};
 await pdf.renderReservationPdf(reservation,[{precio_unitario:100}],[{monto:50}]);
 assert.equal(rendered.reservation,reservation);assert.equal(rendered.payments[0].monto,50);
 await assert.rejects(()=>pdf.renderReservationPdf({...reservation,total:90},[{precio_unitario:100}],[]),/no coincide/);
 await assert.rejects(()=>pdf.renderReservationPdf({...reservation,accepted_snapshot:null},[],[]),/aceptada/);
});
test('reservation PDF rejects unauthenticated and forged sessions before reading data', async()=>{
 let reads=0;
 const api=load('src/app/api/mi-reserva/pdf/route.ts',{'next/headers':{cookies:async()=>({get:()=>({value:'forged'})})},'@/lib/portal':{portalCookieName:'test',verifyPortalCookie:()=>null},'@/lib/supabase/admin':{createAdminClient:()=>{reads++;}},'@/lib/reservation-data':{},'@/lib/reservation-pdf':{}});
 assert.equal((await api.GET()).status,401);assert.equal(reads,0);
});
test('customer A PDF uses only authenticated reservation A, ignoring requested B',async()=>{
 let readId;
 const api=load('src/app/api/mi-reserva/pdf/route.ts',{'next/headers':{cookies:async()=>({get:()=>({value:'valid-A'})})},'@/lib/portal':{portalCookieName:'test',verifyPortalCookie:()=>A},'@/lib/supabase/admin':{createAdminClient:()=>({})},'@/lib/reservation-data':{getAdminReservation:async(_,id)=>{readId=id;return {reservation:{id},items:[],payments:[]};}},'@/lib/reservation-pdf':{renderReservationPdf:async()=>Buffer.from('%PDF-test')}});
 const response=await api.GET(new Request(`https://example.invalid/api/mi-reserva/pdf?id=${B}`));
 assert.equal(response.status,200);assert.equal(readId,A);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('admin reservation PDF requires admin session',async()=>{
 const api=load('src/app/api/admin/reservas/[id]/pdf/route.ts',{'@/lib/admin':{requireAdmin:async()=>{throw Error('denied');}},'@/lib/reservation-data':{},'@/lib/reservation-pdf':{},'@/lib/quotation-validation':{}});
 await assert.rejects(api.GET(new Request('https://example.invalid'),{params:Promise.resolve({id:A})}),/denied/);
});
test('portal invoice query always scopes by reservation and excludes drafts',async()=>{
 const filters=[];
 const query={select(){return this;},eq(k,v){filters.push([k,v]);return this;},in(k,v){filters.push([k,Array.from(v)]);return this;},async maybeSingle(){return {data:null,error:null};}};
 const data=load('src/lib/portal-data.ts',{'server-only':{},'@/lib/portal-documents':{},'@/lib/invoice-query':{selectInvoices:cb=>cb('id')}});
 assert.equal(await data.getPortalInvoice({from:()=>query},A,B),null);
 assert.deepEqual(filters,[['id',B],['estado',['emitida','pagada']],['reservation_id',A]]);
});
test('commercial validation errors do not disclose SQL or secrets',()=>{
 const errors=load('src/lib/commercial-errors.ts');
 assert.doesNotMatch(errors.commercialError({code:'XX000',message:'secret database details'}),/secret/);
 assert.match(errors.commercialError({code:'PGRST202'}),/actualización/);
});
