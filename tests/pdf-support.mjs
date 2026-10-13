// Loads the quotation PDF module (TSX) outside Next: TypeScript transpiles it and it runs in a vm with its
// imports supplied, like security-support.mjs, but with the real react-pdf so actual PDFs are rendered.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as reactPdf from '@react-pdf/renderer';
import * as jsxRuntime from 'react/jsx-runtime';
import { itinerary, parser, reference } from './flight-support.mjs';
import { load } from './security-support.mjs';

export function loadTsx(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!(name in dependencies)) throw new Error(`Missing test dependency: ${name}`); return dependencies[name]; }, Buffer, process, URL, Date, Map, Set }, { filename: path.resolve(file) });
  return exports;
}

export const money = load('src/lib/money.ts');
export const details = load('src/lib/quotation-details.ts', { '@/lib/flight-itinerary': itinerary, '@/lib/flight-reference': reference, '@/lib/money': money }, { Intl, crypto });
export const types = load('src/lib/quotation-types.ts');
export const siteConfig = load('src/lib/site-config.ts', {}, { process: { env: {} } });
export const text = load('src/lib/quotation-text.ts');
export const pdf = loadTsx('src/lib/quotation-pdf.tsx', {
  'server-only': {}, 'node:fs': fs, 'node:path': path, '@react-pdf/renderer': reactPdf, 'react/jsx-runtime': jsxRuntime,
  '@/lib/flight-itinerary': itinerary, '@/lib/quotation-details': details, '@/lib/quotation-data': {}, '@/lib/money': money,
  '@/lib/quotation-types': types, '@/lib/site-config': siteConfig, '@/lib/quotation-text': text,
});
export { itinerary, parser, reference };
