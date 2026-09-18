import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseCsv, importRows } from '../scripts/import-reviews.ts';

function load(file, dependencies = {}) {
  dependencies = { '@/lib/public-security': { rateLimit: async () => null, verifyTurnstile: async () => true }, '@/lib/notifications': { notifySubmission: async () => {} }, ...dependencies };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name], Response, Request, File, FormData, Buffer, crypto, AbortSignal, URL });
  return exports;
}
const validation = load('src/lib/review-validation.ts');
const payload = () => { const form = new FormData(); for (const [k,v] of Object.entries({ nombre: 'PRUEBA TÉCNICA — NO PUBLICAR', email: 'technical@example.invalid', calificacion: '1', texto: 'Prueba de validación, no es un testimonio.' })) form.set(k,v); return form; };
test('validation requires private email, text and integer rating, and caps lengths', () => {
  for (const [key,value] of Object.entries({ nombre: '', email: 'invalid', texto: 'x'.repeat(3001), calificacion: 6, destino: 'x'.repeat(161), numero_reserva: 'x'.repeat(81) })) {
    assert.ok(validation.validateReview({ ...Object.fromEntries(payload()), [key]: value }).errors[key]);
  }
});
test('route forces pending state, uploads photo, returns no private data and cleans up on insert failure', async () => {
  for (const fails of [false, true]) {
    let row, upload, removed;
    const client = { storage: { from: bucket => { assert.equal(bucket, 'review-photos'); return { upload: async (...args) => { upload = args; return {}; }, remove: async paths => { removed = paths; return {}; } }; } }, from: table => { assert.equal(table, 'reviews'); return { insert: async value => { row = value; return { error: fails ? { message: 'secret' } : null }; } }; } };
    const route = load('src/app/api/reviews/route.ts', { '@/lib/review-validation': validation, '@/lib/supabase/admin': { createAdminClient: () => client } });
    const form = payload();
    form.set('estado', 'aprobada'); form.set('verificada', 'true'); form.set('fuente', 'facebook');
    form.set('foto', new File([Buffer.from([137,80,78,71,13,10,26,10])], 'technical.png', { type: 'image/png' }));
    const response = await route.POST(new Request('http://local/api/reviews', { method: 'POST', body: form }));
    assert.equal(response.status, fails ? 503 : 201);
    assert.equal(row.estado, 'pendiente'); assert.equal(row.fuente, 'formulario'); assert.equal(row.verificada, false);
    assert.equal(upload[0], row.foto_path);
    if (fails) assert.equal(removed[0], row.foto_path);
    assert.doesNotMatch(await response.text(), /technical@|secret|foto_path/);
  }
});
test('honeypot, missing fields, oversized bodies and disguised files never reach Supabase', async () => {
  const route = load('src/app/api/reviews/route.ts', { '@/lib/review-validation': validation, '@/lib/supabase/admin': { createAdminClient: () => { throw new Error('must not reach'); } } });
  const forms = [new FormData(), payload(), payload(), payload()];
  forms[1].set('website', 'spam');
  forms[2].set('foto', new File(['not an image'], 'bad.png', { type: 'image/png' }));
  forms[3].set('texto', 'x'.repeat(4 * 1024 * 1024));
  for (let i = 0; i < forms.length; i++) assert.equal((await route.POST(new Request('http://local/api/reviews', { method: 'POST', body: forms[i] }))).status, i === 3 ? 413 : 400);
});
test('schema is absent at zero; import template has no rows; CSV supports quoted multiline cells', () => {
  const { reviewSchema } = load('src/lib/reviews.ts', { 'server-only': {}, '@/lib/supabase/server': {} });
  assert.equal(reviewSchema({ total: 0 }, []), null);
  assert.deepEqual(importRows(fs.readFileSync('data/reviews-import.sample.csv', 'utf8')), []);
  assert.deepEqual(parseCsv('a,b\r\n"one,two","line\n""quoted"""'), [['a','b'],['one,two','line\n"quoted"']]);
  assert.throws(() => parseCsv('a,"unfinished'));
  assert.throws(() => importRows('nombre,calificacion\n,0'));
});
