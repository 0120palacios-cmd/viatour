import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('package handoff keeps the database service and package identity separate from message labels', async () => {
  let body;
  let navigation;
  const quote = load('src/lib/quote.ts', { '@/lib/site-config': { siteConfig: { whatsappNumber: '50488668704' } } }, {
    fetch: async (_url, options) => {
      body = JSON.parse(options.body);
      return Response.json({ ok: true, id: 'package-test' });
    },
    window: { location: { assign: url => { navigation = url; } } },
  });
  await quote.requestQuote({ service: 'Paquete', servicio: 'paquetes', fields: { Destino: 'Destino de prueba', Paquete: 'Paquete de prueba' }, formData: { slug: 'prueba', nombre: 'Paquete de prueba', destino: 'Destino de prueba' } });
  assert.equal(body.servicio, 'paquetes');
  assert.equal(body.formData.slug, 'prueba');
  assert.equal(body.formData.nombre, 'Paquete de prueba');
  assert.equal(body.formData.destino, 'Destino de prueba');
  assert.match(new URL(navigation).searchParams.get('text'), /Servicio: Paquete\nDestino: Destino de prueba\nPaquete: Paquete de prueba/);
});

// Run the actual TypeScript modules with isolated network/navigation boundaries.
function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => name === "@/lib/analytics" ? (dependencies[name] || { trackEvent() {} }) : dependencies[name], Response, crypto, AbortSignal,
    console: { error() {}, warn() {} }, ...globals,
  });
  return exports;
}

test('route validates JSON/service before inserting and sanitizes failures', async () => {
  let inserts = 0;
  const route = load('src/app/api/leads/route.ts', {
    '@/lib/supabase/server': { createClient: async () => {
      inserts++;
      throw new Error('private database detail');
    } },
  });
  for (const body of ['{', '{}', 'null', '[]', '{"servicio":" "}']) {
    assert.equal((await route.POST(new Request('http://local', { method: 'POST', body }))).status, 400);
  }
  assert.equal(inserts, 0);
  const response = await route.POST(new Request('http://local', { method: 'POST', body: '{"servicio":"Vuelos"}' }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private database detail/);
});

test('all services preserve raw data and map currency, guests, budget and notes without SELECT', async () => {
  for (const servicio of ['Vuelos', 'Hoteles', 'Paquetes', 'Viaje a medida']) {
    let row;
    const route = load('src/app/api/leads/route.ts', {
      '@/lib/supabase/server': { createClient: async () => ({ from: table => {
        assert.equal(table, 'leads');
        return { insert: value => { row = value; return { abortSignal: async () => ({ error: null }) }; } };
      } }) },
    });
    const payload = { servicio, currency: 'HNL', fields: {
      Nombre: 'Prueba', Origen: 'SAP', Destino: 'Cartagena', Fechas: '2026-10-01',
      [servicio === 'Hoteles' ? 'Huéspedes' : 'Pasajeros']: 'Adultos: 2; niños: 0',
      Clase: servicio === 'Vuelos' ? 'Económica' : '', Notas: 'No contactar.',
      'Presupuesto aproximado': servicio === 'Viaje a medida' ? '25000 HNL' : '',
      'Tramo 1': 'Datos completos del tramo',
    }, formData: { budget: servicio === 'Viaje a medida' ? '25000' : '' } };
    const response = await route.POST(new Request('http://local', {
      method: 'POST', headers: { 'user-agent': 'test-agent' }, body: JSON.stringify(payload),
    }));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).id, row.id);
    assert.equal(row.moneda, 'HNL');
    assert.equal(row.presupuesto, servicio === 'Viaje a medida' ? 25000 : null);
    assert.equal(row.notas, 'No contactar.');
    assert.equal(row.pasajeros, 'Adultos: 2; niños: 0');
    assert.equal(row.user_agent, 'test-agent');
    assert.equal(JSON.stringify(row.payload), JSON.stringify(payload));
    assert.equal(row.estado, undefined);
  }
});

test('handoff waits for capture and proceeds on HTTP, malformed, network and timeout failures', async () => {
  for (const outcome of ['success', 'http', 'malformed', 'network', 'timeout']) {
    let resolve;
    const pending = new Promise(done => { resolve = done; });
    const navigations = [];
    const events = [];
    const quote = load('src/lib/quote.ts', { '@/lib/site-config': { siteConfig: { whatsappNumber: '50488668704' } }, '@/lib/analytics': { trackEvent: (name, params) => events.push({ name, params }) } }, {
      window: { location: { assign: url => navigations.push(url) } },
      fetch: async (url, options) => {
        assert.equal(url, '/api/leads');
        assert.equal(JSON.parse(options.body).servicio, 'Vuelos');
        assert.ok(options.signal);
        await pending;
        if (outcome === 'network' || outcome === 'timeout') throw new Error(outcome);
        if (outcome === 'malformed') return new Response('invalid');
        return Response.json(outcome === 'success' ? { ok: true, id: 'test-id' } : { ok: false }, { status: outcome === 'http' ? 502 : 201 });
      },
    });
    const payload = { service: 'Vuelos', currency: 'USD', fields: { Destino: 'Cartagena', Notas: '' } };
    const handoff = quote.requestQuote(payload);
    assert.equal(navigations.length, 0);
    resolve();
    await handoff;
    assert.equal(navigations.length, 1);
    assert.equal(events.filter(e => e.name === "whatsapp_click").length, 1);
    assert.equal(events.filter(e => e.name === "quote_submit").length, outcome === "success" ? 1 : 0);
    assert.equal(new URL(navigations[0]).searchParams.get('text'), 'Me gustaría solicitar una cotización. Por favor, asesóreme con estas opciones.\nServicio: Vuelos\nDestino: Cartagena');
  }
});
