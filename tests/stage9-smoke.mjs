import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const {data:faqs,error}=await db.from('faqs').select('*').eq('publicado',true).order('orden').order('id');assert.ifError(error);
const drafts=await db.from('faqs').select('id').eq('publicado',false);assert.ifError(drafts.error);assert.equal(drafts.data.length,0,'Anonymous readers must not see draft FAQs');
const origin=process.env.SMOKE_ORIGIN||'http://localhost:3000';
async function page(path){const r=await fetch(origin+path,{headers:{'user-agent':'Googlebot'}});assert.equal(r.status,200,path);const html=await r.text();assert.equal((html.match(/<h1\b/g)||[]).length,1,path);return html;}
const about=await page('/nosotros');assert.ok(about.includes('Somos sus asesores de viaje, no una página más.'));assert.ok(about.includes('viatour — sueña, descubre, sonríe.'));assert.ok(about.includes('AboutPage'));
const contact=await page('/contacto');assert.ok(contact.includes('contact-mensaje'));assert.ok(contact.includes('50488668704'));
const faq=await page('/preguntas-frecuentes');const schema=[...faq.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(s=>s['@type']==='FAQPage');
if(faqs.length){assert.equal(schema.mainEntity.length,faqs.length);for(const f of faqs)assert.ok(schema.mainEntity.some(q=>q.name===f.pregunta&&q.acceptedAnswer.text===f.respuesta));}else assert.equal(schema,undefined);
for(const kind of ['terminos','privacidad','cancelaciones','cookies']){const html=await page('/legales/'+kind);assert.ok(html.includes('Contenido legal pendiente de revisión.'));assert.ok(html.includes('noindex'));}
const admin=await fetch(origin+'/admin/faq',{redirect:'manual'});assert.ok([303,307].includes(admin.status));assert.ok(admin.headers.get('location').includes('/admin/login'));
const sitemap=await (await fetch(origin+'/sitemap.xml')).text();for(const route of ['nosotros','contacto','preguntas-frecuentes'])assert.ok(sitemap.includes('https://miviatour.com/'+route));
console.log(`PASS public routes, approved copy, ${faqs.length} published FAQs and matching JSON-LD, legal placeholders/noindex, sitemap and admin denial. No database writes performed.`);
