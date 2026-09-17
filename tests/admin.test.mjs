import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => deps[name], URL, FormData });
  return exports;
}
const redirect = path => { throw new Error(`redirect:${path}`); };
test('server guard denies missing users, auth errors, non-admins and failed admin checks before queries', async () => {
  for (const [user, error, admin] of [[null, null, true], [{id:'u'}, 'expired', true], [{id:'u'}, null, false], [{id:'u'}, null, null]]) {
    let queries = 0;
    const client = { auth: { getUser: async () => ({data:{user}, error}) }, rpc: async () => ({data:admin, error: admin === null ? 'failure' : null}), from: () => { queries++; throw Error('unexpected'); } };
    const api = load('src/lib/admin.ts', { 'server-only': {}, 'next/navigation': {redirect}, '@/lib/supabase/server': {createClient: async () => client} });
    await assert.rejects(api.adminRows('leads'), /redirect:\/admin\/login/);
    assert.equal(queries, 0);
  }
});
test('all mutations require server authorization, even tampered requests', async () => {
  const api = load('src/app/admin/actions.ts', { 'next/navigation': {redirect}, 'next/cache': {}, '@/lib/admin': {requireAdmin: async () => { throw Error('denied'); }} });
  const form = new FormData(); form.set('table','leads'); form.set('operation','delete');
  await assert.rejects(api.save({},form), /denied/);
});
test('review approval uses session client and revalidates public reviews and home', async () => {
  const paths = []; let update;
  const client = { from: table => { assert.equal(table,'reviews'); return {update: values => {update=values; return {eq: (key,id) => {assert.equal(key,'id'); assert.equal(id,'12345678-1234-1234-1234-123456789abc'); return {select: () => ({single: async () => ({data:{id},error:null})})};}};}};} };
  const api = load('src/app/admin/actions.ts', { 'next/navigation': {redirect}, 'next/cache': {revalidatePath: path => paths.push(path)}, '@/lib/admin': {requireAdmin: async () => ({client})} });
  const form = new FormData(); for (const [k,v] of Object.entries({table:'reviews',id:'12345678-1234-1234-1234-123456789abc',estado:'aprobada',verificada:'on',email:'do-not-write@example.invalid'})) form.set(k,v);
  const result = await api.save({},form);
  assert.ok(result.success); assert.equal(update.estado,'aprobada'); assert.equal(update.verificada,true); assert.equal(update.email,undefined); assert.ok(paths.includes('/opiniones')); assert.ok(paths.includes('/'));
});
test('lead tracking only writes valid status and refuses deletion', async () => {
  let writes = 0;
  const client = {from: () => ({update: values => { writes++; assert.deepEqual(Object.keys(values),['estado']); assert.equal(values.estado,'contactado'); return {eq: () => ({select: () => ({single: async () => ({data:{id:'x'}})})})};}})};
  const api = load('src/app/admin/actions.ts', {'next/navigation': {redirect}, 'next/cache': {revalidatePath(){}}, '@/lib/admin': {requireAdmin: async () => ({client})}});
  const form = new FormData(); form.set('table','leads'); form.set('id','12345678-1234-1234-1234-123456789abc'); form.set('estado','contactado'); assert.ok((await api.save({},form)).success);
  form.set('estado','invalid'); assert.ok((await api.save({},form)).error);
  form.set('operation','delete'); assert.ok((await api.save({},form)).error); assert.equal(writes,1);
});
test('login rejects non-admin credentials and removes their session', async () => {
  let signedOut = false;
  const client = {auth:{signInWithPassword: async () => ({error:null}), signOut: async () => {signedOut=true;}},rpc: async () => ({data:false})};
  const api = load('src/app/admin/actions.ts', {'next/navigation': {redirect}, '@/lib/supabase/server': {createClient: async () => client}});
  const form = new FormData(); form.set('email','technical@example.invalid'); form.set('password','test-only'); assert.ok((await api.login({},form)).error); assert.equal(signedOut,true);
});
test('admin login redirects to dashboard after admin verification', async () => {
  const client = {auth:{signInWithPassword: async () => ({error:null})},rpc: async name => {assert.equal(name,'is_admin'); return {data:true};}};
  const api = load('src/app/admin/actions.ts', {'next/navigation': {redirect}, '@/lib/supabase/server': {createClient: async () => client}});
  const form = new FormData(); form.set('email','technical@example.invalid'); form.set('password','test-only'); await assert.rejects(api.login({},form), /redirect:\/admin$/);
});

test('package edits preserve null pricing and invalidate both previous and new slugs', async () => {
  let saved; const paths = [];
  const client = { from: table => { assert.equal(table, 'packages'); return {
    select: () => ({eq: () => ({single: async () => ({data:{slug:'anterior'}})})}),
    update: values => { saved = values; return {eq: () => ({select: () => ({single: async () => ({data:{id:'x'}})})})}; }
  }; } };
  const api = load('src/app/admin/actions.ts', {'next/navigation':{redirect}, 'next/cache':{revalidatePath: p => paths.push(p)}, '@/lib/admin':{requireAdmin:async () => ({client})}});
  const form = new FormData(); for (const [k,v] of Object.entries({table:'packages',id:'12345678-1234-1234-1234-123456789abc',nombre:'Prueba técnica',slug:'nuevo-slug',orden:'0',moneda:'HNL',precio_desde:'',incluye:'Uno\nDos'})) form.set(k,v);
  assert.ok((await api.save({},form)).success); assert.equal(saved.precio_desde,null); assert.equal(saved.moneda,'HNL'); assert.equal(saved.incluye.join(','),'Uno,Dos');
  assert.ok(paths.includes('/paquetes/anterior')); assert.ok(paths.includes('/paquetes/nuevo-slug')); assert.ok(paths.includes('/paquetes'));
  form.set('precio_desde','-1'); assert.ok((await api.save({},form)).error);
});
test('destination writes serialize FAQ pairs and invalidate destination pages', async () => {
  let saved; const paths = [];
  const client = {from: () => ({insert: values => {saved=values; return {select: () => ({single: async () => ({data:{id:'x'}})})};}})};
  const api = load('src/app/admin/actions.ts', {'next/navigation':{redirect}, 'next/cache':{revalidatePath: p => paths.push(p)}, '@/lib/admin':{requireAdmin:async () => ({client})}});
  const form = new FormData(); for (const [k,v] of Object.entries({table:'destinations',nombre:'Prueba técnica',slug:'prueba',orden:'0',pregunta:'Pregunta técnica',respuesta:'Respuesta técnica'})) form.set(k,v);
  assert.ok((await api.save({},form)).success); assert.equal(saved.faqs[0].pregunta,'Pregunta técnica'); assert.ok(paths.includes('/destinos/prueba'));
  form.set('respuesta',''); assert.ok((await api.save({},form)).error);
});
