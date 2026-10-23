// Mi viaje premium: airline links, destination guides and photo credits, personalization of offers, the
// contextual checklist, chat attachments, service requests and feedback, and reservation isolation of every
// new customer route (reservation A can never reach reservation B). No database, storage, network or email:
// every dependency is a test double or a pure module.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as nodeCrypto from 'node:crypto';
import { load } from './security-support.mjs';
import { tripViewModule } from './trip-support.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const view = tripViewModule();
const fixtures = load('src/lib/trip-fixtures.ts').tripFixtures('2026-10-21');
const build = (name, patch = input => input) => plain(view.buildTripView(patch(structuredClone(fixtures[name].input))));

const airlines = load('src/lib/airline-links.ts', {}, { String });
const match = load('src/lib/destination-match.ts');
const guides = load('src/lib/destination-guides.ts', { '@/lib/destination-match': match }, { Set });
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const credits = load('src/lib/photo-credits.ts', { '../../data/trip-photo-credits.json': { default: json('data/trip-photo-credits.json') }, '../../data/panama-photo-credits.json': { default: json('data/panama-photo-credits.json') } }, { Map, Set });
const offers = load('src/lib/trip-offers.ts', {}, { Set });
const checklist = load('src/lib/trip-checklist.ts');
const portalDocuments = load('src/lib/portal-documents.ts');
const attachments = load('src/lib/chat-attachments.ts', { '@/lib/portal-documents': portalDocuments }, { String, RegExp, encodeURIComponent });
const requests = load('src/lib/trip-requests.ts', { '@/lib/trip-offers': offers });
const model = load('src/lib/trip-model.ts', { '@/lib/destination-guides': guides, '@/lib/photo-credits': credits, '@/lib/trip-requests': requests }, { Set, Map });

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// ---------------------------------------------------------------------------------------------------------
// Airline links

test('airline lookup finds names, IATA codes and flight numbers, never partial words', () => {
  assert.equal(airlines.airlineFor('AVIANCA EL SALVADOR').iata, 'AV');
  assert.equal(airlines.airlineFor('AV 621').iata, 'AV');
  assert.equal(airlines.airlineFor('aa').name, 'American Airlines');
  assert.equal(airlines.airlineFor('Aeroméxico Connect').iata, 'AM');
  assert.equal(airlines.airlineFor('Air'), null);
  assert.equal(airlines.airlineFor(''), null);
  assert.equal(airlines.airlineFor('Aerolínea Desconocida'), null);
  assert.deepEqual(plain(airlines.airlineAction('Avianca')), { kind: 'manage', url: 'https://www.avianca.com/es/mi-reserva/servicios/gestiona-tu-reserva', airline: 'Avianca' });
  assert.deepEqual(plain(airlines.airlineAction('Copa Airlines')), { kind: 'manage', url: 'https://mytrips.copaair.com/', airline: 'Copa Airlines' });
  assert.equal(airlines.airlineAction('United Airlines').kind, 'site', 'no verified lookup page: home page only');
  assert.equal(airlines.airlineAction('Nadie'), null, 'unknown airline: neutral wording, no button');
});

test('every airline URL is https on that airline\'s own domain and carries no booking data', () => {
  const domains = { AV: 'avianca.com', CM: 'copaair.com', AA: 'aa.com', UA: 'united.com', DL: 'delta.com', B6: 'jetblue.com', WN: 'southwest.com', F9: 'flyfrontier.com', AM: 'aeromexico.com', Y4: 'volaris.com', VB: 'vivaaerobus.com', IB: 'iberia.com', UX: 'aireuropa.com', AC: 'aircanada.com', KL: 'klm.com', AF: 'airfrance.us', BA: 'britishairways.com', LH: 'lufthansa.com', TK: 'turkishairlines.com' };
  for (const airline of airlines.airlineLinks) {
    for (const url of [airline.manage, airline.site].filter(Boolean)) {
      const parsed = new URL(url);
      assert.equal(parsed.protocol, 'https:', url);
      assert.ok(parsed.hostname === domains[airline.iata] || parsed.hostname.endsWith(`.${domains[airline.iata]}`), `${airline.name}: ${url}`);
      assert.equal(parsed.search, '', `${url} carries no query`);
    }
  }
});

// ---------------------------------------------------------------------------------------------------------
// Destination guides and photo credits

test('destination guides match whole words, longest first, and never a neighbouring country', () => {
  assert.equal(guides.guideFor('Miami').slug, 'miami');
  assert.equal(guides.guideFor('Nueva York y Toronto').slug, 'nueva-york');
  assert.equal(guides.guideFor('Cancún, México').slug, 'cancun');
  assert.equal(guides.guideFor('Ciudad de Panamá').slug, 'panama');
  assert.equal(guides.guideFor('Santo Domingo, República Dominicana'), null, 'Punta Cana is not the whole country');
  assert.equal(guides.guideFor('Guatemala'), null);
  assert.equal(guides.guideFor('San Salvador'), null);
  assert.equal(guides.guideFor(''), null);
});

test('every curated entry has a real local photo with its license credit, an https official link and no prices', () => {
  const allowed = /^(CC BY(-SA)? [1-4]\.[0-9]|CC0|Public domain)$/;
  for (const guide of guides.destinationGuides) {
    assert.ok(guide.highlights.length >= 2 && guide.highlights.length <= 8, `${guide.slug}: 2-8 recommendations`);
    const photos = [guide.hero?.image, ...guide.highlights.map(item => item.image)].filter(Boolean);
    for (const photo of photos) {
      assert.match(photo, /^\/[a-z0-9/_-]+\.jpg$/, 'served by the site, never hotlinked');
      assert.ok(fs.existsSync(`public${photo}`), `${photo} exists`);
      const credit = plain(credits.creditsFor([photo]))[0];
      assert.ok(credit, `${photo} has a credit record`);
      assert.match(credit.licencia, allowed, `${photo} license allows commercial use`);
      assert.match(credit.fuente, /^https:\/\/commons\.wikimedia\.org\//);
    }
    for (const item of guide.highlights) {
      for (const lang of ['es', 'en']) {
        for (const text of [item.name[lang], item.description[lang], item.alt[lang]]) {
          assert.ok(text.trim(), `${guide.slug}/${item.id} ${lang} text`);
          assert.doesNotMatch(text, /(\$|US\$|USD|L\s?\d|\d+\s?(%|horas?|hours?|am|pm|a\. m\.|p\. m\.)|estrellas|rating|garantiz|guarantee)/i, `${item.id}: no prices, hours, ratings or guarantees`);
          assert.equal(/\p{Extended_Pictographic}/u.test(text), false);
        }
      }
      if (item.link) assert.equal(new URL(item.link).protocol, 'https:');
    }
  }
  assert.equal(guides.destinationGuides.find(guide => guide.slug === 'miami').highlights.length >= 6, true, 'Miami has a full set');
});

test('family trips see family-friendly recommendations first without hiding the rest', () => {
  const miami = guides.guideFor('Miami');
  const family = plain(guides.guideView(miami, 'es', { family: true }));
  const regular = plain(guides.guideView(miami, 'en'));
  assert.equal(family.highlights.length, regular.highlights.length);
  const firstNonFamily = family.highlights.findIndex(item => !miami.highlights.find(entry => entry.id === item.id).family);
  assert.ok(family.highlights.slice(firstNonFamily).every(item => !miami.highlights.find(entry => entry.id === item.id).family));
  assert.equal(regular.name, 'Miami');
  assert.match(regular.intro, /Beaches/);
});

test('the trip model uses the guide hero and lists the credit of every licensed photo shown', () => {
  const trip = plain(model.assembleTrip({ view: build('miami-emitido'), customerName: 'Prueba', photo: '/destinos/miami.jpg', hotelPhotos: {}, reservationId: A, destination: null, suggestions: [], today: '2026-10-21' }));
  assert.equal(trip.image.src, '/destinos/miami.jpg');
  assert.equal(trip.guide.slug, 'miami');
  assert.equal(trip.credits.length, 1 + trip.guide.highlights.length);
  const none = plain(model.assembleTrip({ view: build('sin-guia'), customerName: 'Prueba', photo: null, hotelPhotos: {}, reservationId: A, destination: null, suggestions: [], today: '2026-10-21' }));
  assert.equal(none.image, null, 'no photo: the branded header, never an unrelated image');
  assert.equal(none.guide, null);
  assert.deepEqual(none.credits, []);
});

// ---------------------------------------------------------------------------------------------------------
// Personalization

test('offers follow what the trip already has and never repeat a purchased or pending service', () => {
  assert.deepEqual(plain(offers.tripOffers(build('miami-emitido'))), ['hotel', 'traslado', 'auto', 'tour', 'seguro'], 'flight only');
  const family = build('orlando-familia');
  assert.deepEqual(plain(offers.tripOffers(family)), ['traslado', 'equipaje', 'tour', 'seguro'], 'flight + hotel + car: no hotel, no car; checked bag missing');
  assert.deepEqual(plain(offers.carRentals(family)).map(service => service.title), ['Auto de alquiler SUV']);
  assert.equal(offers.isFamilyTrip(family), true);
  assert.deepEqual(plain(offers.tripOffers(build('hotel-solo'))).slice(0, 2), ['vuelo', 'traslado'], 'hotel only: flights first');
  assert.deepEqual(plain(offers.tripOffers(build('cancelada'))), [], 'cancelled: nothing');
  assert.deepEqual(plain(offers.tripOffers(build('completado'))), ['vuelo', 'a_medida'], 'completed: next trip only');
  assert.deepEqual(plain(offers.tripOffers(build('en-viaje'))), ['tour', 'auto', 'traslado'], 'during the trip: what helps there');
  assert.equal(plain(offers.tripOffers(build('miami-emitido'), 5, ['traslado'])).includes('traslado'), false, 'pending request not offered again');
  const cancun = build('cancun-listo');
  assert.equal(plain(offers.tripOffers(cancun)).some(key => ['hotel', 'traslado', 'tour'].includes(key)), false, 'package already has hotel, transfer and tour');
});

test('a car rental is recognised by its type or, in older quotations, by its own wording', () => {
  assert.equal(view.serviceKind('auto'), 'auto');
  assert.equal(view.serviceKind('otro', 'Renta de auto en el aeropuerto'), 'auto');
  assert.equal(view.serviceKind('otro', 'Rent a car compacto'), 'auto');
  assert.equal(view.serviceKind('otro', 'Autobús de alquiler para el grupo'), 'otro');
  assert.equal(view.serviceKind('traslado', 'Traslado en auto privado'), 'traslado');
});

// ---------------------------------------------------------------------------------------------------------
// Contextual checklist

test('the checklist follows the calendar and only shows steps the data supports', () => {
  const keys = (name, today, patch) => plain(checklist.tripChecklist(build(name, patch), { today, referral: true }));
  const emitted = keys('miami-emitido', '2026-10-21');
  assert.equal(emitted.phase, 'planning');
  assert.deepEqual(emitted.items.map(item => item.key), ['names', 'passports', 'itinerary', 'requirements']);
  const soon = keys('orlando-familia', '2026-10-21');
  assert.equal(soon.phase, 'soon');
  assert.equal(soon.items[0].key, 'balance', 'a balance comes first');
  assert.ok(soon.items.some(item => item.key === 'airlineCheck'), 'tickets issued: check with the airline');
  const pending = keys('miami-pendiente', '2026-10-21', input => ({ ...input, today: '2026-11-17' }));
  assert.equal(pending.phase, 'eve');
  assert.equal(pending.items.some(item => item.key === 'checkin'), false, 'no check-in step without issued tickets');
  const lastDay = keys('en-viaje', '2026-10-21');
  assert.equal(lastDay.phase, 'during');
  assert.equal(lastDay.items[0].key, 'feedback', 'a light question on the last day');
  assert.equal(keys('en-viaje', '2026-10-21', input => ({ ...input, reservation: { ...input.reservation, fecha_fin: '2026-10-25' } })).items.some(item => item.key === 'feedback'), false, 'not before the last day');
  const after = keys('completado', '2026-10-21');
  assert.deepEqual(after.items.map(item => item.key), ['review', 'share', 'referral', 'nextTrip']);
  assert.deepEqual(keys('cancelada', '2026-10-21').items, []);
});

// ---------------------------------------------------------------------------------------------------------
// Attachments

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const pdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
const text = value => new TextEncoder().encode(value);

test('attachments are typed by their bytes; scripts, SVG, HTML, executables and renamed files are refused', () => {
  assert.equal(attachments.sniffAttachment(jpeg), 'image/jpeg');
  assert.equal(attachments.sniffAttachment(png), 'image/png');
  assert.equal(attachments.sniffAttachment(text('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(attachments.sniffAttachment(pdf), 'application/pdf');
  for (const bad of ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', '<!doctype html><script>x</script>', 'MZ\x90\0executable', 'GIF89a']) assert.equal(attachments.checkAttachment(text(bad), 'image/jpeg', 'x.jpg').ok, false, bad.slice(0, 12));
  assert.equal(attachments.checkAttachment(jpeg, 'application/pdf', 'x.pdf').reason, 'type', 'label must agree with the bytes');
  assert.equal(attachments.checkAttachment(text('%PDF-1.7 /OpenAction << /S /JavaScript /JS (app.alert(1)) >>'), 'application/pdf', 'x.pdf').reason, 'activePdf');
  assert.equal(attachments.checkAttachment(text('%PDF-1.7 /OpenAction 3 0 R /AA <<>>'), 'application/pdf', 'x.pdf').ok, true, 'ordinary exported PDFs pass');
  assert.equal(attachments.checkAttachment(new Uint8Array(attachments.attachmentMaxBytes + 1).fill(0xff), 'image/jpeg', 'x.jpg').reason, 'tooLarge');
  assert.equal(attachments.checkAttachment(new Uint8Array(), '', 'x').reason, 'empty');
  const ok = plain(attachments.checkAttachment(jpeg, 'image/jpeg', '../../Pasaporte Señor López.JPG'));
  assert.deepEqual(ok, { ok: true, mime: 'image/jpeg', name: 'Pasaporte-Senor-Lopez.jpg' }, 'the name is display text only, made safe');
});

test('attachment paths stay inside the reservation chat folder and are served without sniffing or scripts', () => {
  const file = '11111111-1111-4111-8111-111111111111';
  assert.equal(attachments.isAttachmentPath(A, attachments.attachmentPath(A, file, 'image/png')), true);
  assert.equal(attachments.isAttachmentPath(A, `${B}/mensajes/${file}.png`), false);
  assert.equal(attachments.isAttachmentPath(A, `${A}/cliente/${file}.png`), false);
  assert.equal(attachments.isAttachmentPath(A, `${A}/mensajes/../${file}.png`), false);
  assert.equal(attachments.isAttachmentPath(A, `${A}/mensajes/${file}.svg`), false);
  const headers = plain(attachments.attachmentHeaders({ name: 'Recibo "final".pdf', mime: 'application/pdf', size: 10 }));
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.match(headers['Content-Security-Policy'], /sandbox/);
  assert.match(headers['Cache-Control'], /no-store/);
  assert.doesNotMatch(headers['Content-Disposition'], /"Recibo "final/, 'quotes in names cannot break the header');
});

// ---------------------------------------------------------------------------------------------------------
// Customer routes: reservation A never reaches reservation B

const session = id => ({ 'next/headers': { cookies: async () => ({ get: () => (id ? { value: 'cookie' } : undefined) }) }, '@/lib/portal': { portalCookieName: 'c', verifyPortalCookie: () => id } });
const messages = load('src/lib/reservation-messages.ts');

function attachmentRoute(id, rows) {
  const calls = { filters: [], downloads: [] };
  const client = {
    from: () => { const q = { select() { return q; }, eq(k, v) { calls.filters.push([k, v]); return q; }, maybeSingle: async () => ({ data: rows.find(row => calls.filters.filter(([k]) => k === 'id').at(-1)?.[1] === row.id && calls.filters.filter(([k]) => k === 'reservation_id').at(-1)?.[1] === row.reservation_id) ?? null, error: null }) }; return q; },
    storage: { from: () => ({ download: async path => { calls.downloads.push(path); return { data: new Blob([jpeg]), error: null }; } }) },
  };
  const route = load('src/app/api/mi-reserva/mensajes/adjuntos/[id]/route.ts', { ...session(id), '@/lib/supabase/admin': { createAdminClient: () => client }, '@/lib/quotation-validation': { validUuid: value => /^[0-9a-f-]{36}$/.test(value) }, '@/lib/chat-attachments': attachments, '@/lib/portal-documents': portalDocuments }, { Blob });
  return { get: attachment => route.GET(new Request('https://example.invalid'), { params: Promise.resolve({ id: attachment }) }), calls };
}

test('an attachment of reservation B answers 404 to reservation A, exactly like a missing one', async () => {
  const file = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
  const rows = [{ id: file, reservation_id: A, path: `${A}/mensajes/${file}.jpg`, name: 'foto.jpg', mime: 'image/jpeg', size: 10 }, { id: other, reservation_id: B, path: `${B}/mensajes/${other}.jpg`, name: 'b.jpg', mime: 'image/jpeg', size: 10 }];
  const asA = attachmentRoute(A, rows);
  const own = await asA.get(file);
  assert.equal(own.status, 200);
  assert.equal(own.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await asA.get(other)).status, 404);
  assert.deepEqual(asA.calls.downloads, [`${A}/mensajes/${file}.jpg`], 'B\'s file is never read');
  assert.ok(asA.calls.filters.some(([k, v]) => k === 'reservation_id' && v === A), 'scoped by the session reservation');
  const anonymous = attachmentRoute(null, rows);
  assert.equal((await anonymous.get(file)).status, 401);
  assert.deepEqual(anonymous.calls.filters, []);
  // A tampered row pointing outside the chat folder is not served either.
  const tampered = attachmentRoute(A, [{ ...rows[0], path: `${B}/mensajes/${other}.jpg` }]);
  assert.equal((await tampered.get(file)).status, 404);
  assert.deepEqual(tampered.calls.downloads, []);
});

function messagesRoute(id, { attachmentsTable = true } = {}) {
  const calls = { uploads: [], rpc: [], removed: [], inserts: [] };
  const query = { select() { return query; }, eq() { return query; }, in() { return query; }, order() { return query; }, limit: async () => attachmentsTable ? ({ data: [], error: null }) : ({ data: null, error: { code: 'PGRST205' } }), maybeSingle: async () => ({ data: { codigo: 'VT-A' } }) };
  const client = {
    rpc: async (name, args) => { if (name === 'hit_rate_limit') return { data: true, error: null }; calls.rpc.push([name, args]); return { data: [{ message_id: 'm1', message_created_at: 'now', attachment_id: 'f1' }], error: null }; },
    from: table => table === 'reservation_messages' ? { ...query, insert: row => { calls.inserts.push(row); return { select: () => ({ single: async () => ({ data: { id: 'm2', created_at: 'now' }, error: null }) }) }; } } : query,
    storage: { from: () => ({ upload: async (path, bytes, options) => { calls.uploads.push([path, options.contentType]); return { error: null }; }, remove: async paths => { calls.removed.push(...paths); return {}; } }) },
  };
  const route = load('src/app/api/mi-reserva/mensajes/route.ts', {
    ...session(id), 'node:crypto': nodeCrypto,
    '@/lib/supabase/admin': { createAdminClient: () => client },
    '@/lib/public-security': { clientIP: () => '192.0.2.1', readBody: async request => Buffer.from(await request.arrayBuffer()) },
    '@/lib/reservation-messages': messages, '@/lib/chat-attachments': attachments, '@/lib/portal-documents': portalDocuments,
    '@/lib/attachment-image': { cleanImage: async (bytes, mime) => ({ bytes: Buffer.from(bytes), mime }) },
    '@/lib/notifications': { sendResendEmail: async () => {}, captureNotificationFailure() {} },
    '@/lib/site-config': { siteConfig: { supportEmail: 'qa@example.invalid', url: 'https://example.invalid' } },
  });
  const post = (fields, file) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    if (file) form.set('archivo', new File([file.bytes], file.name, { type: file.type }));
    return route.POST(new Request('https://example.invalid/api/mi-reserva/mensajes', { method: 'POST', body: form }));
  };
  return { post, calls };
}

test('an attachment is stored in the session reservation\'s chat folder and saved with its message atomically', async () => {
  const { post, calls } = messagesRoute(A);
  const response = await post({ body: '', reservation_id: B, sender: 'agencia' }, { bytes: png, name: 'captura.png', type: 'image/png' });
  assert.equal(response.status, 200);
  assert.equal(calls.uploads.length, 1);
  assert.match(calls.uploads[0][0], new RegExp(`^${A}/mensajes/[0-9a-f-]{36}\\.png$`), 'path made by the server inside A');
  assert.equal(calls.rpc[0][0], 'post_customer_message');
  assert.equal(calls.rpc[0][1].p_reservation_id, A, 'IDs in the form are ignored');
  assert.equal(calls.rpc[0][1].p_path, calls.uploads[0][0]);
  assert.deepEqual(calls.removed, [], 'nothing to clean up after success');
  const body = await response.json();
  assert.equal(body.message.attachments[0].name, 'captura.png');
});

test('a refused file is never uploaded, and nothing is uploaded before the attachments table exists', async () => {
  const svg = messagesRoute(A);
  assert.equal((await svg.post({ body: 'mire' }, { bytes: text('<svg onload="x"/>'), name: 'x.svg', type: 'image/svg+xml' })).status, 400);
  assert.deepEqual(svg.calls.uploads, []);
  const before = messagesRoute(A, { attachmentsTable: false });
  const response = await before.post({ body: 'mire' }, { bytes: png, name: 'x.png', type: 'image/png' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).attachments, false);
  assert.deepEqual(before.calls.uploads, []);
  const anonymous = messagesRoute(null);
  assert.equal((await anonymous.post({ body: 'x' }, { bytes: png, name: 'x.png', type: 'image/png' })).status, 401);
  assert.deepEqual(anonymous.calls.uploads, []);
});

// Service requests and feedback: the store writes for the session reservation only, with a fallback.
function store({ missing = false, estado = 'confirmada', fin = '2026-12-01' } = {}) {
  const calls = { inserts: [], upserts: [], emails: [] };
  const client = {
    rpc: async () => ({ data: true, error: null }),
    from: table => {
      const q = { select() { return q; }, eq(k, v) { q.eqs = [...(q.eqs ?? []), [k, v]]; return q; },
        maybeSingle: async () => ({ data: { codigo: 'VT-A', destino: 'Miami', estado, fecha_inicio: '2026-11-18', fecha_fin: fin, pasajeros: { adultos: 2, ninos: 1 } }, error: null }),
        insert: row => { calls.inserts.push([table, row]); return { select: () => ({ single: async () => missing && table !== 'support_tickets' ? { data: null, error: { code: 'PGRST205' } } : { data: { id: `${table}-1` }, error: null } }) }; },
        upsert: (row, options) => { calls.upserts.push([table, row, options]); return { select: () => ({ single: async () => missing ? { data: null, error: { code: 'PGRST205' } } : { data: { id: 'fb-1' }, error: null } }) }; },
      };
      return q;
    },
  };
  const storeModule = load('src/lib/trip-request-store.ts', {
    'server-only': {}, 'node:crypto': nodeCrypto,
    '@/lib/reservation-messages': messages, '@/lib/trip-requests': requests,
    '@/lib/notifications': { sendResendEmail: async email => { calls.emails.push(email); }, captureNotificationFailure() {} },
    '@/lib/site-config': { siteConfig: { supportEmail: 'qa@example.invalid', url: 'https://example.invalid' } },
    '@/lib/public-security': { clientIP: () => '192.0.2.1' },
    '@/lib/portal-summary': load('src/lib/portal-summary.ts', {}, { Intl }),
  }, { Intl });
  return { client, module: storeModule, calls };
}

function servicesRoute(id, options = {}) {
  const s = store(options);
  const route = load('src/app/api/mi-reserva/servicios/route.ts', { ...session(id), '@/lib/supabase/admin': { createAdminClient: () => s.client }, '@/lib/public-security': { readBody: async request => Buffer.from(await request.arrayBuffer()) }, '@/lib/trip-requests': requests, '@/lib/trip-request-store': s.module });
  return { post: (body, origin) => route.POST(new Request('https://example.invalid/api/mi-reserva/servicios', { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) })), calls: s.calls };
}

test('a service request is recorded for the session reservation with server-side context, then notified', async () => {
  const { post, calls } = servicesRoute(A);
  const response = await post({ service: 'auto', note: ' SUV ', reservation_id: B, destination: 'Otro lugar' });
  assert.equal(response.status, 200);
  assert.equal(calls.inserts.length, 1);
  const [table, row] = calls.inserts[0];
  assert.equal(table, 'trip_service_requests');
  assert.deepEqual(plain(row), { reservation_id: A, service: 'auto', note: 'SUV', destination: 'Miami', trip_start: '2026-11-18', trip_end: '2026-12-01', travelers: 3 });
  assert.equal(calls.emails.length, 1);
  assert.match(calls.emails[0].text, /Auto de alquiler/);
});

test('without its table a service request becomes a support request, never lost; bad input and other origins are refused', async () => {
  const fallback = servicesRoute(A, { missing: true });
  assert.equal((await fallback.post({ service: 'traslado' })).status, 200);
  assert.deepEqual(fallback.calls.inserts.map(([table]) => table), ['trip_service_requests', 'support_tickets']);
  assert.equal(fallback.calls.inserts[1][1].reservation_id, A);
  assert.equal(fallback.calls.inserts[1][1].asunto, 'Solicitud de servicio: Traslado');
  const invalid = servicesRoute(A);
  assert.equal((await invalid.post({ service: 'yate' })).status, 400);
  assert.equal((await invalid.post({ service: 'auto', note: 'x'.repeat(601) })).status, 400);
  assert.equal(invalid.calls.inserts.length, 0);
  assert.equal((await servicesRoute(A).post({ service: 'auto' }, 'https://evil.invalid')).status, 403);
  assert.equal((await servicesRoute(null).post({ service: 'auto' })).status, 401);
  assert.equal((await servicesRoute(A, { estado: 'cancelada' }).post({ service: 'auto' })).status, 409);
});

test('feedback opens on the last day of the trip, is one per reservation and never depends on the rating', async () => {
  const s = store({ fin: '2026-12-01' });
  const route = id => load('src/app/api/mi-reserva/opinion/route.ts', { ...session(id), '@/lib/supabase/admin': { createAdminClient: () => s.client }, '@/lib/public-security': { readBody: async request => Buffer.from(await request.arrayBuffer()) }, '@/lib/trip-requests': requests, '@/lib/trip-request-store': s.module });
  const post = (id, body) => route(id).POST(new Request('https://example.invalid/api/mi-reserva/opinion', { method: 'POST', body: JSON.stringify(body) }));
  assert.equal((await post(A, { rating: 5 })).status, 409, 'not before the trip ends');
  const ended = store({ fin: '2026-01-10' });
  const endedRoute = load('src/app/api/mi-reserva/opinion/route.ts', { ...session(A), '@/lib/supabase/admin': { createAdminClient: () => ended.client }, '@/lib/public-security': { readBody: async request => Buffer.from(await request.arrayBuffer()) }, '@/lib/trip-requests': requests, '@/lib/trip-request-store': ended.module });
  const send = body => endedRoute.POST(new Request('https://example.invalid/api/mi-reserva/opinion', { method: 'POST', body: JSON.stringify(body) }));
  assert.equal((await send({ rating: 2, comment: 'Mejorable', reservation_id: B })).status, 200);
  assert.deepEqual(plain(ended.calls.upserts[0][1]).reservation_id, A);
  assert.equal(plain(ended.calls.upserts[0][2]).onConflict, 'reservation_id');
  assert.equal((await send({ rating: 6 })).status, 400);
  assert.equal((await post(null, { rating: 5 })).status, 401);
});

test('request and feedback validation', () => {
  assert.deepEqual(plain(requests.validateServiceRequest({ service: 'hotel', note: undefined })), { service: 'hotel', note: '' });
  assert.equal(requests.validateServiceRequest({ service: 'hotel', note: 'a\u0000b' }), null);
  assert.equal(requests.validateServiceRequest({ service: 'hotel', note: 7 }), null);
  assert.deepEqual(plain(requests.validateFeedback({ rating: '4', comment: ' Bien ' })), { rating: 4, comment: 'Bien' });
  assert.equal(requests.validateFeedback({ rating: 0, comment: '' }), null);
  assert.equal(requests.validateFeedback({ rating: 3.5, comment: '' }), null);
});

test('support-request fallbacks read back as requests and feedback in Mi viaje', () => {
  const tickets = [
    { id: 't1', asunto: 'Solicitud de servicio: Auto de alquiler', mensaje: 'x', estado: 'en_revision', created_at: '2026-10-20T10:00:00Z', respuesta: null },
    { id: 't2', asunto: 'Opinión del viaje (4 de 5)', mensaje: 'x', estado: 'abierto', created_at: '2026-10-21T10:00:00Z', respuesta: null },
    { id: 't3', asunto: 'Vuelos', mensaje: 'x', estado: 'abierto', created_at: '2026-10-21T10:00:00Z', respuesta: null },
  ];
  assert.deepEqual(plain(model.requestsFromTickets(tickets)), [{ id: 't1', service: 'auto', status: 'en_cotizacion', createdAt: '2026-10-20T10:00:00Z' }]);
  assert.deepEqual(plain(model.feedbackFromTickets(tickets)), { rating: 4 });
  assert.deepEqual(plain(model.pendingServices({ requests: [{ service: 'auto', status: 'nueva' }, { service: 'hotel', status: 'cerrada' }] })), ['auto']);
});

// ---------------------------------------------------------------------------------------------------------
// Copy

test('every message key the Mi viaje screens use exists in Spanish and English, with no response-time promise', () => {
  const read = locale => JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'));
  const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
  const scopes = { trip: ['trip-overview', 'trip-shell', 'trip-itinerary', 'trip-records', 'trip-destination-page', 'trip-portal'], 'trip.chat': ['trip-chat'], 'trip.request': ['service-request'], 'trip.feedback': ['trip-feedback'] };
  for (const locale of ['es', 'en']) {
    const messages = read(locale);
    for (const [scope, files] of Object.entries(scopes)) for (const file of files) {
      const source = fs.readFileSync(`src/components/trip/${file}.tsx`, 'utf8');
      for (const [, key] of source.matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)) assert.notEqual(get(messages, `${scope}.${key}`), undefined, `${locale}: ${scope}.${key}`);
    }
    for (const group of ['items']) for (const key of offers.offerKeys) for (const field of ['title', 'short', 'label', 'body', 'cta', 'placeholder']) assert.ok(get(messages, `trip.offers.${group}.${key}.${field}`), `${locale}: offers ${key}.${field}`);
    for (const phase of ['planning', 'week', 'soon', 'eve', 'today', 'during', 'after']) assert.ok(get(messages, `trip.checklist.title.${phase}`));
    for (const status of requests.requestStatuses) assert.ok(get(messages, `trip.requests.status.${status}`));
    const trip = JSON.stringify(messages.trip);
    assert.doesNotMatch(trip, /(\d+\s?[–-]\s?\d+\s?horas|en menos de|respondemos en|within \d|reply within|\d+\s?hours?)/i, `${locale}: no response-time promises`);
    assert.equal(/\p{Extended_Pictographic}/u.test(trip), false);
  }
});

test('every customer API route takes the reservation from the signed session and never from the request', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : entry.name === 'route.ts' ? [`${dir}/${entry.name}`] : []);
  const routes = walk('src/app/api/mi-reserva');
  assert.ok(routes.length >= 10, `found ${routes.length} routes`);
  for (const file of routes) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /verifyPortalCookie\(/, `${file}: checks the portal session`);
    assert.doesNotMatch(source, /(form|searchParams)\.get\(["'](reservation_?id|reserva(cion)?)["']\)|\b(input|body|json|payload)\??\.(reservation_?id|reservationId)\b|params\)?\)?\.(reservation_?id|reservationId)\b/, `${file}: no reservation id from the request`);
  }
});
