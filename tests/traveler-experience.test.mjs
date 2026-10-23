// Traveller experience: the shared trip view (portal, preview, itinerary PDF, email), formatting, the
// reservation conversation API and its authorization, test-send safety and the receipt amount in words.
// No database, network or email provider: every dependency is a test double or a pure module.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as nodeCrypto from 'node:crypto';
import { load } from './security-support.mjs';
import { tripViewModule, tripEmailDeps, format } from './trip-support.mjs';

const view = tripViewModule();
const fixtures = load('src/lib/trip-fixtures.ts').tripFixtures('2026-10-21');
// Values built inside the vm sandbox have that realm's prototypes; compare plain copies.
const plain = value => JSON.parse(JSON.stringify(value));
const build = name => plain(view.buildTripView(structuredClone(fixtures[name].input)));

test('Miami fixture: registered stage, balance step and honest milestones', () => {
  const trip = build('miami-pendiente');
  assert.equal(trip.stage, 'registered');
  assert.equal(trip.nextStep, 'balance');
  assert.deepEqual(trip.milestones.map(m => m.state), ['done', 'current', 'upcoming', 'upcoming']);
  assert.equal(trip.finance.balance, 950);
  assert.equal(trip.finance.state, 'due');
  assert.equal(trip.ticketing, 'pending');
});

test('timeline places flights on their days and folds empty days into one free stretch', () => {
  const trip = build('miami-pendiente');
  assert.deepEqual(trip.timeline.map(entry => entry.type === 'day' ? `D${entry.dayNumber}:${entry.date}` : `free:${entry.days}`), ['D1:2026-11-18', 'free:4', 'D6:2026-11-23']);
  const outbound = trip.journeys[0];
  assert.equal(outbound.stops, 1);
  assert.equal(outbound.connections[0].city, 'San Salvador');
  assert.equal(outbound.connections[0].minutes, 90);
});

test('overnight connection, next-day legs and day 1 before the hotel check-in', () => {
  const trip = build('cancun-listo');
  assert.equal(trip.timeline[0].date, '2026-10-25');
  assert.equal(trip.journeys[0].connections[0].overnight, true);
  assert.equal(trip.stage, 'ready');
  assert.equal(trip.nextStep, 'readySoon');
  const day2 = trip.timeline.find(entry => entry.type === 'day' && entry.date === '2026-10-26');
  assert.deepEqual(day2.events.map(event => event.kind), ['service', 'checkin']);
  assert.ok(trip.services.some(service => service.title === 'Tour a Chichén Itzá' && service.included.includes('Almuerzo')));
});

test('ticket numbers appear only once tickets are issued; travelers only once reviewed', () => {
  assert.ok(build('cancun-listo').travelers.every(traveler => traveler.ticketNumber));
  const input = structuredClone(fixtures['cancun-listo'].input);
  input.travel.status = 'en_emision';
  assert.ok(plain(view.buildTripView(input)).travelers.every(traveler => !traveler.ticketNumber));
  input.travel.reviewed = false;
  const unreviewed = plain(view.buildTripView(input));
  assert.equal(unreviewed.travelers.length, 0);
  assert.equal(unreviewed.nextStep, 'travelersReview');
  assert.equal(unreviewed.documents.find(document => document.key === 'itinerary').status, 'processing');
});

test('the projection never carries private passenger fields', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  Object.assign(input.travel.passengers[0], { documentNumber: 'PASSPORTSECRET', birthDate: '1990-01-01', phone: 'PHONESECRET', notes: 'NOTESECRET' });
  input.details.notasInternas = 'INTERNALSECRET';
  assert.doesNotMatch(JSON.stringify(plain(view.buildTripView(input))), /SECRET|birthDate|documentNumber|notasInternas/);
});

test('group fixture: processing tickets with approved estimate and airport-change free between journeys', () => {
  const trip = build('grupo-multidestino');
  assert.equal(trip.stage, 'ticketing');
  assert.deepEqual(trip.estimate, { min: 24, max: 48 });
  assert.equal(trip.travelers.length, 9);
  assert.equal(trip.separateTickets, true);
  assert.equal(trip.journeys[2].legs[0].dayShift, 1);
});

test('cancelled reservation: cancelled stage, no ticket document, contact step', () => {
  const trip = build('cancelada');
  assert.equal(trip.stage, 'cancelled');
  assert.equal(trip.nextStep, 'cancelled');
  assert.ok(!trip.documents.some(document => document.key === 'tickets'));
  assert.deepEqual(trip.milestones.map(m => m.state), ['done', 'upcoming', 'upcoming', 'upcoming']);
});

test('trip timing drives in-progress and completed stages once the trip is confirmed', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  input.reservation.supplier_status = 'confirmada';
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-11-20' })).stage, 'in_progress');
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-11-30' })).stage, 'completed');
});

test('payments in another currency are not subtracted from the balance', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  input.payments.push({ monto: 10000, moneda: 'HNL', fecha_pago: '2026-10-16' });
  const trip = plain(view.buildTripView(input));
  assert.equal(trip.finance.balance, 950);
  assert.equal(trip.finance.otherCurrency, true);
});

test('dates and clock times are formatted without time-zone shifts', () => {
  assert.equal(format.formatClock('00:05'), '12:05 a. m.');
  assert.equal(format.formatClock('23:59', 'en'), '11:59 PM');
  assert.equal(format.formatDateRange('2026-11-18', '2026-11-23'), '18 – 23 de noviembre de 2026');
  assert.equal(format.formatTripDate('2026-01-01', 'es', 'long'), '1 de enero de 2026');
  assert.equal(format.formatMinutes(95), '1 h 35 min');
  assert.equal(format.formatClock('25:00'), '');
});

test('itinerary email escapes data, links to Mi viaje with only the reference, and has a text version', () => {
  const email = load('src/lib/travel-email.ts', tripEmailDeps());
  const fixture = structuredClone(fixtures['miami-pendiente']);
  fixture.input.travel.passengers[0].firstName = '<script>alert(1)</script>';
  const reservation = { ...fixture.input.reservation, cliente_nombre: '<img src=x onerror=alert(1)>', accepted_snapshot: { quotation: { detalles: fixture.input.details } } };
  const mail = email.itineraryEmail(reservation, fixture.input.travel, '2026-10-21');
  assert.doesNotMatch(mail.html, /<script>|<img src=x/);
  assert.match(mail.html, /mi-reserva\?ref=VT-QA0001AB/);
  assert.doesNotMatch(mail.html, /apellido=|otp=|token=/i);
  assert.match(mail.subject, /Miami/);
  assert.match(mail.text, /Estado de la reserva: Reserva registrada/);
  assert.doesNotMatch(mail.text, /Todo listo|Boletos emitidos|confirmada/i);
  assert.match(mail.text, /Ver mi viaje: https:\/\/www\.miviatour\.com\/mi-reserva\?ref=VT-QA0001AB/);
});

test('receipt amount is written in Spanish words', () => {
  const words = load('src/lib/amount-words.ts');
  assert.equal(words.amountInWords(950, 'USD'), 'Novecientos cincuenta dólares estadounidenses con 00/100');
  assert.equal(words.amountInWords(21, 'HNL'), 'Veintiún lempiras con 00/100');
  assert.equal(words.amountInWords(2000000, 'HNL'), 'Dos millones de lempiras con 00/100');
  assert.equal(words.amountInWords(1450.5, 'USD'), 'Mil cuatrocientos cincuenta dólares estadounidenses con 50/100');
});

const messages = load('src/lib/reservation-messages.ts');
const portalDocuments = load('src/lib/portal-documents.ts');
const chatAttachments = load('src/lib/chat-attachments.ts', { '@/lib/portal-documents': portalDocuments }, { String, RegExp, encodeURIComponent });
test('message validation trims, bounds and rejects control characters and unknown topics', () => {
  assert.deepEqual(plain(messages.validateMessage({ body: '  Hola  ', topic: 'vuelo' })), { body: 'Hola', topic: 'vuelo' });
  assert.equal(messages.validateMessage({ body: '', topic: null }), null);
  assert.equal(messages.validateMessage({ body: 'x'.repeat(2001), topic: null }), null);
  assert.equal(messages.validateMessage({ body: 'a\u0000b', topic: null }), null);
  assert.equal(messages.validateMessage({ body: 'ok', topic: 'admin' }), null);
  assert.equal(messages.missingTable({ code: 'PGRST205' }), true);
});

function messagesRoute({ session = "A", limit = true, origin } = {}) {
  const calls = { reads: 0, inserts: [], emails: 0, filters: [] };
  const query = { select() { return query; }, eq(k, v) { calls.filters.push([k, v]); return query; }, in() { return query; }, order() { return query; }, limit: async () => ({ data: [], error: null }), maybeSingle: async () => ({ data: { codigo: 'VT-A' } }), update() { return query; } };
  const client = { rpc: async () => ({ data: limit, error: null }), from: table => { calls.reads++; if (table === 'reservation_messages') return { ...query, insert: row => { calls.inserts.push(row); return { select: () => ({ single: async () => ({ data: { id: 'm1', ...row, created_at: 'now' }, error: null }) }) }; } }; return query; } };
  const route = load('src/app/api/mi-reserva/mensajes/route.ts', {
    'node:crypto': nodeCrypto,
    'next/headers': { cookies: async () => ({ get: () => (session ? { value: 'cookie' } : undefined) }) },
    '@/lib/portal': { portalCookieName: 'c', verifyPortalCookie: () => session },
    '@/lib/supabase/admin': { createAdminClient: () => client },
    '@/lib/public-security': { clientIP: () => '192.0.2.1', readBody: async request => Buffer.from(await request.arrayBuffer()) },
    '@/lib/reservation-messages': messages,
    '@/lib/chat-attachments': chatAttachments,
    '@/lib/attachment-image': { cleanImage: async (bytes, mime) => ({ bytes: Buffer.from(bytes), mime }) },
    '@/lib/portal-documents': portalDocuments,
    '@/lib/notifications': { sendResendEmail: async () => { calls.emails++; }, captureNotificationFailure() {} },
    '@/lib/site-config': { siteConfig: { supportEmail: 'qa@example.invalid', url: 'https://example.invalid' } },
  });
  const post = body => route.POST(new Request('https://example.invalid/api/mi-reserva/mensajes', { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) }));
  return { route, post, calls };
}

test('messages API rejects requests without a session before touching data', async () => {
  const { route, post, calls } = messagesRoute({ session: null });
  assert.equal((await route.GET()).status, 401);
  assert.equal((await post({ body: 'Hola' })).status, 401);
  assert.equal(calls.reads, 0);
});

test('messages API writes only to the session reservation and ignores IDs in the body', async () => {
  const { post, calls } = messagesRoute();
  const response = await post({ body: 'Hola', topic: 'vuelo', reservation_id: 'B', sender: 'agencia' });
  assert.equal(response.status, 200);
  assert.deepEqual(plain(calls.inserts), [{ reservation_id: 'A', sender: 'cliente', topic: 'vuelo', body: 'Hola' }]);
  assert.equal(calls.emails, 1);
});

test('messages API refuses cross-origin posts and enforces the rate limit', async () => {
  assert.equal((await messagesRoute({ origin: 'https://evil.invalid' }).post({ body: 'Hola' })).status, 403);
  const limited = messagesRoute({ limit: false });
  assert.equal((await limited.post({ body: 'Hola' })).status, 429);
  assert.equal(limited.calls.inserts.length, 0);
});

test('admin document route only opens paths inside the requested reservation', async () => {
  let signed = 0;
  const id = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
  const route = load('src/app/api/admin/reservas/[id]/documentos/route.ts', {
    '@/lib/admin': { requireAdmin: async () => ({ client: { storage: { from: () => ({ createSignedUrl: async () => { signed++; return { data: { signedUrl: 'https://storage.invalid/x' } }; } }) } } }) },
    '@/lib/quotation-validation': { validUuid: value => /^[0-9a-f-]{36}$/.test(value) },
    '@/lib/portal-documents': load('src/lib/portal-documents.ts'),
  });
  const get = path => route.GET(new Request(`https://example.invalid?ruta=${encodeURIComponent(path)}`), { params: Promise.resolve({ id }) });
  assert.equal((await get(`${other}/viatour/abcdef12-x.pdf`)).status, 404);
  assert.equal((await get(`${id}/../${other}/a.pdf`)).status, 404);
  assert.equal(signed, 0);
  assert.equal((await get(`${id}/viatour/abcdef12-voucher.pdf`)).status, 303);
});

test('internal test send is disabled without an approved list and never goes to other addresses', async () => {
  let calls = 0;
  const make = env => load('src/app/admin/reservas/send-itinerary-test.ts', {
    '@/lib/admin': { requireAdmin: async () => ({ client: {} }) },
    '@/lib/reservation-data': { getAdminReservation: async () => ({ reservation: { id: 'r', codigo: 'VT-A', cliente_email: 'customer@example.invalid', accepted_snapshot: { quotation: { detalles: {} } } } }) },
    '@/lib/travel-data': { getTravel: async () => ({ revision: 1, data: { reviewed: true, passengers: [{}] } }) },
    '@/lib/itinerary-pdf': { renderItineraryPdf: async () => Buffer.from('%PDF') },
    '@/lib/travel-calendar': { renderTravelCalendar: () => '' },
    '@/lib/quotation-details': { sanitizeDetails: () => ({}), expandedDetails: () => ({ vuelos: { journeys: [] } }) },
    '@/lib/travel-email': { itineraryEmail: () => ({ subject: 'S', text: 'T', html: '<body></body>' }) },
    '@/lib/quotation-validation': { validUuid: () => true },
    '@/lib/site-config': { siteConfig: { supportEmail: 'qa@example.invalid' } },
    '@/lib/test-recipients': load('src/lib/test-recipients.ts', { 'server-only': {} }, { process: { env } }),
  }, { process: { env: { RESEND_API_KEY: 'test-only', ...env } }, fetch: async () => { calls++; return new Response('{}', { status: 200 }); } });
  const form = to => { const data = new FormData(); data.set('id', 'r'); data.set('testRecipient', to); return data; };
  assert.match((await make({}).sendItineraryTest({}, form('owner@example.invalid'))).error, /deshabilitada/);
  const allowed = make({ TRAVEL_TEST_RECIPIENTS: 'owner@example.invalid, customer@example.invalid' });
  assert.match((await allowed.sendItineraryTest({}, form('someone@example.invalid'))).error, /aprobados/);
  assert.match((await allowed.sendItineraryTest({}, form('customer@example.invalid'))).error, /cliente/);
  assert.equal(calls, 0);
  assert.match((await allowed.sendItineraryTest({}, form('OWNER@example.invalid'))).success, /únicamente/);
  assert.equal(calls, 1);
});

test('status never overstates: partial supplier confirmation and agency-only states stay "registered"', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  for (const supplier of ['pendiente', 'parcial', null]) {
    const trip = plain(view.buildTripView({ ...input, reservation: { ...input.reservation, supplier_status: supplier } }));
    assert.equal(trip.stage, 'registered', String(supplier));
    assert.equal(trip.supplierConfirmed, false);
  }
  assert.equal(plain(view.buildTripView({ ...input, reservation: { ...input.reservation, supplier_status: 'confirmada' } })).stage, 'confirmed');
  // Tickets "issued" without a supplier confirmation is not "ready".
  const issued = structuredClone(input); issued.travel.status = 'emitida';
  assert.notEqual(plain(view.buildTripView(issued)).stage, 'ready');
});

test('pre-reservations have their own stage and first milestone', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  const trip = plain(view.buildTripView({ ...input, reservation: { ...input.reservation, prerreserva: true, supplier_status: 'confirmada' } }));
  assert.equal(trip.stage, 'prereserved');
  assert.equal(trip.milestones[0].key, 'prereserved');
  assert.equal(trip.documents.find(document => document.key === 'confirmation').status, 'pending');
});

test('dates alone never move an unconfirmed trip to in progress or completed', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-11-20' })).stage, 'registered');
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-12-30' })).stage, 'registered');
});

test('a paid invoice total is the customer-facing total (recovered reservation shape: 578 accepted, 548 paid and invoiced)', () => {
  const input = structuredClone(fixtures['miami-pendiente'].input);
  input.reservation.total = 578; input.payments = [{ monto: 548, moneda: 'USD', fecha_pago: '2026-10-20' }];
  assert.equal(plain(view.buildTripView(input)).finance.balance, 30);
  input.invoices = [{ estado: 'pagada', total: 548, moneda: 'USD' }];
  const finance = plain(view.buildTripView(input)).finance;
  assert.equal(finance.state, 'paid'); assert.equal(finance.balance, 0); assert.equal(finance.total, 548);
  assert.equal(finance.adjusted, true); assert.equal(finance.reservationTotal, 578);
  for (const invoices of [[{ estado: 'emitida', total: 548, moneda: 'USD' }], [{ estado: 'pagada', total: 548, moneda: 'HNL' }]]) {
    assert.equal(plain(view.buildTripView({ ...input, invoices })).finance.balance, 30);
  }
});

test('a cancelled trip offers no itinerary or confirmation and never shows the trip as upcoming work', () => {
  const trip = build('cancelada');
  assert.deepEqual(trip.documents.filter(document => ['itinerary', 'confirmation', 'tickets'].includes(document.key)), []);
  assert.equal(trip.nextStep, 'cancelled');
});

test('a booking code shared by every traveler is grouped once; different codes stay per traveler', () => {
  const trip = build('miami-emitido');
  assert.deepEqual(trip.confirmations, [{ airline: 'Avianca', pnr: 'QA3ZI3', travelerIds: ['p1', 'p2'] }]);
  assert.deepEqual(trip.travelers.map(traveler => traveler.ticket), ['issued', 'issued']);
  const input = structuredClone(fixtures['miami-emitido'].input);
  input.travel.tickets[1].pnr = 'QAOTHER';
  assert.equal(plain(view.buildTripView(input)).confirmations.length, 2);
});

test('an issued file without a person\'s ticket number never shows that person as issued', () => {
  const input = structuredClone(fixtures['miami-emitido'].input);
  input.travel.tickets[1].number = '';
  const trip = plain(view.buildTripView(input));
  assert.deepEqual(trip.travelers.map(traveler => traveler.ticket), ['issued', 'processing']);
  assert.equal(trip.travelers[1].ticketNumber, '');
});

test('next step follows the calendar once everything is ready: check-in two days out, travel day', () => {
  const input = structuredClone(fixtures['miami-emitido'].input);
  assert.equal(plain(view.buildTripView(input)).nextStep, 'ready');
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-11-13' })).nextStep, 'readySoon');
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-11-16' })).nextStep, 'checkin');
  const travelDay = plain(view.buildTripView({ ...input, today: '2026-11-18' }));
  assert.equal(travelDay.stage, 'in_progress');
  assert.equal(travelDay.nextStep, 'travelDay');
  assert.equal(plain(view.buildTripView({ ...input, today: '2026-11-20' })).nextStep, 'inProgress');
});

test('single unreviewed traveler and completed fixtures: no names, no tickets, honest stages', () => {
  const single = build('un-viajero');
  assert.equal(single.stage, 'registered');
  assert.equal(single.travelers.length, 0);
  assert.equal(single.confirmations.length, 0);
  assert.equal(single.travelerCount, 1);
  assert.equal(single.finance.state, 'due');
  const done = build('completado');
  assert.equal(done.stage, 'completed');
  assert.equal(done.nextStep, 'completed');
  assert.deepEqual(done.milestones.map(m => m.state), ['done', 'done', 'done', 'done']);
});

test('destination content: whole-word match to published entries, suggestions exclude the trip destination', () => {
  const match = load('src/lib/destination-match.ts');
  const content = load('src/lib/trip-destination.ts', { '@/lib/destination-match': match });
  const items = [
    { slug: 'cancun', nombre: 'Cancún', intro: 'Intro Cancún', cuerpo: 'Cuerpo', imagen_url: '/destinos/cancun.jpg', destacado: true, publicado: true },
    { slug: 'nueva-york', nombre: 'Nueva York', intro: 'Intro NY', cuerpo: '', imagen_url: null, destacado: true, publicado: true },
    { slug: 'punta-cana', nombre: 'Punta Cana', intro: 'Intro PC', cuerpo: '', imagen_url: '/destinos/punta-cana.jpg', destacado: true, publicado: true },
    { slug: 'york', nombre: 'York', intro: 'Otro', cuerpo: '', imagen_url: 'https://hotlink.example/x.jpg', destacado: true, publicado: true },
    { slug: 'oculto', nombre: 'Oculto', intro: 'No publicado', cuerpo: '', imagen_url: '/destinos/x.jpg', destacado: true, publicado: false },
  ];
  const cancun = plain(content.destinationContent('Cancún, México', items));
  assert.equal(cancun.destination.slug, 'cancun');
  assert.deepEqual(cancun.suggestions.map(item => item.slug), ['punta-cana'], 'no current destination, no remote or unpublished images');
  assert.equal(plain(content.destinationContent('Nueva York y Toronto', items)).destination.slug, 'nueva-york', 'longest name wins over "York"');
  assert.equal(plain(content.destinationContent('Miami', items)).destination, null, 'no published entry, no block');
});

test('chat: messages and support requests become one conversation; subjects come from the topic or the text', () => {
  const chat = load('src/lib/trip-chat.ts');
  const fromRequests = plain(chat.fromRequests([
    { id: 'b', asunto: 'Pagos', mensaje: 'Segundo', estado: 'abierto', created_at: '2026-10-19T10:00:00Z', respuesta: null },
    { id: 'a', asunto: 'Vuelos', mensaje: 'Primero', estado: 'respondido', created_at: '2026-10-17T10:00:00Z', respuesta: ' Respuesta ' },
  ]));
  assert.deepEqual(fromRequests.map(message => `${message.from}:${message.body}`), ['me:Primero', 'agency:Respuesta', 'me:Segundo']);
  assert.equal(fromRequests[1].at, null, 'a reply has no timestamp of its own');
  const fromMessages = plain(chat.fromMessages([{ id: '1', sender: 'agencia', topic: null, body: 'Hola', created_at: '2026-10-20T10:00:00Z', customer_read_at: null }]));
  const summary = plain(chat.chatSummary('messages', fromMessages));
  assert.equal(summary.unread, 1);
  assert.equal(summary.last.body, 'Hola');
  assert.equal(chat.requestSubject('x'.repeat(80), ''), `${'x'.repeat(57)}...`);
  assert.equal(chat.requestSubject('Texto', 'Vuelos'), 'Vuelos');
});
