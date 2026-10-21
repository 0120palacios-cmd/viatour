// Only GET requests with limit=0. No customer rows, RPCs, emails, or mutations.
import dotenv from 'dotenv';
dotenv.config({path:'.env.local',quiet:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base || !key){console.log('NOT TESTED: read-only schema credentials unavailable.');process.exit(0);}
if(new URL(base).hostname !== 'akbqbbwolsnzybojzbiy.supabase.co') throw Error('Project identity mismatch; no queries executed.');
console.log('Confirmed project: akbqbbwolsnzybojzbiy; metadata-only GET probes.');
const groups={
 travel:['reservation_travel','reservation_id,revision,public_data,encrypted_private'],
 travel_history:['reservation_travel_history','reservation_id,revision,changed_by'],
 passengers:['reservation_passengers','id'],
 receipts:['payment_receipts','id'],
 quotation_v5:['quotations','id,tipo,detalles,vence_en,version_aceptada'],
 quotation_recovery:['quotations','accepted_version_id,sent_version_id,aceptada_en,aceptada_por,aceptacion_notas'],
 versions:['quotation_versions','id,quotation_id,version,snapshot'],
 reservation_base:['reservations','id,codigo,customer_id,cliente_nombre,cliente_email,cliente_apellido,agente_id'],
 reservation_recovery:['reservations','accepted_version_id,accepted_snapshot,prerreserva,supplier_status,supplier_reference'],
 invoice_v5:['invoices','id,items,cliente_email,cliente_telefono'],
 invoice_recovery:['invoices','commercial_snapshot'],
 portal_otp:['portal_otps','id,reservation_id,code_hash,expires_at,attempts'],
};
for(const [label,[table,fields]] of Object.entries(groups)){
 try{
  const url=new URL(`/rest/v1/${table}`,base);url.searchParams.set('select',fields);url.searchParams.set('limit','0');
  const response=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  console.log(JSON.stringify({check:label,status:response.ok?'COLUMNS PRESENT':'NOT READY',http:response.status,...(!response.ok?{code:body.code}: {})}));
 }catch{console.log(JSON.stringify({check:label,status:'NOT TESTED: connection unavailable'}));}
}
console.log('Read-only column probes only. RLS, constraints, functions and migration history require SQL preflight; no rows retrieved.');
