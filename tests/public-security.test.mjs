import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, request, quote, validation } from './security-support.mjs';

function security(client, fetch = async () => Response.json({ success: true })) {
  return load('src/lib/public-security.ts', { 'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => client } }, { fetch, process: { env: { TURNSTILE_SECRET_KEY: 'secret' } } });
}
test('distributed rate limit uses route plus first forwarded IP, returns 429, fails closed on RPC errors', async () => {
  let args;
  for (const result of [{data:true}, {data:false}, {error:{code:'fail'}}]) {
    const api=security({rpc:async (...v)=>{args=v;return result;}});
    const response=await api.rateLimit(request({}),'/api/leads',10);
    assert.equal(response?.status,result.error?503:result.data?undefined:429);
    assert.equal(args[0],'hit_rate_limit');assert.equal(args[1].p_key,'/api/leads:192.0.2.1');assert.equal(args[1].p_max,10);assert.equal(args[1].p_window_seconds,3600);
  }
});
test('Turnstile rejects missing, oversized, denied and unavailable tokens and sends IP and secret', async () => {
  let calls=0;
  const api=security({},async (url,options)=>{calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');const body=JSON.parse(options.body);assert.equal(body.remoteip,'192.0.2.1');assert.equal(body.secret,'secret');return Response.json({success:body.response==='valid'});});
  for(const token of [undefined,'','x'.repeat(2049),'invalid'])assert.equal(await api.verifyTurnstile(request({}),token),false);
  assert.equal(calls,1);assert.equal(await api.verifyTurnstile(request({}),'valid'),true);
  assert.equal(await security({},async()=>{throw Error('network');}).verifyTurnstile(request({}),'valid'),false);
});
test('streamed caps count actual bytes without Content-Length and cancel oversized input',async()=>{
  const api=security({});let cancelled=false;
  const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5));controller.enqueue(new Uint8Array(5));},cancel(){cancelled=true;}});
  await assert.rejects(api.readBody(new Request('http://local',{method:'POST',body,duplex:'half'}),8));assert.equal(cancelled,true);
  assert.equal((await api.readBody(request('1234'),4)).length,4);
});
test('Resend sends once to configured support address; failures are logged and do not reject',async()=>{
  for(const fails of [false,true]){
    let calls=0,logs=0;
    const notifications=load('src/lib/notifications.ts',{'server-only':{},'@/lib/site-config':{siteConfig:{supportEmail:'soporte@miviatour.com'}}},{process:{env:{RESEND_API_KEY:'test'}},console:{error:()=>logs++},fetch:async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');const body=JSON.parse(options.body);assert.equal(body.to[0],'soporte@miviatour.com');assert.match(body.text,/technical@example.invalid/);return Response.json({}, {status:fails?500:200});}});
    await notifications.notifySubmission('review','id',{email:'technical@example.invalid'});assert.equal(calls,1);assert.equal(logs,fails?1:0);
    const lead=load('src/app/api/leads/route.ts',{'@/lib/lead-validation':validation,'@/lib/notifications':notifications,'@/lib/public-security':security({rpc:async()=>({data:true})}), '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>({insert:()=>({abortSignal:async()=>({error:null})})})})}});
    assert.equal((await lead.POST(request(quote()))).status,201);
  }
});
test('newsletter validates consent and email, verifies challenges, rate limits and ignores duplicate emails',async()=>{
  const rows=new Map();let denied=false;
  const guard=security({rpc:async()=>({data:!denied})});
  const route=load('src/app/api/newsletter/route.ts',{'@/lib/public-security':guard,'@/lib/supabase/admin':{createAdminClient:()=>({from:table=>{assert.equal(table,'newsletter_subscribers');return {upsert:async(row,options)=>{assert.equal(options.onConflict,'email');assert.equal(options.ignoreDuplicates,true);if(!rows.has(row.email))rows.set(row.email,row);return {error:null};}}}})}});
  const payload={email:'TEST@example.invalid',consent:true,turnstileToken:'valid',nombre:'Prueba'};
  for(const override of [{consent:false},{email:'invalid'},{email:'x'.repeat(255)},{turnstileToken:''}])assert.equal((await route.POST(request({...payload,...override},'newsletter'))).status,400);
  assert.equal(rows.size,0);
  for(let i=0;i<2;i++)assert.equal((await route.POST(request(payload,'newsletter'))).status,201);
  assert.equal(rows.size,1);assert.ok(rows.has('test@example.invalid'));
  denied=true;assert.equal((await route.POST(request(payload,'newsletter'))).status,429);
});
test('reviews reject missing or invalid tokens before uploads or writes and obey rate limits',async()=>{
  const reviewValidation=load('src/lib/review-validation.ts');
  let denied=false,writes=0;
  const route=load('src/app/api/reviews/route.ts',{'@/lib/public-security':security({rpc:async()=>({data:!denied})},async()=>Response.json({success:false})), '@/lib/review-validation':reviewValidation,'@/lib/supabase/admin':{createAdminClient:()=>{writes++;throw Error('must not write');}},'@/lib/notifications':{notifySubmission:async()=>{}}});
  for(const token of ['', 'invalid']){
    const form=new FormData();for(const[k,v]of Object.entries({nombre:'Prueba',email:'test@example.invalid',texto:'Prueba técnica',calificacion:'1',turnstileToken:token}))form.set(k,v);
    assert.equal((await route.POST(new Request('http://local/api/reviews',{method:'POST',body:form}))).status,400);
  }
  assert.equal(writes,0);denied=true;assert.equal((await route.POST(request({},'reviews'))).status,429);
});
