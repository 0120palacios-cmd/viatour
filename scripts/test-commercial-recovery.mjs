// Isolated PostgreSQL/WASM only. No network, Supabase credentials, or customer data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const ADMIN = '11111111-1111-4111-8111-111111111111';
const ADMIN2 = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
// Reuse the V5 reconstructed baseline, then add the operational tables it intentionally omitted.
let baseline = fs.readFileSync('scripts/test-quotations-migration.mjs','utf8').split('await db.exec(`')[1].split('`);')[0];
baseline = baseline.replaceAll('${ADMIN}',ADMIN).replaceAll('${ADMIN2}',ADMIN2).replaceAll('${USER}',USER);
await db.exec(baseline);
await db.exec(`
alter table reservations add column customer_id uuid references customers(id), add column cliente_nombre text,
add column cliente_email text, add column cliente_telefono text, add column destino text, add column moneda text,
add column total numeric(12,2), add column estado text default 'pendiente', add column fecha_inicio date,
add column fecha_fin date, add column notas text, add column agente_id uuid, add column created_at timestamptz default now(), add column updated_at timestamptz default now();
create table reservation_items(id uuid primary key default gen_random_uuid(),reservation_id uuid references reservations(id),descripcion text not null,tipo text not null,cantidad numeric not null check(cantidad>0),precio_unitario numeric not null check(precio_unitario>=0),orden int);
create table payments(id uuid primary key default gen_random_uuid(),reservation_id uuid references reservations(id),monto numeric,moneda text);
alter table reservation_items enable row level security; alter table payments enable row level security;
create policy ri_admin on reservation_items for all to authenticated using(is_admin()) with check(is_admin());
create policy p_admin on payments for all to authenticated using(is_admin()) with check(is_admin());
`);
for (const name of ['quotations_v5.sql','invoices_v5.sql','commercial_recovery.sql','commercial_recovery.sql']) await db.exec(fs.readFileSync(`docs/sql/${name}`,'utf8'));
const admin = async (sql,args=[]) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${ADMIN}',false);`);
  try { return (await db.query(sql,args)).rows; } finally { await db.exec('reset role'); }
};
let count=0;
const check = async (name,run) => { await run(); console.log('PASS',name); count++; };
const customer = (await db.query("insert into customers(nombre,email) values('Cliente de prueba','qa@example.invalid') returning id")).rows[0].id;
async function quotation({total=1100, sent=true, expired=false, badLine=false, kind='hotel'}={}) {
  const q=(await db.query(`insert into quotations(codigo,customer_id,cliente_nombre,cliente_email,destino,moneda,total,estado,agente_id,validez) values(gen_random_uuid()::text,$1,'Cliente de prueba','qa@example.invalid','Destino de prueba','USD',$2,$3,$4,'2099-12-31') returning *`,[customer,total,sent?'enviada':'borrador',ADMIN2])).rows[0];
  const snapshot={quotation:{...q,tipo:kind,version:1,vence_en:expired?'2000-01-01T00:00:00Z':'2099-12-31T00:00:00Z',detalles:{pasajeros:{adultos:1,ninos:0,infantes:0},hoteles:[{checkIn:'2099-10-01',checkOut:'2099-10-05'}],paquete:{componentes:[{tipo:'ferry',ferry:{legs:[{salidaFecha:'2099-10-02'}]}}]},notas:'NO PUBLICAR'}},items:[{descripcion:'Servicio',tipo:'Hotel',cantidad:1,precio_unitario:1000,orden:0},{descripcion:'Impuestos',tipo:'Impuestos y tasas',cantidad:1,precio_unitario:200,orden:1},{descripcion:'Descuento',tipo:'Descuento',cantidad:1,precio_unitario:100,orden:2}]};
  if(kind==='vuelo') snapshot.quotation.detalles.vuelos={journeys:[{segmentos:[{id:'qa-flight',origen:'SAP',destino:'MIA',salidaFecha:'2099-10-01',llegadaFecha:'2099-10-01'}]}]};
  if(badLine) snapshot.items[0].descripcion=null;
  const v=(await db.query('insert into quotation_versions(quotation_id,version,snapshot,emitida_por) values($1,1,$2,$3) returning id',[q.id,JSON.stringify(snapshot),ADMIN])).rows[0].id;
  await db.query('update quotations set sent_version_id=$2 where id=$1',[q.id,v]);
  return {q:q.id,v,snapshot};
}
const accept=x=>admin('select accept_quotation($1,$2,$3)',[x.q,x.v,'Confirmación de prueba']);
const convert=(x,pre=false)=>admin('select convert_accepted_quotation($1,$2,$3,$4) as id',[x.q,x.v,pre,'Prueba']);
const first=await quotation();
await check('migration reruns; sent quotation accepted with exact version, actor and timestamp',async()=>{
  await accept(first); const q=(await db.query('select * from quotations where id=$1',[first.q])).rows[0];
  assert.equal(q.accepted_version_id,first.v);assert.equal(q.aceptada_por,ADMIN);assert.ok(q.aceptada_en);
});
await check('repeated acceptance is idempotent',()=>accept(first));
await check('accepted quotation cannot be unlocked',()=>assert.rejects(admin("update quotations set estado='borrador' where id=$1",[first.q])));
await check('accepted version immutable',()=>assert.rejects(db.query("update quotation_versions set snapshot='{}' where id=$1",[first.v])));
await check('unsent quotation rejected',async()=>assert.rejects(accept(await quotation({sent:false}))));
await check('expired issued version rejected',async()=>assert.rejects(accept(await quotation({expired:true}))));
let reservation;
await check('prerreservation preserves customer, agent, all components, dates and total',async()=>{
  reservation=(await convert(first,true))[0].id;
  const r=(await db.query('select * from reservations where id=$1',[reservation])).rows[0];
  assert.equal(r.prerreserva,true); assert.equal(r.customer_id,customer);assert.equal(r.agente_id,ADMIN2);assert.equal(r.total,'1100.00');assert.equal(r.supplier_status,'pendiente');assert.equal(r.accepted_version_id,first.v);assert.deepEqual(r.accepted_snapshot,JSON.parse(JSON.stringify(first.snapshot)));assert.equal(new Date(r.fecha_inicio).toISOString().slice(0,10),'2099-10-01');
});
await check('repeat conversion opens original record',async()=>assert.equal((await convert(first))[0].id,reservation));
await check('no automatic invoice',async()=>assert.equal((await db.query('select count(*)::int n from invoices')).rows[0].n,0));
await check('prerreservation cannot be invoiced',()=>assert.rejects(admin("select create_reservation_invoice($1,'2099-12-31')",[reservation])));
await check('promotion does not claim supplier confirmation',async()=>{await admin('update reservations set prerreserva=false where id=$1',[reservation]);const r=(await db.query('select * from reservations where id=$1',[reservation])).rows[0];assert.equal(r.supplier_status,'pendiente');assert.equal(r.promoted_by,ADMIN);});
await check('cannot demote or claim unsupported confirmation',async()=>{await assert.rejects(admin('update reservations set prerreserva=true where id=$1',[reservation]));await assert.rejects(admin("update reservations set estado='confirmada' where id=$1",[reservation]));});
await check('frozen financial data cannot change',()=>assert.rejects(admin('update reservations set total=1 where id=$1',[reservation])));
await check('accepted services cannot be deleted',()=>assert.rejects(admin('delete from reservation_items where reservation_id=$1',[reservation])));
let invoice;
await check('manual invoice contains taxes and subtracts discounts; no internal notes',async()=>{invoice=(await admin("select create_reservation_invoice($1,'2099-12-31') id",[reservation]))[0].id;const i=(await db.query('select * from invoices where id=$1',[invoice])).rows[0];assert.equal(Number(i.total),1100);assert.equal(i.items.length,3);assert.equal(i.notas,null);assert.equal(i.estado,'borrador');});
await check('repeated invoice request returns the same invoice',async()=>assert.equal((await admin("select create_reservation_invoice($1,'2099-12-31') id",[reservation]))[0].id,invoice));
await check('cannot mark unpaid invoice paid',()=>assert.rejects(admin("update invoices set estado='pagada' where id=$1",[invoice])));
await check('real matching-currency payments permit paid status',async()=>{await db.query("insert into payments(reservation_id,monto,moneda) values($1,1100,'USD')",[reservation]);await admin("update invoices set estado='pagada' where id=$1",[invoice]);});
await check('finalized invoice cannot be overwritten',()=>assert.rejects(admin('update invoices set total=1 where id=$1',[invoice])));
await check('direct conversion remains pending with full service snapshot',async()=>{const x=await quotation();await accept(x);const r=(await convert(x))[0].id;assert.equal((await db.query('select prerreserva from reservations where id=$1',[r])).rows[0].prerreserva,false);});
await check('mismatched total causes no partial reservation',async()=>{const x=await quotation({total:999});await assert.rejects(accept(x));await assert.rejects(convert(x));assert.equal((await db.query('select count(*)::int n from reservations where quotation_id=$1',[x.q])).rows[0].n,0);});
await check('item insertion failure rolls back parent reservation',async()=>{const x=await quotation();await accept(x);await db.exec("alter table reservation_items add constraint simulated_failure check(descripcion <> 'Servicio') not valid");await assert.rejects(convert(x));assert.equal((await db.query('select count(*)::int n from reservations where quotation_id=$1',[x.q])).rows[0].n,0);await db.exec('alter table reservation_items drop constraint simulated_failure');});
await check('non-admin cannot accept, convert, invoice or read reservations',async()=>{
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${USER}',false)`);
  try{await assert.rejects(db.query('select accept_quotation($1,$2,$3)',[first.q,first.v,'test']));await assert.rejects(db.query('select convert_accepted_quotation($1,$2,false,$3)',[first.q,first.v,'test']));await assert.rejects(db.query("select create_reservation_invoice($1,'2099-12-31')",[reservation]));assert.equal((await db.query('select * from reservations')).rows.length,0);}finally{await db.exec('reset role');}
});
await check('anonymous RPC invocation denied',async()=>{await db.exec('set role anon');try{await assert.rejects(db.query("select create_reservation_invoice($1,'2099-12-31')",[reservation]));}finally{await db.exec('reset role');}});
await check('additional accepted services cannot be inserted later',()=>assert.rejects(admin("insert into reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden) values($1,'Extra','Hotel',1,10,99)",[reservation])));
await check('legacy accepted version can be reviewed without changing its terms',async()=>{const x=await quotation();await db.query("update quotations set estado='aceptada',version_aceptada=1 where id=$1",[x.q]);await accept(x);const q=(await db.query('select * from quotations where id=$1',[x.q])).rows[0];assert.equal(q.accepted_version_id,x.v);assert.equal(q.total,'1100.00');});
await check('operational save preserves accepted items and amounts',async()=>{await admin('select save_reservation_record($1,$2,$3)',[reservation,JSON.stringify({estado:'pendiente',supplier_status:'pendiente',notas:'Solo uso interno'}),JSON.stringify([])]);assert.equal((await db.query('select count(*)::int n from reservation_items where reservation_id=$1',[reservation])).rows[0].n,3);});
await check('different customer association rejects conversion',async()=>{const x=await quotation();await db.query('update quotations set customer_id=null where id=$1',[x.q]);await accept(x);await assert.rejects(convert(x));});
console.log(`${count} checks passed on reconstructed isolated PostgreSQL; NOT production verification.`);
if(process.env.TEST_TRAVEL_OPERATIONS === '1') await (await import('./test-travel-sql-cases.mjs')).runTravelChecks({db,admin,check,quotation,accept,convert,ADMIN,USER});
await db.close();
