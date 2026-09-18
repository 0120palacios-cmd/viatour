import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file,deps={},globals={}) {
 deps={ '@/lib/lead-validation':file === 'src/app/api/leads/route.ts' ? leadValidation : undefined, '@/lib/public-security':{publicError:(status,error)=>Response.json({ok:false,error},{status}),rateLimit:async()=>null, verifyTurnstile:async()=>true, readBody:async r=>Buffer.from(await r.arrayBuffer())}, '@/lib/notifications':{notifySubmission:async()=>{}}, ...deps };
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>deps[n],Buffer,Date,Response,Request,FormData,AbortSignal,crypto,console,...globals});return exports;
}
const validation=load('src/lib/contact-validation.ts');
const leadValidation=load('src/lib/lead-validation.ts',{'./contact-validation':validation});
test('contact validation rejects empty, invalid and oversized fields',()=>{
 assert.equal(Object.keys(validation.validateContact({}).errors).length,3);
 assert.deepEqual(Object.keys(validation.validateContact({nombre:'Persona',email:'invalid',mensaje:'Consulta',telefono:'x'}).errors),['email','telefono']);
 assert.ok(validation.validateContact({nombre:'Persona',email:'test@example.invalid',mensaje:'x'.repeat(3001)}).errors.mensaje);
});
test('contact route stores servicio, message and contact details in payload; honeypot prevents writes',async()=>{
 let row;let writes=0;const route=load('src/app/api/leads/route.ts',{'@/lib/contact-validation':validation,'@/lib/supabase/admin':{createAdminClient:()=>({from:()=>({insert:value=>{row=value;writes++;return {abortSignal:async()=>({error:null})}}})})}});
 const payload={servicio:'contacto',formData:{nombre:'Persona',email:'test@example.invalid',telefono:'+504 0000-0000',mensaje:'Prueba técnica',website:''}};
 const send=()=>route.POST(new Request('http://local',{method:'POST',body:JSON.stringify(payload)}));
 assert.equal((await send()).status,201);assert.equal(row.servicio,'contacto');assert.equal(row.nombre,'Persona');assert.equal(row.notas,'Prueba técnica');assert.equal(row.payload.formData.email,'test@example.invalid');
 payload.formData.website='spam';assert.equal((await send()).status,400);assert.equal(writes,1);
 payload.formData.website='';payload.formData.email='';assert.equal((await send()).status,400);assert.equal(writes,1);
});
test('FAQ create, edit and delete use admin guard and revalidate public route',async()=>{
 for(const operation of ['create','edit','delete']){
  let guarded=0,saved;const paths=[];
  const result={select:()=>({single:async()=>({data:{id:'x'}})})};
  const client={from:table=>{assert.equal(table,'faqs');return {insert:v=>{saved=v;return result},update:v=>{saved=v;return {eq:()=>result}},delete:()=>({eq:()=>{saved='deleted';return result}})}}};
  const actions=load('src/app/admin/actions.ts',{'@/lib/admin':{requireAdmin:async()=>{guarded++;return {client}}},'next/cache':{revalidatePath:p=>paths.push(p)}});
  const form=new FormData();for(const [k,v] of Object.entries({table:'faqs',pregunta:'Pregunta técnica',respuesta:'Respuesta técnica',categoria:'Prueba',orden:'2',publicado:'on'}))form.set(k,v);
  if(operation!=='create')form.set('id','12345678-1234-1234-1234-123456789abc');if(operation==='delete')form.set('operation','delete');
  assert.ok((await actions.save({},form)).success);assert.equal(guarded,1);assert.ok(paths.includes('/preguntas-frecuentes'));if(operation==='delete')assert.equal(saved,'deleted');else {assert.equal(saved.pregunta,'Pregunta técnica');assert.equal(saved.publicado,true);assert.equal(saved.orden,2);}
 }
});
test('Nosotros matches every approved paragraph verbatim',()=>{
 const brief=fs.readFileSync('build_brief.md','utf8');const approved=brief.split('## 4.')[1].split('Founding facts')[0];const page=fs.readFileSync('src/app/nosotros/page.tsx','utf8');
 for(const line of approved.split(/\r?\n/).filter(l=>l.startsWith('> ')&&l.length>2))assert.ok(page.includes(line.slice(2).replaceAll('**','')),line);
});
test('consent fails closed during hydration and only accepted state renders tracking gate',()=>{
 let consent='unknown',ready=false;const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 const component=load('src/components/cookie-consent.tsx',{'react':{createContext:()=>({Provider:'provider'}),useSyncExternalStore:(_subscribe,snapshot,server)=>ready?snapshot():server(),useContext:()=>({canTrack:ready&&consent==='accepted'})},'react/jsx-runtime':jsx}, {localStorage:{getItem:()=>consent}});
 assert.equal(component.ConsentGate({children:'tracking'}),null);
 ready=true;for(const state of ['unknown','rejected','invalid']){consent=state;assert.equal(component.ConsentGate({children:'tracking'}),null);assert.notEqual(component.parseConsent(state),'accepted');}
 consent='accepted';assert.equal(component.ConsentGate({children:'tracking'}),'tracking');
});
test('consent choices persist, survive a new provider and expose the tracking state',()=>{
 let stored=null;let changed=0;
 const jsx={jsx:(_type,props)=>props};
 const component=load('src/components/cookie-consent.tsx',{'react':{createContext:()=>({Provider:'provider'}),useSyncExternalStore:(_subscribe,get)=>get()},'react/jsx-runtime':jsx}, {localStorage:{getItem:()=>stored,setItem:(key,value)=>{assert.equal(key,'viatour-consent-v1');stored=value;}},window:{dispatchEvent:()=>changed++},Event:class {}});
 let provider=component.ConsentProvider({children:null});assert.equal(provider.value.canTrack,false);
 provider.value.setConsent('accepted');provider=component.ConsentProvider({children:null});assert.equal(provider.value.canTrack,true);assert.equal(stored,'accepted');
 provider.value.setConsent('rejected');provider=component.ConsentProvider({children:null});assert.equal(provider.value.canTrack,false);assert.equal(stored,'rejected');assert.equal(changed,2);
});
