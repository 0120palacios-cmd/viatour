import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './security-support.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('prerreservation PDF preserves cancellation status',async()=>{
 let displayed;
 const pdf=load('src/lib/reservation-pdf.ts',{'server-only':{},'@/lib/quotation-data':{toRecord:()=>({details:{pago:{deposito:''}}})},'@/lib/quotation-pdf':{renderQuotationPdf:async(_,options)=>{displayed=options.reservation.status;}},'@/lib/reservation-types':{reservationStatusLabel:()=> 'Cancelada'},'@/lib/money':{totalAmount:()=>100}});
 await pdf.renderReservationPdf({accepted_snapshot:{quotation:{},items:[{}]},total:100,prerreserva:true,estado:'cancelada'},[{}],[]);
 assert.equal(displayed,'Prerreservación · Cancelada');
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
