import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load} from './security-support.mjs';
test('blog rejects excessive field lengths before persistence',()=>{
  const api=load('src/lib/blog-validation.ts',{'./blog-utils':{blogCoverUrl:()=>true}});
  for(const[key,max]of Object.entries({titulo:200,slug:200,categoria:120,extracto:2000,cuerpo:100000,cover_url:2048,autor:120,meta_titulo:200,meta_descripcion:500})){
    const form=new FormData();for(const[k,v]of Object.entries({titulo:'Prueba',slug:'prueba',categoria:'Prueba',extracto:'Prueba',cuerpo:'Prueba',tipo:'post',orden:'0'}))form.set(k,v);
    form.set(key,'x'.repeat(max+1));assert.ok(api.validateBlog(form).error,key);
  }
});
test('packages and destinations reject length, collection and UUID violations before mutations',async()=>{
  let writes=0;
  const api=load('src/app/admin/actions.ts',{'@/lib/admin':{requireAdmin:async()=>({client:{from:()=>{writes++;throw Error('must not write');}}})}});
  for(const[table,key,value]of [['packages','destination_id','not-a-uuid'],['packages','nombre','x'.repeat(201)],['packages','descripcion','x'.repeat(20001)],['packages','incluye',Array(51).fill('Prueba').join('\n')],['packages','incluye','x'.repeat(501)],['destinations','cuerpo','x'.repeat(100001)],['destinations','pregunta','x'.repeat(501)],['destinations','respuesta','x'.repeat(10001)]]){
    const form=new FormData();for(const[k,v]of Object.entries({table,nombre:'Prueba',slug:'prueba',orden:'0',moneda:'USD'}))form.set(k,v);form.set(key,value);
    assert.ok((await api.save({},form)).error,`${table}.${key}`);
  }
  const form=new FormData();form.set('table','destinations');for(let i=0;i<31;i++){form.append('pregunta','Prueba');form.append('respuesta','Prueba');}assert.ok((await api.save({},form)).error);
  assert.equal(writes,0);
});
test('admin upload counts streamed bytes and cancels an oversized request without Content-Length',async()=>{
  let uploads=0,cancelled=false;
  const client={auth:{getUser:async()=>({data:{user:{id:'admin'}}})},rpc:async()=>({data:true}),storage:{from:()=>{uploads++;throw Error('must not upload');}}};
  const api=load('src/app/api/admin/blog-images/route.ts',{'@/lib/supabase/server':{createClient:async()=>client},'next/server':{NextResponse:Response}});
  const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(3*1024*1024));c.enqueue(new Uint8Array(3*1024*1024));},cancel(){cancelled=true;}});
  const response=await api.POST(new Request('http://local',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=test'},body,duplex:'half'}));
  assert.equal(response.status,413);assert.equal(cancelled,true);assert.equal(uploads,0);
});
test('SSR and middleware use Secure production cookies and retain sameSite lax',async()=>{
  for(const production of [true,false]){
    let options;
    const deps={'@supabase/ssr':{createServerClient:(_url,_key,v)=>{options=v;return {auth:{getUser:async()=>({data:{user:null}})}};}},'next/headers':{cookies:async()=>({})},'next/server':{NextResponse:{next:()=>({})}}};
    const globals={process:{env:{NODE_ENV:production?'production':'development'}}};
    await load('src/lib/supabase/server.ts',deps,globals).createClient();assert.equal(options.cookieOptions.secure,production);assert.equal(options.cookieOptions.sameSite,'lax');
    await load('src/lib/supabase/middleware.ts',deps,globals).updateSession({nextUrl:{pathname:'/'}});assert.equal(options.cookieOptions.secure,production);assert.equal(options.cookieOptions.sameSite,'lax');
  }
});
