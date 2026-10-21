import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './security-support.mjs';
const counts=load('src/lib/passenger-counts.ts');
const expected={pasajeros:{adultos:1,ninos:1,infantes:0}};
test('accepted passenger counts allow incomplete draft and require exact reviewed categories',()=>{
 const draft={passengers:[{category:'adulto'}],reviewed:false,status:'pendiente'};
 counts.validatePassengerCounts(draft,expected);
 assert.throws(()=>counts.validatePassengerCounts({...draft,reviewed:true},expected));
 counts.validatePassengerCounts({...draft,reviewed:true,passengers:[...draft.passengers,{category:'nino'}]},expected);
 assert.throws(()=>counts.validatePassengerCounts({...draft,passengers:[...draft.passengers,{category:'adulto'}]},expected));
});
test('missing accepted passenger counts cannot be treated as reviewed',()=>assert.throws(()=>counts.validatePassengerCounts({passengers:[],reviewed:true,status:'pendiente'},{})));
for (const date of ['2026-02-30','2099-01-01']) {
 test(`payment rejects invalid or future received date ${date} before database access`,async()=>{
  let reads=0;
  const actions=load('src/app/admin/reservas/actions.ts',{
   '@/lib/admin':{requireAdmin:async()=>({client:{from(){reads++;throw Error('unexpected database access');}}})},
   '@/lib/quotation-validation':{validUuid:()=>true},
   '@/lib/reservation-types':{paymentMethods:['efectivo']},
   '@/lib/portal-summary':{hondurasToday:()=> '2026-10-20'},
  });
  const form=new FormData();for(const [k,v] of Object.entries({reservation_id:'qa',monto:'100',moneda:'USD',metodo:'efectivo',fecha_pago:date}))form.set(k,v);
  assert.match((await actions.recordPayment({},form)).error,/fecha/);assert.equal(reads,0);
 });
}
