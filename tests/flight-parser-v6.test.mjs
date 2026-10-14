import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { itinerary, parser, reference } from './flight-support.mjs';

// V6 regression suite: the American Airlines round trip copied from Google Flights by the owner
// (tests/fixtures/american-google.txt, permanent fixture) and the variants a browser copy produces.

const fixture = name => fs.readFileSync(`tests/fixtures/${name}`, 'utf8').replace(/\r\n/g, '\n');
const parse = (text, referencia = '2026-10-14') => JSON.parse(JSON.stringify(parser.parseItinerary(text, { referencia })));
const flat = result => result.journeys.flatMap(journey => journey.segmentos);
const errors = result => result.issues.filter(issue => issue.nivel === 'error');
const summary = segment => [segment.vuelo, segment.origen, segment.destino, segment.salidaFecha, segment.salidaHora, segment.llegadaFecha, segment.llegadaHora, segment.duracionMin, segment.aeronave].join(' ');

const expected = [
  'AA 360 SAP MIA 2026-11-10 13:14 2026-11-10 16:39 145 Boeing 737 MAX 8',
  'AA 1339 MIA PHL 2026-11-10 19:00 2026-11-10 21:54 174 Boeing 737',
  'AA 3308 PHL BOS 2026-11-11 08:10 2026-11-11 09:39 89 Airbus A321neo',
  'AA 690 BOS PHL 2026-11-24 06:00 2026-11-24 07:40 100 Airbus A321',
  'AA 2534 PHL MIA 2026-11-24 08:10 2026-11-24 11:20 190 Airbus A321neo',
  'AA 349 MIA SAP 2026-11-24 12:58 2026-11-24 14:36 158 Airbus A319',
];

function assertAmerican(result) {
  assert.equal(result.formato, 'google');
  assert.deepEqual(result.journeys.map(journey => journey.tipo), ['ida', 'regreso']);
  assert.deepEqual(flat(result).map(summary), expected);
  assert.ok(flat(result).every(segment => segment.aerolinea === 'American Airlines'));
  assert.ok(flat(result).every(segment => segment.cabina === 'Económica'));
  assert.ok(flat(result).every(segment => segment.revisar.length === 0), JSON.stringify(flat(result).map(segment => segment.revisar)));
  assert.deepEqual(errors(result), []);
}

test('American Airlines six-segment round trip from Google Flights (owner fixture)', () => {
  const result = parse(fixture('american-google.txt'));
  assertAmerican(result);
  const [sap, mia, phl] = result.journeys[0].segmentos;
  const [bos, phl2, mia2] = result.journeys[1].segmentos;
  assert.equal(itinerary.layoverMinutes(sap, mia), 141);
  assert.equal(itinerary.layoverMinutes(mia, phl), 616);
  assert.equal(itinerary.layoverMinutes(bos, phl2), 30);
  assert.equal(itinerary.layoverMinutes(phl2, mia2), 98);
  assert.ok(itinerary.isOvernightConnection(mia, phl));
  assert.ok(!itinerary.isOvernightConnection(sap, mia));
  // Durations agree with the airports' time zones (SAP is one hour behind Miami in November).
  for (const segment of flat(result)) assert.equal(itinerary.computedDuration(segment), segment.duracionMin, segment.vuelo);
  assert.equal(itinerary.itineraryType(result.journeys), 'Ida y vuelta');
  assert.equal(itinerary.journeyDuration(result.journeys[0]), 145 + 141 + 174 + 616 + 89);
  // Only the genuine points remain: the 30-minute connection must be reviewed; the overnight one is noted.
  const warnings = result.issues.filter(issue => issue.nivel === 'aviso');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].mensaje, /conexión corta de 30 min en Filadelfia \(PHL\)/);
  assert.equal(warnings[0].categoria, 'confirmar');
  assert.ok(result.issues.some(issue => issue.nivel === 'info' && /conexión nocturna de 10 h 16 min en Filadelfia/.test(issue.mensaje)));
  assert.deepEqual(result.ignoradas, []);
  const issues = itinerary.validateItinerary(result.journeys);
  assert.deepEqual(result.journeys.flatMap((journey, tramo) => journey.segmentos.map((segment, index) => itinerary.segmentStatus(segment, issues, tramo, index))),
    ['verificado', 'verificado', 'verificado', 'verificado', 'confirmar', 'verificado']);
});

test('browser copy with HTML, entities, Markdown, narrow no-break spaces and no line breaks', () => {
  const text = fixture('american-google.txt')
    .replace(/ (AM|PM)/g, ' $1')
    .replace('8:10 AM+1Philadelphia', '8:10 A&#x4D;**+1**Philadelphia')
    .replace('9:39 AM+1Boston', '9:39&nbsp;A&#77;<sup>+1</sup>Boston')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/svg/g, '<svg><path d="M0"/></svg>')
    .split('\n').map(line => `<div>${line}</div>`).join('');
  assertAmerican(parse(text));
});

test('the same itinerary pasted as one line keeps every flight', () => {
  assertAmerican(parse(fixture('american-google.txt').replace(/\n+/g, ' ')));
});

test('Spanish Google Flights text with glued "p. m." and markers', () => {
  const text = `Vuelo de idamar, 10 nov
1:14 p. m.Aeropuerto Internacional Ramón Villeda Morales (SAP)
Tiempo de viaje: 2 h 25 min
4:39 p. m.Aeropuerto Internacional de Miami (MIA)
American · Económica · Boeing 737MAX 8 PassengerAA 360
Escala de 2 h 21 min en Miami (MIA)
7:00 p. m.Aeropuerto Internacional de Miami (MIA)
Tiempo de viaje: 2 h 54 min
9:54 p. m.Aeropuerto Internacional de Filadelfia (PHL)
American · Económica · Boeing 737AA 1339
Escala de 10 h 16 min en Filadelfia (PHL)
8:10 a. m.+1Aeropuerto Internacional de Filadelfia (PHL)
Tiempo de viaje: 1 h 29 min
9:39 a. m.+1Aeropuerto Internacional Logan (BOS)
American · Económica · Airbus A321neoAA 3308`;
  const result = parse(text);
  assert.deepEqual(flat(result).map(summary), expected.slice(0, 3));
  assert.deepEqual(errors(result), []);
});

test('a 24-hour itinerary is not split on uppercase names that start with AM or PM', () => {
  const result = parse(`Departing flight Mon, Nov 9
10:00 AMSTERDAM AIRPORT SCHIPHOL (AMS)
Travel time: 11 hr 30 min
14:30 MEXICO CITY INTERNATIONAL AIRPORT (MEX)
KLM · Economy · Boeing 787-9 · KL 685`);
  const [segment] = flat(result);
  assert.deepEqual([segment.origen, segment.salidaHora, segment.destino, segment.llegadaHora, segment.vuelo, segment.aerolinea], ['AMS', '10:00', 'MEX', '14:30', 'KL 685', 'KLM']);
  assert.equal(itinerary.computedDuration(segment), 690);
});

test('an aircraft model alone is never read as a flight number', () => {
  const result = parse(`Departing flight Tue, Nov 24
6:00 AM
Boston Logan International Airport (BOS)
Travel time: 1 hr 40 min
7:40 AM
Philadelphia International Airport (PHL)
American · Economy · Airbus A321
AA 690`);
  const [segment] = flat(result);
  assert.equal(segment.vuelo, 'AA 690');
  assert.equal(segment.aeronave, 'Airbus A321');
});

test('durations are checked across a daylight-saving change', () => {
  // The United States moves to summer time on 2026-03-08; Honduras does not. The same flight lands one
  // hour later on the clock after the change.
  const text = `Departing flight Fri, Mar 6
1:14 PM
Ramón Villeda Morales International Airport (SAP)
Travel time: 2 hr 25 min
4:39 PM
Miami International Airport (MIA)
American · Economy · AA 360
Returning flight Mon, Mar 9
1:14 PM
Ramón Villeda Morales International Airport (SAP)
Travel time: 2 hr 25 min
5:39 PM
Miami International Airport (MIA)
American · Economy · AA 360`;
  const result = parse(text, '2026-02-01');
  assert.deepEqual(flat(result).map(segment => itinerary.computedDuration(segment)), [145, 145]);
  assert.ok(!result.issues.some(issue => /no coincide/.test(issue.mensaje)));
  const wrong = parse(text.replace('5:39 PM', '4:39 PM'), '2026-02-01');
  assert.ok(wrong.issues.some(issue => issue.categoria === 'contradictorio' && /no coincide con los horarios/.test(issue.mensaje)));
});

test('missing data is reported, never invented', () => {
  const result = parse(`Departing flight Tue, Nov 10
1:14 PM
Ramón Villeda Morales International Airport (SAP)
4:39 PM
Miami International Airport (MIA)
American · Economy`);
  const [segment] = flat(result);
  assert.equal(segment.vuelo, '');
  assert.ok(result.issues.some(issue => issue.categoria === 'faltante' && /falta el número de vuelo/.test(issue.mensaje)));
});

test('contradictory +1 marker against the stated layover is flagged', () => {
  const text = fixture('american-google.txt').replace('8:10 AM+1Philadelphia', '8:10 AM+2Philadelphia');
  const result = parse(text);
  assert.ok(result.issues.some(issue => issue.categoria === 'contradictorio' && /\+2/.test(issue.mensaje)));
  assert.ok(flat(result)[2].revisar.includes('salidaFecha'));
});

test('every reference airport has a valid IANA time zone and Spanish names', () => {
  for (const [code, info] of Object.entries(reference.airports)) {
    assert.match(code, /^[A-Z]{3}$/);
    assert.ok(info.ciudad && info.nombre, code);
    assert.notEqual(reference.zoneOffsetMinutes(info.zona, '2026-07-01'), null, `${code} ${info.zona}`);
  }
  assert.equal(reference.airportInfo('PHL').zona, 'America/New_York');
  assert.equal(reference.airportInfo('SAP').zona, 'America/Tegucigalpa');
  assert.equal(reference.airportInfo('QQA'), null);
  assert.equal(reference.zoneOffsetMinutes('America/Tegucigalpa', '2026-11-10'), -360);
  assert.equal(reference.zoneOffsetMinutes('America/New_York', '2026-11-10'), -300);
  assert.equal(reference.zoneOffsetMinutes('America/New_York', '2026-07-10'), -240);
});
