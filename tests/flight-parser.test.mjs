import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { itinerary, parser } from './flight-support.mjs';

const fixture = name => fs.readFileSync(`tests/fixtures/${name}`, 'utf8').replace(/\r\n/g, '\n');
const parse = (text, referencia = '2026-10-12') => JSON.parse(JSON.stringify(parser.parseItinerary(text, { referencia })));
const route = journey => journey.segmentos.map(segment => `${segment.origen}-${segment.destino}`).join(' ');
const plain = value => JSON.parse(JSON.stringify(value));
const errors = result => result.issues.filter(issue => issue.nivel === 'error');

test('Aeromexico round trip from Google Flights becomes two journeys with every detail', () => {
  const result = parse(fixture('aeromexico-google.txt'));
  assert.equal(result.formato, 'google');
  assert.deepEqual(result.journeys.map(journey => journey.tipo), ['ida', 'regreso']);
  assert.deepEqual(result.journeys.map(route), ['SAP-MEX MEX-MTY', 'MTY-MEX MEX-SAP']);
  const [first, second] = result.journeys[0].segmentos;
  assert.deepEqual(plain({ ...first, id: undefined }), {
    origen: 'SAP', origenNombre: 'Aeropuerto Internacional Ramón Villeda Morales', destino: 'MEX', destinoNombre: 'Aeropuerto Internacional de la Ciudad de México',
    salidaFecha: '2026-10-15', salidaHora: '12:25', llegadaFecha: '2026-10-15', llegadaHora: '14:50', aerolinea: 'Aeromexico', vuelo: 'AM 675',
    operadoPor: 'Aeromexico Connect', aeronave: 'Embraer 190', cabina: 'Económica', claseReserva: '', duracionMin: 145, revisar: [],
  });
  assert.equal(second.vuelo, 'AM 962');
  assert.equal(second.aeronave, 'Boeing 737 MAX 9');
  assert.equal(second.salidaHora, '21:30');
  assert.equal(second.llegadaHora, '23:16');
  assert.equal(second.duracionMin, 106);
  assert.equal(itinerary.layoverMinutes(first, second), 400);
  const [back1, back2] = result.journeys[1].segmentos;
  assert.deepEqual([back1.vuelo, back1.salidaFecha, back1.salidaHora, back1.llegadaHora, back1.duracionMin], ['AM 901', '2026-10-25', '05:47', '07:35', 108]);
  assert.deepEqual([back2.vuelo, back2.salidaHora, back2.llegadaHora, back2.duracionMin], ['AM 674', '08:50', '11:25', 155]);
  assert.equal(itinerary.layoverMinutes(back1, back2), 75);
  assert.equal(itinerary.itineraryType(result.journeys), 'Ida y vuelta');
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.ignoradas, []);
});

test('Spanish Google Flights text with an overnight flight arriving the next day', () => {
  const result = parse(fixture('copa-iberia-es.txt'));
  assert.equal(result.journeys.length, 1);
  assert.equal(result.journeys[0].tipo, 'ida');
  const [panama, madrid] = result.journeys[0].segmentos;
  assert.deepEqual([panama.salidaFecha, panama.salidaHora, panama.llegadaHora, panama.aerolinea, panama.vuelo, panama.duracionMin], ['2026-11-03', '06:12', '08:45', 'Copa Airlines', 'CM 391', 93]);
  assert.deepEqual([madrid.salidaFecha, madrid.salidaHora, madrid.llegadaFecha, madrid.llegadaHora, madrid.vuelo, madrid.cabina, madrid.aeronave, madrid.duracionMin], ['2026-11-03', '22:10', '2026-11-04', '14:25', 'IB 6342', 'Económica', 'Airbus A330-200', 615]);
  assert.equal(itinerary.layoverMinutes(panama, madrid), 805);
  assert.equal(itinerary.journeyDuration(result.journeys[0]), 93 + 805 + 615);
  assert.deepEqual(result.issues, []);
});

test('messy HTML copy with svg, entities, no line breaks, two airlines and separate tickets', () => {
  const result = parse(fixture('frontier-avianca-messy.html'));
  assert.deepEqual(result.journeys.map(route), ['SAP-MCO MCO-DFW', 'DFW-SAL SAL-SAP']);
  const segments = result.journeys.flatMap(journey => journey.segmentos);
  assert.deepEqual(segments.map(segment => segment.vuelo), ['F9 362', 'F9 1481', 'AV 441', 'AV 534']);
  assert.deepEqual(segments.map(segment => segment.salidaFecha), ['2027-01-15', '2027-01-15', '2027-02-15', '2027-02-15']);
  assert.deepEqual(segments.map(segment => segment.duracionMin), [166, 197, 205, 55]);
  assert.equal(segments[2].operadoPor, 'Taca International Airlines');
  assert.equal(result.boletosSeparados, true);
  assert.ok(result.issues.some(issue => /boletos separados/.test(issue.mensaje)));
  assert.equal(errors(result).length, 0);
  assert.ok(!segments.some(segment => /svg|path|&#/.test(JSON.stringify(segment))));
});

test('Amadeus PNR segments are grouped into outbound and return and keep the booking class', () => {
  const result = parse(fixture('copa-amadeus.txt'));
  assert.equal(result.formato, 'gds');
  assert.deepEqual(result.journeys.map(route), ['SAP-PTY PTY-JFK', 'JFK-PTY PTY-SAP']);
  assert.deepEqual(result.journeys.map(journey => journey.tipo), ['ida', 'regreso']);
  const first = result.journeys[0].segmentos[0];
  assert.deepEqual([first.aerolinea, first.vuelo, first.claseReserva, first.salidaFecha, first.salidaHora, first.llegadaHora], ['Copa Airlines', 'CM 391', 'Y', '2026-11-03', '06:12', '08:45']);
  // GDS lines have no year: the date is proposed and must be confirmed.
  assert.ok(result.journeys.flatMap(journey => journey.segmentos).every(segment => segment.revisar.includes('salidaFecha')));
  assert.ok(result.issues.some(issue => /no indica el año/.test(issue.mensaje)));
  // Durations come from the airports' real time zones (Panama is one hour ahead of Honduras).
  assert.equal(itinerary.segmentDuration(first), 93);
});

test('Sabre segments with A/P time suffixes', () => {
  const result = parse(fixture('aeromexico-sabre.txt'));
  const [first, second] = result.journeys[0].segmentos;
  assert.deepEqual([first.salidaHora, first.llegadaHora, first.vuelo, first.aerolinea], ['12:25', '14:50', 'AM 675', 'Aeroméxico']);
  assert.deepEqual([second.salidaHora, second.llegadaHora], ['21:30', '23:16']);
  assert.equal(result.journeys.length, 1);
});

test('direct one-way flight on a single line', () => {
  const result = parse('Departing flight Tue, Oct 20 7:05 AM Toncontín International Airport (TGU) Travel time: 1 hr 25 min 9:30 AM Tocumen International Airport (PTY) Copa Airlines · Economy · Boeing 737-800 · CM 412');
  assert.equal(result.journeys.length, 1);
  const [segment] = result.journeys[0].segmentos;
  assert.deepEqual([segment.origen, segment.destino, segment.salidaFecha, segment.vuelo, segment.aeronave, segment.duracionMin], ['TGU', 'PTY', '2026-10-20', 'CM 412', 'Boeing 737-800', 85]);
  assert.equal(itinerary.itineraryType(result.journeys), 'Solo ida');
  assert.deepEqual(result.issues, []);
});

test('multi-city trips with "Flight 1/2/3" headers and a codeshare', () => {
  const text = `Flight 1 · Tue, Oct 20
8:00 AM
San Pedro Sula (SAP)
Travel time: 2 hr 20 min
11:20 AM
Miami International Airport (MIA)
Delta · Economy · Boeing 737-900 · DL 1234
Operated by Aeromexico
Flight 2 · Thu, Oct 22
1:00 PM
Miami International Airport (MIA)
Travel time: 3 hr
4:00 PM
John F. Kennedy International Airport (JFK)
American · Economy · Airbus A321 · AA 1200
Flight 3 · Tue, Nov 10
10:00 AM
John F. Kennedy International Airport (JFK)
Travel time: 5 hr 10 min
2:10 PM
San Pedro Sula (SAP)
American · Economy · AA 1580`;
  const result = parse(text);
  assert.deepEqual(result.journeys.map(route), ['SAP-MIA', 'MIA-JFK', 'JFK-SAP']);
  assert.deepEqual(result.journeys.map(journey => journey.tipo), ['tramo', 'tramo', 'tramo']);
  assert.equal(result.journeys[0].segmentos[0].operadoPor, 'Aeromexico');
  assert.equal(result.journeys[0].segmentos[0].aerolinea, 'Delta');
  assert.equal(result.journeys[2].segmentos[0].salidaFecha, '2026-11-10');
  assert.equal(itinerary.itineraryType(result.journeys), 'Multidestino');
  assert.equal(errors(result).length, 0);
});

test('open-jaw itinerary is accepted and reported as such', () => {
  const result = parse(` 1 AM 675Y 15OCT Q SAPMEX HK1  1225P  250P /E
 2 AM 680Y 25OCT Q CUNMEX HK1   900A 1115A /E
 3 AM 674Y 25OCT Q MEXSAP HK1   150P  425P /E`);
  assert.deepEqual(result.journeys.map(route), ['SAP-MEX', 'CUN-MEX MEX-SAP']);
  assert.equal(result.journeys[1].tipo, 'regreso');
  assert.ok(result.issues.some(issue => issue.nivel === 'info' && /regreso desde otra ciudad/.test(issue.mensaje)));
  assert.equal(itinerary.itineraryType(result.journeys), 'Ida y vuelta');
});

test('a "+1" on its own line moves the arrival to the next day for unknown airports', () => {
  const result = parse(`Departing flight Thu, Oct 15
11:40 PM
Aeropuerto Uno (QQA)
6:15 AM
+1
Aeropuerto Dos (QQB)
Example Air · Economy · ZZ 100`);
  const [segment] = result.journeys[0].segmentos;
  assert.equal(segment.llegadaFecha, '2026-10-16');
  assert.ok(result.issues.some(issue => issue.nivel === 'info' && /QQA no está en la lista/.test(issue.mensaje)));
});

test('arrival day without +1 and unknown time zones is flagged instead of guessed', () => {
  const result = parse(`Departing flight Thu, Oct 15
11:40 PM
Aeropuerto Uno (QQA)
6:15 AM
Aeropuerto Dos (QQB)
ZZ 100`);
  const [segment] = result.journeys[0].segmentos;
  assert.equal(segment.llegadaFecha, '2026-10-16');
  assert.ok(segment.revisar.includes('llegadaFecha'));
});

test('a date without year or weekday is proposed but must be confirmed', () => {
  const result = parse(fixture('aeromexico-google.txt').replace('Departing flight Thu, Oct 15', 'Departing flight Oct 15').replace('Returning flight Sun, Oct 25', 'Returning flight Oct 25'));
  const first = result.journeys[0].segmentos[0];
  assert.equal(first.salidaFecha, '2026-10-15');
  assert.ok(first.revisar.includes('salidaFecha'));
  assert.ok(result.issues.some(issue => /no indica el año/.test(issue.mensaje)));
});

test('dates in the past roll forward to the next year; the weekday settles it', () => {
  const result = parse(fixture('aeromexico-google.txt'), '2026-12-01');
  // Oct 15 is a Thursday in 2026 (already past) but a Friday in 2027: the weekday no longer fits.
  assert.ok(result.journeys[0].segmentos[0].revisar.includes('salidaFecha'));
});

test('Spanish "mar" is read as martes when a month is also written', () => {
  assert.deepEqual(plain(parser.parseDateText('mar, 10 de nov')), { month: 11, day: 10, weekday: 2 });
  assert.deepEqual(plain(parser.parseDateText('15 de marzo')), { month: 3, day: 15 });
  assert.deepEqual(plain(parser.parseDateText('jueves, 15 de octubre de 2026')), { month: 10, day: 15, year: 2026, weekday: 4 });
  assert.deepEqual(plain(parser.parseDateText('05/03/2027')), { day: 5, month: 3, year: 2027, ambiguous: true });
});

test('durations in several notations', () => {
  assert.equal(parser.parseDurationText('2 hr 25 min'), 145);
  assert.equal(parser.parseDurationText('1 h 33 min'), 93);
  assert.equal(parser.parseDurationText('55 min'), 55);
  assert.equal(parser.parseDurationText('6 horas 40 minutos'), 400);
  assert.equal(parser.parseDurationText('3 hr'), 180);
  assert.equal(parser.parseDurationText('sin datos'), null);
});

test('a duration that contradicts the schedule is reported', () => {
  const result = parse(fixture('aeromexico-google.txt').replace('Travel time: 2 hr 25 min', 'Travel time: 3 hr 25 min'));
  assert.ok(result.issues.some(issue => issue.nivel === 'aviso' && /no coincide con los horarios/.test(issue.mensaje)));
});

test('a missing flight number is reported, not invented', () => {
  const result = parse(fixture('aeromexico-google.txt').replace('AM 675\n', ''));
  const first = result.journeys[0].segmentos[0];
  assert.equal(first.vuelo, '');
  assert.ok(result.issues.some(issue => /falta el número de vuelo/.test(issue.mensaje)));
});

test('text without flights returns a clear error and no segments', () => {
  const result = parse('Hola, quisiera cotizar un viaje a Madrid para dos personas en diciembre.');
  assert.equal(result.formato, 'ninguno');
  assert.equal(result.journeys.length, 0);
  assert.equal(errors(result).length, 1);
});

test('lowercase or malformed airport codes are not accepted as IATA codes', () => {
  const result = parse('Departing flight Thu, Oct 15\n12:25 PM\nSan Pedro Sula (sap)\n2:50 PM\nMexico City (MEXX)');
  assert.equal(result.journeys.length, 0);
});

test('a missing arrival is flagged as an error', () => {
  const result = parse('Departing flight Thu, Oct 15\n12:25 PM\nSan Pedro Sula (SAP)\nAeromexico AM 675');
  assert.equal(result.journeys[0].segmentos.length, 1);
  assert.ok(errors(result).some(issue => /llegada/.test(issue.mensaje)));
});

test('pasted markup is treated as text and stripped', () => {
  const result = parse('<script>alert(1)</script><img src=x onerror=alert(1)>' + fixture('aeromexico-google.txt'));
  assert.equal(result.journeys.length, 2);
  assert.ok(!JSON.stringify(result).includes('alert'));
});

test('very long input is cut to the limit', () => {
  const result = parse('x'.repeat(parser.maxItineraryText + 5000));
  assert.ok(result.issues.some(issue => /se recortó/.test(issue.mensaje)));
});

test('validation catches impossible itineraries', () => {
  const base = parse(fixture('aeromexico-google.txt')).journeys;
  const swapped = plain(base);
  swapped[0].segmentos[1].salidaHora = '13:00';
  assert.ok(itinerary.validateItinerary(swapped).some(issue => issue.nivel === 'error' && /sale antes de que llegue/.test(issue.mensaje)));
  const backwards = plain(base);
  backwards[1].segmentos.forEach(segment => { segment.salidaFecha = '2026-10-10'; segment.llegadaFecha = '2026-10-10'; });
  assert.ok(itinerary.validateItinerary(backwards).some(issue => issue.nivel === 'error' && /antes de terminar el tramo anterior/.test(issue.mensaje)));
  const badCode = plain(base);
  badCode[0].segmentos[0].origen = 'SA';
  assert.ok(itinerary.validateItinerary(badCode).some(issue => issue.campo === 'origen' && issue.nivel === 'error'));
});

test('flight number format', () => {
  for (const value of ['AM 675', 'AM675', 'F9 1481', '5U 220', 'B6 1']) assert.ok(itinerary.flightNumberPattern.test(value), value);
  for (const value of ['675', 'AMX 675', 'AM', '12 345']) assert.ok(!itinerary.flightNumberPattern.test(value), value);
});
