import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const {data:posts,error}=await db.from('blog_posts').select('*').eq('publicado',true);assert.ifError(error);
const origin=process.env.SMOKE_ORIGIN||'http://localhost:3000';
async function page(path){const response=await fetch(origin+path,{headers:{'user-agent':'Googlebot'}});assert.equal(response.status,200,path);return response.text();}
const listing=await page('/blog');const sitemap=await page('/sitemap.xml');assert.ok(sitemap.includes('https://miviatour.com/blog'));
const seed=posts.find(p=>p.slug==='ejemplo-guia-de-viaje');assert.ok(seed,'Published seeded example is available');
for(const p of posts){assert.ok(listing.includes('href="/blog/'+p.slug+'"'));assert.ok(sitemap.includes('https://miviatour.com/blog/'+p.slug));const html=await page('/blog/'+p.slug);assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(html.includes('blog-markdown'));const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).flatMap(s=>s['@graph']||[]);assert.ok(schemas.some(s=>s['@type']==='BlogPosting'&&s.headline===p.titulo));assert.ok(schemas.some(s=>s['@type']==='BreadcrumbList'));console.log('PASS published post',p.slug);}
assert.equal((await fetch(origin+'/blog/no-existe-stage-8',{headers:{'user-agent':'Googlebot'}})).status,404);
const upload=await fetch(origin+'/api/admin/blog-images',{method:'POST',body:new FormData()});assert.equal(upload.status,401);
const admin=await fetch(origin+'/admin/blog',{redirect:'manual'});assert.ok([303,307].includes(admin.status));assert.ok(admin.headers.get('location').includes('/admin/login'));
console.log('PASS listing, seed, one H1, JSON-LD, sitemap, bad slug, admin and upload denial');
