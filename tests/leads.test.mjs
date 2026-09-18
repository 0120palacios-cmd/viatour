import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, validation, quote, request } from './security-support.mjs';
function route(options = {}) {
  const rows = [], emails = [];
  const api = load('src/app/api/leads/route.ts', {
    '@/lib/lead-validation': validation,
    '@/lib/public-security': { rateLimit: async () => options.limit || null, readBody: async r => { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 32768) throw Error('large'); return b; }, verifyTurnstile: async (_r, token) => token === 'valid', publicError: (status, error) => Response.json({ok:false,error}, {status}) },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: table => { assert.equal(table, 'leads'); return { insert: row => { rows.push(row); return { abortSignal: async () => ({ error: options.dbError ? {code:'test'} : null }) }; } }; } }) },
    '@/lib/notifications': { notifySubmission: async (...args) => emails.push(args) },
  });
  return { ...api, rows, emails };
}
test('all tabs and lightweight CTAs save normalized data with service role and one notification', async () => {
  const payloads = ['Vuelos','Hoteles','Paquetes','Viaje a medida'].map(quote);
  payloads.push({servicio:'paquetes',fields:{Destino:'Cartagena',Paquete:'Prueba'},formData:{slug:'prueba',nombre:'Prueba',destino:'Cartagena'},turnstileToken:'valid'}, {servicio:'destino',fields:{Destino:'Cartagena'},formData:{slug:'cartagena',nombre:'Cartagena',destination_id:'12345678-1234-1234-1234-123456789abc'},turnstileToken:'valid'}, {servicio:'Viaje a medida',fields:{},turnstileToken:'valid'}, {servicio:'contacto',formData:{nombre:'Prueba',email:'test@example.invalid',mensaje:'Prueba',website:''},turnstileToken:'valid'});
  const multi = quote(); multi.fields.Tipo='Multidestino'; delete multi.formData.origin;
  Object.assign(multi.formData, {'origin-0':'SAP','destination-0':'Madrid','date-0':'2026-10-01','origin-1':'Madrid','destination-1':'SAP','date-1':'2026-10-10'}); payloads.push(multi);
  const one = quote(); one.fields.Tipo='Solo ida'; delete one.formData.end; payloads.push(one);
  for (const payload of payloads) {
    payload.admin='discard'; payload.formData ??= {}; if (Object.keys(payload.formData).length) payload.formData.secret='discard';
    const api = route(); const response = await api.POST(request(payload)); assert.equal(response.status,201,JSON.stringify(payload));
    assert.equal(api.rows.length,1); assert.equal(api.emails.length,1);
    assert.equal(api.rows[0].payload.admin,undefined); assert.equal(api.rows[0].payload.formData.secret,undefined); assert.equal(api.rows[0].payload.turnstileToken,undefined);
    assert.equal((await response.json()).id,api.rows[0].id);
  }
});
test('malformed bodies, missing challenges, enums, counts, date order, segments and oversized fields reject before writes', async () => {
  const invalid = ['{','{}','null','[]', JSON.stringify(quote()).repeat(100)];
  for (const mutate of [p=>p.servicio='unknown', p=>p.currency=['USD'],p=>p.currency='EUR',p=>p.turnstileToken='',p=>p.formData.adults='1.5',p=>p.formData.children='-1',p=>p.formData.rooms='21',p=>p.formData.class='invalid',p=>p.fields.Tipo='invalid',p=>p.formData.start='2026-02-30',p=>p.formData.end='2026-01-01',p=>p.formData.destination='x'.repeat(201),p=>p.formData.website='bot']) {
    const p=quote(); mutate(p); if(p.formData.rooms==='21')p.servicio='Hoteles'; invalid.push(p);
  }
  const tooMany=quote();tooMany.fields.Tipo='Multidestino';for(let i=0;i<7;i++)Object.assign(tooMany.formData,{['origin-'+i]:'SAP',['destination-'+i]:'Madrid',['date-'+i]:'2026-10-01'});invalid.push(tooMany);
  for(const p of invalid){const api=route();assert.equal((await api.POST(request(p))).status,400);assert.equal(api.rows.length,0);assert.equal(api.emails.length,0);}
});
test('rate limited and database failures do not trigger notification',async()=>{
  for(const options of [{limit:Response.json({}, {status:429})},{dbError:true}]){const api=route(options);assert.equal((await api.POST(request(quote()))).status,options.limit?429:502);assert.equal(api.emails.length,0);}
});
test('WhatsApp waits for capture and never opens on HTTP, malformed, network or timeout failure',async()=>{
  for(const outcome of ['success','http','malformed','network','timeout']){
    const navigations=[],events=[];let resolve;const pending=new Promise(done=>resolve=done);
    const api=load('src/lib/quote.ts',{'@/lib/site-config':{siteConfig:{whatsappNumber:'50488668704'}},'@/lib/analytics':{trackEvent:n=>events.push(n)}},{window:{location:{assign:url=>navigations.push(url)}},fetch:async()=>{await pending;if(['network','timeout'].includes(outcome))throw Error(outcome);if(outcome==='malformed')return new Response('invalid');return Response.json(outcome==='success'?{ok:true,id:'test'}:{ok:false},{status:outcome==='http'?502:201});}});
    const handoff=api.requestQuote({service:'Vuelos',fields:{Destino:'Cartagena'},turnstileToken:'valid'});assert.equal(navigations.length,0);resolve();
    if(outcome==='success'){await handoff;assert.equal(navigations.length,1);assert.equal(events.filter(n=>n==='quote_submit').length,1);}else{await assert.rejects(handoff);assert.equal(navigations.length,0);assert.equal(events.length,0);}
  }
});
