import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name], Response, Request, FormData, File, Buffer, Uint8Array, TextDecoder, Date, URL, crypto, AbortSignal, process: { env: {} }, console: { error() {}, warn() {} }, ...globals });
  return exports;
}
export const contact = load('src/lib/contact-validation.ts');
export const validation = load('src/lib/lead-validation.ts', { './contact-validation': contact });
export function quote(servicio = 'Vuelos') {
  return { servicio, currency: 'HNL', turnstileToken: 'valid', fields: { Tipo: 'Ida y vuelta' }, formData: { name: 'Prueba', notes: 'No contactar.', origin: 'SAP', destination: 'Cartagena', start: '2026-10-01', end: '2026-10-10', adults: '2', children: '0', class: 'Económica', rooms: '1', approximate: 'Octubre de 2026', budget: '25000' } };
}
export const request = (body, path = 'leads') => new Request(`http://local/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1, 192.0.2.2' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
