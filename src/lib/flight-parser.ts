import { airlineName, airportInfo, zoneOffsetMinutes } from "@/lib/flight-reference";
import { addDays, clockMinutes, dayDifference, emptySegment, validateItinerary, type FlightJourney, type FlightSegment, type ItineraryIssue, type JourneyKind } from "@/lib/flight-itinerary";

// Deterministic itinerary parser. It reads text copied from Google Flights (English or Spanish), airline
// e-mails with the same shape, and GDS segment lines (Amadeus / Sabre). The text is untrusted: it is only
// matched against patterns, never evaluated or rendered as HTML. Whatever it cannot settle is left empty
// or listed in segment.revisar for the advisor to confirm; it never invents a flight, time or year.

export const maxItineraryText = 20000;

export type ParseOptions = { referencia?: string; idPrefix?: string };
export type ParseResult = { formato: "google" | "gds" | "ninguno"; journeys: FlightJourney[]; issues: ItineraryIssue[]; ignoradas: string[]; boletosSeparados: boolean };

type DateParts = { month: number; day: number; year?: number; weekday?: number; ambiguous?: boolean };
type Point = { time: string; plusDays: number | null; code: string; name: string; date: DateParts | null };
type Draft = { segment: FlightSegment; points: Point[]; arrivalDate: DateParts | null; layoverBefore: number | null; connected: boolean; journey: number };
type JourneyDraft = { tipo: JourneyKind | null; date: DateParts | null };

const strip = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const monthNames: Record<string, number> = {
  jan: 1, january: 1, ene: 1, enero: 1, feb: 2, february: 2, febrero: 2, mar: 3, march: 3, marzo: 3, apr: 4, april: 4, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, june: 6, junio: 6, jul: 7, july: 7, julio: 7, aug: 8, august: 8, ago: 8, agosto: 8,
  sep: 9, sept: 9, september: 9, set: 9, septiembre: 9, setiembre: 9, oct: 10, october: 10, octubre: 10,
  nov: 11, november: 11, noviembre: 11, dec: 12, december: 12, dic: 12, diciembre: 12,
};
const weekdayNames: Record<string, number> = {
  sun: 0, sunday: 0, dom: 0, domingo: 0, mon: 1, monday: 1, lun: 1, lunes: 1, tue: 2, tues: 2, tuesday: 2, martes: 2,
  wed: 3, wednesday: 3, mie: 3, miercoles: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, jue: 4, jueves: 4,
  fri: 5, friday: 5, vie: 5, viernes: 5, sat: 6, saturday: 6, sab: 6, sabado: 6,
};

export function parseDateText(text: string): DateParts | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const numeric = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(text);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    // Day first, as written in Honduras; both readings possible means the advisor must confirm.
    if (second > 12 && first <= 12) return { day: second, month: first, year: Number(numeric[3]) };
    return { day: first, month: second, year: Number(numeric[3]), ambiguous: first <= 12 && second <= 12 && first !== second };
  }
  const gds = /\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|ENE|ABR|AGO|DIC)(\d{2})?\b/.exec(text);
  if (gds) return { day: Number(gds[1]), month: monthNames[gds[2].toLowerCase()], ...(gds[3] ? { year: 2000 + Number(gds[3]) } : {}) };
  const tokens = strip(text).split(/[^a-z0-9]+/).filter(Boolean);
  const monthTokens = tokens.filter(token => token in monthNames);
  let month: number | undefined;
  let weekday: number | undefined;
  for (const token of tokens) {
    // "mar" is both martes and marzo: it is the weekday when another month is also written.
    if (token === "mar" && monthTokens.length > 1 && weekday === undefined) { weekday = 2; continue; }
    if (month === undefined && token in monthNames && !(token in weekdayNames && weekday === undefined && monthTokens.length > 1)) { month = monthNames[token]; continue; }
    if (weekday === undefined && token in weekdayNames) weekday = weekdayNames[token];
  }
  if (!month) return null;
  const numbers = tokens.filter(token => /^\d+$/.test(token)).map(Number);
  const day = numbers.find(value => value >= 1 && value <= 31);
  if (!day) return null;
  const year = numbers.find(value => value >= 2000 && value <= 2100);
  return { month, day, ...(year ? { year } : {}), ...(weekday !== undefined ? { weekday } : {}) };
}

export function parseDurationText(text: string): number | null {
  const value = strip(text);
  const clock = /\b(\d{1,2}):(\d{2})\s*(?:h|hrs?|horas?)\b/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const hours = /(\d{1,2})\s*(?:hr|hrs|h|hours?|horas?)\b/.exec(value);
  const minutes = /(\d{1,3})\s*(?:min|mins|minutes?|minutos?|m)\b/.exec(value.replace(/(\d{1,2})\s*(?:hr|hrs|h|hours?|horas?)\b/, " "));
  if (!hours && !minutes) return null;
  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

function toClock(hours: number, minutes: number, meridiem?: string) {
  if (minutes > 59) return null;
  let value = hours;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    const pm = meridiem.toLowerCase() === "p";
    value = hours % 12 + (pm ? 12 : 0);
  } else if (hours > 23) return null;
  return `${String(value).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const timeLine = /^(\d{1,2})[:.h](\d{2})(?:\s*([ap])\.?\s*m\.?)?(?:\s*\+\s*(\d))?(?=\s|$|[–—-])\s*[–—-]?\s*(.*)$/i;
const airportPattern = /^(.*?)\(([A-Z]{3})\)\s*(.*)$/;
const currencyCodes = new Set(["USD", "HNL", "EUR", "MXN", "GTQ", "CRC", "PAB", "COP", "PEN", "CAD", "GBP"]);
const manufacturers = /\b(Airbus|Boeing|Embraer|Bombardier|ATR|Canadair|De Havilland|Dash|Comac|Fokker|McDonnell Douglas|Sukhoi|Cessna)\b/i;
const operatedPattern = /(?:plane and crew by|operated by|operado por|avi[oó]n y tripulaci[oó]n (?:de|por)|vuelo operado por)\s+(.+)$/i;
const headerPattern = /^(departing|departure|outbound|returning|return|vuelo de ida|vuelo de salida|vuelo de regreso|vuelo de vuelta|vuelo de retorno|ida|regreso|vuelta|retorno|salida)(?:\s+(?:flight|trip))?\b[\s:,·–—-]*(.*)$/;
const legPattern = /^(?:flight|vuelo|tramo|trip|leg)\s*(\d{1,2})\b[\s:,·–—-]*(.*)$/;
const noisePattern = /^(svg|path|img|icon|image|select flight|seleccionar vuelo|seleccionar|select|book|book with|reservar|more details|mas detalles|hide details|ocultar detalles|details|detalles|show more|ver mas|toggle|close|cerrar|info|nonstop|directo|sin escalas|\d+ stops?|\d+ escalas?|round trip|ida y vuelta|one way|solo ida|per person|por persona|price|precio|best|mejor|cheapest|mas barato|track prices|seguir precios|share|compartir|long layover|overnight layover|escala larga|conexion larga|escala nocturna)$/;
const amenityPattern = /(legroom|espacio para las piernas|wi-?fi|in-seat|usb|stream media|on-demand|video|entretenimiento|tomacorriente|power outlet|emissions|emisiones|co2|kg co|trees|arboles|often delayed|suele retrasarse|se retrasa|carbon|carbono|contrail|estelas? de condensacion|typical for this route|tipico para esta ruta|seat\b|asiento\b|personal device|dispositivo personal|livestream|television|meal|comida)/;
const separatePattern = /(separate tickets|boletos separados|boletos independientes|reservas separadas|self-transfer|self transfer|transbordo por cuenta propia)/;
const layoverWords = /(layover|escala|conexion|connection|stopover)/;
const pricePattern = /^(?:us\$|\$|l\.?|lps\.?|hnl|usd|€)\s?[\d.,]+|^[\d.,]+\s?(?:usd|hnl)$/;
const gdsPattern = /^\s*\d{0,2}\s*\.?\s*([A-Z0-9]{2})\s?(\d{1,4})\s?([A-Z])?\s+(\d{1,2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:\d{2})?)\s+(?:[A-Z1-7]\s+)?\*?([A-Z]{3})\s?([A-Z]{3})\s*(?:[A-Z]{2}\d{1,2}\s+)?(\d{3,4})([APNM])?\s+(\d{3,4})([APNM])?(?:\s*(?:\+|#)(\d))?(?:\s+(\d{1,2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)))?/;

// Only printable characters survive decoding; control characters become spaces.
function entity(code: number) {
  return code >= 32 && code <= 0x10ffff && !(code >= 0x7f && code <= 0x9f) ? String.fromCodePoint(code) : " ";
}

// Google Flights copied from the page glues words together: "1:14 PMMiami International Airport (MIA)",
// "8:10 AM+1Philadelphia", "Departing flightTue, Nov 10", "Lowsvg". These are separated before parsing.
// A glued "AM"/"PM" is only split when no time in the text uses the 24-hour clock (13:00 and later), so a
// 24-hour itinerary with an uppercase name such as "AMSTERDAM" is never misread.
function separateGluedTokens(text: string) {
  const twelveHour = !/(?:^|[^\d])(?:1[3-9]|2[0-3]):[0-5]\d/.test(text);
  let result = text
    .replace(/\b(Departing flight|Departure flight|Outbound flight|Returning flight|Return flight|Vuelo de ida|Vuelo de regreso|Vuelo de salida|Vuelo de vuelta)(?=[A-Za-zÁÉÍÓÚáéíóú0-9])/gi, "$1 ")
    .replace(/(\d{1,2}:[0-5]\d[^\S\n]?(?:[AaPp]\.?[^\S\n]?[Mm]\.?)?[^\S\n]?\+[^\S\n]?\d)(?=[^\s\d])/g, "$1 ");
  if (twelveHour) result = result.replace(/(\d{1,2}:[0-5]\d[^\S\n]?(?:[AP]M|[ap]\.[^\S\n]?m\.))(?=[^\s.,;:)\]])/g, "$1 ");
  return result;
}

export function cleanItineraryText(raw: string) {
  const decoded = raw.slice(0, maxItineraryText)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "\n")
    .replace(/<[^>]{0,2000}>/g, "\n")
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, hex: string) => entity(parseInt(hex, 16))).replace(/&#(\d{1,7});/g, (_, digits: string) => entity(Number(digits)))
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&apos;/gi, "'").replace(/&quot;/gi, "\"").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .normalize("NFKC")
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    // Markdown emphasis from rich-text copies ("**+1**", "__AA 360__").
    .replace(/\*\*|__/g, "");
  return separateGluedTokens(decoded)
    .replace(/\s*[·•|]\s*/g, "\n")
    .replace(/(\([A-Z]{3}\))(?=[^\S\n]*[^\s)])/g, "$1\n")
    .replace(/[^\S\n]+(?=\d{1,2}:\d{2}(?:[^\S\n]?[AaPp]\.?[^\S\n]?[Mm]\.?)?(?:[^\S\n]|$|\+))/gm, "\n")
    .replace(/[^\S\n]+(?=(?:Travel time|Tiempo de viaje|Tiempo de vuelo|Duración|Duration)\b)/gi, "\n")
    .replace(/[^\S\n]+(?=(?:Plane and crew by|Operated by|Operado por|Vuelo operado por)\b)/gi, "\n")
    // Google's amenity bullets, when the copy has no line breaks, would otherwise stick to the flight number.
    .replace(/[^\S\n]+(?:-[^\S\n]+)?(?=(?:Average|Below average|Above average) legroom|Free Wi-Fi|Wi-Fi for a fee|In-seat (?:power|USB)|Power & USB|Stream media|On-demand video|Live TV|Emissions estimate|Contrail warming|Espacio (?:promedio |reducido |amplio )?para las piernas|Wi-Fi gratis|Wi-Fi con cargo|Emisiones estimadas)/g, "\n")
    .replace(/[^\S\n]+(?=(?:Departing flight|Returning flight|Return flight|Vuelo de ida|Vuelo de regreso|Vuelo de salida|Vuelo de vuelta)\b)/gi, "\n")
    .replace(/[^\S\n]+(?=\d{1,2}[^\S\n]?(?:hr|hrs|h|horas?)\b(?:[^\S\n]?\d{1,2}[^\S\n]?min)?[^\S\n]+(?:layover|de escala|escala|conexión))/gi, "\n")
    .replace(/[^\S\n]+(?=(?:Escala|Conexión)[^\S\n]+(?:de|en)\b)/g, "\n")
    .replace(/[^\S\n]*((?:Separate tickets|Boletos separados|Self[- ]transfer)[^\n.]*\.?)[^\S\n]*/gi, "\n$1\n")
    .split("\n")
    // List bullets and an icon name glued to the end of a word ("Lowsvg") are presentation only.
    .map(line => line.trim().replace(/^[-*•]\s+/, "").replace(/(?<=[a-z])svg$/, "").trim())
    .filter(line => line && !/^[a-z]+(?:_[a-z]+)+$/.test(line) && !/^[-–—*•]+$/.test(line));
}

function cabinFrom(text: string) {
  const value = strip(text);
  if (/\b(premium economy|economica premium|turista premium|premium plus)\b/.test(value)) return "Económica Premium";
  if (/\b(basic economy|economica basica|economy basic|light)\b/.test(value) && /\b(economy|economica|light)\b/.test(value)) return "Económica básica";
  if (/\b(economy|economica|turista|coach|main cabin|cabina principal)\b/.test(value)) return "Económica";
  if (/\b(business|ejecutiva|clase ejecutiva|negocios)\b/.test(value)) return "Ejecutiva (Business)";
  if (/^(first|first class|primera|primera clase)$/.test(value.trim())) return "Primera clase";
  return "";
}

const cabinRemoval = /\b(premium economy|economy basic|basic economy|economy|business class|business|first class|clase ejecutiva|ejecutiva|econ[oó]mica premium|econ[oó]mica b[aá]sica|econ[oó]mica|turista premium|turista|main cabin|primera clase)\b/gi;

export function cleanAircraft(text: string) {
  return text.replace(/\(?\b(passenger|pasajeros|freighter)\b\)?/gi, "").replace(/(\d)(MAX|max)\b/g, "$1 MAX").replace(/\bMax\b/g, "MAX").replace(/\s+/g, " ").replace(/^[\s,;:-]+|[\s,;:-]+$/g, "").trim();
}

function cleanOperator(text: string) {
  const value = text.replace(/[.\s]+$/, "").trim();
  const dba = /\bDBA\s+(.+)$/i.exec(value);
  return (dba ? dba[1] : value).replace(/^(?:la aerolinea|la aerolínea)\s+/i, "").slice(0, 120);
}

function titleCase(text: string) {
  if (text !== text.toUpperCase()) return text;
  const small = new Set(["de", "del", "la", "las", "los", "y", "el", "of", "the"]);
  return text.toLowerCase().split(" ").map((word, index) => index && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

type Attributes = { airline?: string; flight?: string; cabin?: string; aircraft?: string; operator?: string };

function attributesOf(line: string): Attributes | null {
  const attributes: Attributes = {};
  let rest = line;
  const operated = operatedPattern.exec(rest);
  if (operated) { attributes.operator = cleanOperator(operated[1]); rest = rest.slice(0, operated.index); }
  const manufacturer = manufacturers.exec(rest);
  if (manufacturer) {
    let tail = rest.slice(manufacturer.index);
    let head = rest.slice(0, manufacturer.index);
    // The flight number may follow the aircraft with or without a space: "Boeing 737AA 1339",
    // "Airbus A321neoAA 3308", "Boeing 737MAX 8 PassengerAA 360". The model right after the
    // manufacturer ("Airbus A321") is never taken as a flight number.
    const flightAtEnd = /(?:\s|(?<=[a-z0-9]))([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4})\s*$/.exec(tail);
    const isModel = flightAtEnd && tail.slice(0, flightAtEnd.index).trim().toLowerCase() === manufacturer[0].toLowerCase();
    if (flightAtEnd && !isModel) { head += ` ${flightAtEnd[0].trim()}`; tail = tail.slice(0, flightAtEnd.index); }
    const cabin = cabinFrom(tail);
    if (cabin) { attributes.cabin = cabin; tail = tail.replace(cabinRemoval, " "); }
    attributes.aircraft = cleanAircraft(tail);
    rest = head;
  }
  const cabin = cabinFrom(rest);
  if (cabin) { attributes.cabin = cabin; rest = rest.replace(cabinRemoval, " "); }
  const flight = /(?:^|\s)([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4})(?=\s|$)/.exec(rest);
  if (flight) { attributes.flight = `${flight[1]} ${flight[2]}`; rest = rest.replace(flight[0], " "); }
  rest = rest.replace(/\s+/g, " ").trim();
  if (rest && /^[\p{L}][\p{L}\s.&'-]{1,59}$/u.test(rest) && !layoverWords.test(strip(rest))) attributes.airline = rest;
  return Object.keys(attributes).length ? attributes : null;
}

function resolveYear(parts: DateParts, lowerBound: string): { date: string; review: boolean; issue?: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  const valid = (year: number) => {
    const date = `${year}-${pad(parts.month)}-${pad(parts.day)}`;
    const value = new Date(`${date}T00:00:00Z`);
    return value.getUTCMonth() + 1 === parts.month ? date : "";
  };
  if (parts.year) {
    const date = valid(parts.year);
    const weekdayMismatch = date && parts.weekday !== undefined && new Date(`${date}T00:00:00Z`).getUTCDay() !== parts.weekday;
    return { date, review: !date || Boolean(parts.ambiguous) || Boolean(weekdayMismatch), ...(weekdayMismatch ? { issue: "El día de la semana no coincide con la fecha." } : {}) };
  }
  const startYear = Number(lowerBound.slice(0, 4));
  const candidates = [startYear, startYear + 1, startYear + 2].map(valid).filter(date => date && date >= lowerBound);
  if (parts.weekday !== undefined) {
    const matching = candidates.slice(0, 2).filter(date => new Date(`${date}T00:00:00Z`).getUTCDay() === parts.weekday);
    if (matching.length === 1) return { date: matching[0], review: false };
    return { date: candidates[0] ?? "", review: true, issue: "No se pudo deducir el año con el día de la semana; confírmelo." };
  }
  return { date: candidates[0] ?? "", review: true, issue: "El texto no indica el año; confírmelo." };
}

// Day offset of the arrival relative to the departure, from the clock times and (when known) the flight
// duration and both airports' time zones. Returns null when more than one reading is possible.
function arrivalOffset(segment: FlightSegment, departureDate: string): number | null {
  const start = clockMinutes(segment.salidaHora);
  const end = clockMinutes(segment.llegadaHora);
  if (start === null || end === null) return null;
  const originZone = airportInfo(segment.origen)?.zona;
  const destinationZone = airportInfo(segment.destino)?.zona;
  let expected: number | null = null;
  if (departureDate && originZone && destinationZone) {
    const from = zoneOffsetMinutes(originZone, departureDate, segment.salidaHora);
    const to = zoneOffsetMinutes(destinationZone, departureDate, segment.salidaHora);
    if (from !== null && to !== null) expected = to - from;
  }
  const options = [-1, 0, 1, 2];
  if (segment.duracionMin !== null) {
    const shift = (offset: number) => end + offset * 1440 - start - (segment.duracionMin ?? 0);
    if (expected !== null) {
      const exact = options.filter(offset => Math.abs(shift(offset) - (expected ?? 0)) <= 5);
      if (exact.length === 1) return exact[0];
    }
    const plausible = options.filter(offset => shift(offset) >= -720 && shift(offset) <= 840);
    return plausible.length === 1 ? plausible[0] : null;
  }
  if (expected !== null) {
    const plausible = options.filter(offset => { const flight = end + offset * 1440 - start - (expected ?? 0); return flight >= 20 && flight <= 20 * 60; });
    if (plausible.length === 1) return plausible[0];
  }
  return null;
}

function flag(segment: FlightSegment, field: string) {
  if (!segment.revisar.includes(field)) segment.revisar.push(field);
}

// Google Flights writes "+1" next to a time that falls on the day after the journey's date (the date in
// "Departing flight Tue, Nov 10"), not after the segment's own departure. Marked times are placed from
// that date; the layover and the flight duration are used to cross-check them.
function assignDates(drafts: Draft[], journeys: JourneyDraft[], reference: string, issues: ItineraryIssue[]) {
  let lowerBound = reference;
  let previous: Draft | null = null;
  const yearNotes = new Set<string>();
  const journeyBase = new Map<number, string>();
  for (const draft of drafts) {
    const segment = draft.segment;
    const fromHeader = !draft.points[0]?.date && (!previous || previous.journey !== draft.journey) ? journeys[draft.journey]?.date ?? null : null;
    const departureParts = draft.points[0]?.date ?? fromHeader;
    const departureMarker = draft.points[0]?.plusDays ?? null;
    const base = journeyBase.get(draft.journey);
    if (departureParts) {
      const resolved = resolveYear(departureParts, lowerBound);
      segment.salidaFecha = resolved.date;
      if (resolved.review) flag(segment, "salidaFecha");
      if (resolved.issue) yearNotes.add(resolved.issue);
      if (fromHeader && resolved.date) journeyBase.set(draft.journey, resolved.date);
    } else if (previous && previous.segment.llegadaFecha && previous.segment.llegadaHora && segment.salidaHora) {
      const arrival = clockMinutes(previous.segment.llegadaHora) ?? 0;
      const departure = clockMinutes(segment.salidaHora) ?? 0;
      const byMarker = base && departureMarker !== null ? addDays(base, departureMarker) : "";
      if (draft.layoverBefore !== null && previous.segment.destino === segment.origen) {
        const total = arrival + draft.layoverBefore;
        segment.salidaFecha = addDays(previous.segment.llegadaFecha, Math.floor(total / 1440));
        if (total % 1440 !== departure) { flag(segment, "salidaFecha"); issues.push({ nivel: "aviso", categoria: "contradictorio", campo: "salidaHora", mensaje: `Vuelo ${segment.vuelo || segment.origen}: la escala indicada no coincide con los horarios.` }); }
        else if (byMarker && byMarker !== segment.salidaFecha) { flag(segment, "salidaFecha"); issues.push({ nivel: "aviso", categoria: "contradictorio", campo: "salidaFecha", mensaje: `Vuelo ${segment.vuelo || segment.origen}: el día indicado (+${departureMarker}) no coincide con la escala.` }); }
      } else if (byMarker) {
        segment.salidaFecha = byMarker;
        if (byMarker < previous.segment.llegadaFecha) flag(segment, "salidaFecha");
      } else {
        segment.salidaFecha = addDays(previous.segment.llegadaFecha, departure >= arrival ? 0 : 1);
        if (!draft.connected) flag(segment, "salidaFecha");
      }
    } else {
      flag(segment, "salidaFecha");
    }
    if (draft.arrivalDate) {
      // An arrival date without a year follows the departure; it is only reviewed when the departure is unknown.
      const resolved = resolveYear(draft.arrivalDate, segment.salidaFecha || lowerBound);
      segment.llegadaFecha = resolved.date;
      if (draft.arrivalDate.year ? resolved.review : !segment.salidaFecha) flag(segment, "llegadaFecha");
    } else if (segment.salidaFecha) {
      const marker = draft.points[1]?.plusDays;
      const computed = arrivalOffset(segment, segment.salidaFecha);
      if (marker !== null && marker !== undefined) {
        // Journey-relative first (Google Flights); segment-relative as the alternative reading. The
        // duration and time zones decide between them when both are possible.
        const journeyDate = journeyBase.get(draft.journey);
        const readings = Array.from(new Set([journeyDate ? addDays(journeyDate, marker) : "", addDays(segment.salidaFecha, marker)])).filter(date => date && date >= segment.salidaFecha);
        const offset = (date: string) => dayDifference(segment.salidaFecha, date);
        const chosen = readings.find(date => computed !== null && offset(date) === computed) ?? readings[0] ?? addDays(segment.salidaFecha, marker);
        segment.llegadaFecha = chosen;
        if (computed !== null ? offset(chosen) !== computed : readings.length > 1) flag(segment, "llegadaFecha");
      } else if (computed !== null) {
        segment.llegadaFecha = addDays(segment.salidaFecha, computed);
      } else {
        const start = clockMinutes(segment.salidaHora);
        const end = clockMinutes(segment.llegadaHora);
        segment.llegadaFecha = start !== null && end !== null ? addDays(segment.salidaFecha, end < start ? 1 : 0) : "";
        flag(segment, "llegadaFecha");
      }
    } else {
      flag(segment, "llegadaFecha");
    }
    if (segment.salidaFecha) lowerBound = segment.salidaFecha;
    previous = draft;
  }
  for (const note of yearNotes) issues.push({ nivel: "aviso", categoria: /no coincide/.test(note) ? "contradictorio" : "confirmar", campo: "salidaFecha", mensaje: note });
}

function labelJourneys(groups: { tipo: JourneyKind | null; segments: FlightSegment[] }[]): FlightJourney[] {
  const explicit = groups.some(group => group.tipo === "ida" || group.tipo === "regreso");
  return groups.map((group, index) => {
    let tipo: JourneyKind = group.tipo ?? "tramo";
    if (!explicit) {
      const first = groups[0].segments[0]?.origen;
      const last = groups.at(-1)?.segments.at(-1)?.destino;
      if (groups.length === 1) tipo = "ida";
      else if (groups.length === 2) tipo = index === 0 ? "ida" : (first && last && first === last) || group.tipo === null ? "regreso" : "tramo";
      else tipo = "tramo";
    }
    return { id: "", tipo, segmentos: group.segments };
  });
}

function fillNames(segment: FlightSegment) {
  for (const side of ["origen", "destino"] as const) {
    const nameKey = side === "origen" ? "origenNombre" : "destinoNombre";
    const known = airportInfo(segment[side]);
    if (known) segment[nameKey] = known.nombre;
    else if (segment[nameKey]) segment[nameKey] = titleCase(segment[nameKey]);
  }
}

function parseGds(lines: string[], options: Required<ParseOptions>, issues: ItineraryIssue[]) {
  const drafts: Draft[] = [];
  for (const line of lines) {
    const match = gdsPattern.exec(line.toUpperCase());
    if (!match) continue;
    const [, carrier, number, bookingClass, dateText, origin, destination, departure, departureSuffix, arrival, arrivalSuffix, plus, arrivalDateText] = match;
    const clock = (value: string, suffix?: string) => {
      const padded = value.padStart(4, "0");
      const hours = Number(padded.slice(0, 2));
      const minutes = Number(padded.slice(2));
      if (suffix === "N") return "12:00";
      if (suffix === "M") return "00:00";
      return toClock(hours, minutes, suffix === "A" || suffix === "P" ? suffix : undefined) ?? "";
    };
    const segment = emptySegment("");
    segment.origen = origin;
    segment.destino = destination;
    segment.salidaHora = clock(departure, departureSuffix);
    segment.llegadaHora = clock(arrival, arrivalSuffix);
    segment.vuelo = `${carrier} ${number}`;
    segment.claseReserva = bookingClass ?? "";
    const knownAirline = airlineName(carrier);
    segment.aerolinea = knownAirline ?? "";
    if (!knownAirline) flag(segment, "aerolinea");
    if (!segment.salidaHora) flag(segment, "salidaHora");
    if (!segment.llegadaHora) flag(segment, "llegadaHora");
    drafts.push({ segment, points: [{ time: segment.salidaHora, plusDays: null, code: origin, name: "", date: parseDateText(dateText) }, { time: segment.llegadaHora, plusDays: plus ? Number(plus) : null, code: destination, name: "", date: null }], arrivalDate: arrivalDateText ? parseDateText(arrivalDateText) : null, layoverBefore: null, connected: false, journey: 0 });
  }
  assignDates(drafts, [], options.referencia, issues);
  // A new journey starts when the next flight leaves from another airport or more than 24 h later.
  const groups: { tipo: JourneyKind | null; segments: FlightSegment[] }[] = [];
  drafts.forEach((draft, index) => {
    const previous = drafts[index - 1]?.segment;
    let split = !previous || previous.destino !== draft.segment.origen;
    if (!split && previous) {
      const days = dayDifference(previous.llegadaFecha, draft.segment.salidaFecha);
      const gap = days === null ? null : days * 1440 + (clockMinutes(draft.segment.salidaHora) ?? 0) - (clockMinutes(previous.llegadaHora) ?? 0);
      split = gap === null || gap > 24 * 60;
    }
    if (split) groups.push({ tipo: null, segments: [] });
    groups[groups.length - 1].segments.push(draft.segment);
  });
  return groups;
}

export function parseItinerary(raw: string, input: ParseOptions = {}): ParseResult {
  const options: Required<ParseOptions> = { referencia: input.referencia && /^\d{4}-\d{2}-\d{2}$/.test(input.referencia) ? input.referencia : new Date().toISOString().slice(0, 10), idPrefix: input.idPrefix ?? "s" };
  const issues: ItineraryIssue[] = [];
  const ignored: string[] = [];
  if (raw.length > maxItineraryText) issues.push({ nivel: "aviso", categoria: "confirmar", mensaje: `El texto se recortó a ${maxItineraryText.toLocaleString("es-HN")} caracteres.` });
  const lines = cleanItineraryText(raw);
  let separate = false;

  const journeys: JourneyDraft[] = [];
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let pendingTime: Omit<Point, "code" | "name"> | null = null;
  let pendingAirport: { code: string; name: string } | null = null;
  let pendingAttributes: Attributes = {};
  let pendingDuration: number | null = null;
  let layoverSeen: number | null | undefined;
  let expectLayoverPlace = false;
  let journeyIndex = -1;

  const ensureJourney = () => { if (journeyIndex < 0) { journeys.push({ tipo: null, date: null }); journeyIndex = 0; } };
  const finish = () => { current = null; };
  const applyAttributes = (target: FlightSegment, attributes: Attributes) => {
    const set = (field: "aerolinea" | "vuelo" | "cabina" | "aeronave" | "operadoPor", value?: string) => {
      if (!value) return;
      if (!target[field]) target[field] = value.slice(0, 120);
      else if (strip(target[field]) !== strip(value) && field !== "aerolinea") flag(target, field);
    };
    set("aerolinea", attributes.airline);
    set("vuelo", attributes.flight);
    set("cabina", attributes.cabin);
    set("aeronave", attributes.aircraft);
    set("operadoPor", attributes.operator);
  };
  const addPoint = (point: Point) => {
    ensureJourney();
    const active = current as Draft | null;
    if (!active || active.points.length >= 2) {
      const segment = emptySegment("");
      segment.origen = point.code;
      segment.origenNombre = point.name;
      segment.salidaHora = point.time;
      const draft: Draft = { segment, points: [point], arrivalDate: null, layoverBefore: layoverSeen ?? null, connected: layoverSeen !== undefined, journey: journeyIndex };
      if (pendingDuration !== null) { segment.duracionMin = pendingDuration; pendingDuration = null; }
      applyAttributes(segment, pendingAttributes);
      pendingAttributes = {};
      drafts.push(draft);
      current = draft;
      layoverSeen = undefined;
    } else {
      active.points.push(point);
      active.segment.destino = point.code;
      active.segment.destinoNombre = point.name;
      active.segment.llegadaHora = point.time;
      if (point.date) active.arrivalDate = point.date;
    }
  };

  for (const line of lines) {
    const lower = strip(line);
    if (separatePattern.test(lower)) { separate = true; continue; }
    const header = headerPattern.exec(lower);
    const hasTime = /\d{1,2}:\d{2}/.test(line);
    if (header && !hasTime && (parseDateText(header[2]) || line.length <= 30)) {
      const tipo: JourneyKind = /^(departing|departure|outbound|vuelo de ida|vuelo de salida|ida|salida)$/.test(header[1]) ? "ida" : "regreso";
      journeys.push({ tipo, date: parseDateText(line) });
      journeyIndex = journeys.length - 1;
      finish(); pendingTime = null; pendingAirport = null; layoverSeen = undefined; expectLayoverPlace = false;
      continue;
    }
    const leg = legPattern.exec(lower);
    if (leg && !hasTime && !/\([A-Z]{3}\)/.test(line)) {
      journeys.push({ tipo: null, date: parseDateText(leg[2]) });
      journeyIndex = journeys.length - 1;
      finish(); pendingTime = null; pendingAirport = null; layoverSeen = undefined; expectLayoverPlace = false;
      continue;
    }
    const arrives = /^(?:arrives|arrival|llega(?: el)?|llegada)\b[\s:]*(.*)$/.exec(lower);
    if (arrives && !hasTime) {
      const date = parseDateText(arrives[1]);
      if (date && current) { (current as Draft).arrivalDate = date; continue; }
    }
    if (/^\+\s?\d$/.test(line)) {
      const active = current as Draft | null;
      if (pendingTime) pendingTime.plusDays = Number(line.replace(/\D/g, ""));
      else if (active?.points[1]) active.points[1].plusDays = Number(line.replace(/\D/g, ""));
      continue;
    }
    const time = timeLine.exec(line);
    if (time) {
      const clock = toClock(Number(time[1]), Number(time[2]), time[3]);
      if (clock) {
        const rest = time[5] ?? "";
        const point = { time: clock, plusDays: time[4] ? Number(time[4]) : null, date: null as DateParts | null };
        const airport = airportPattern.exec(rest);
        if (airport && !currencyCodes.has(airport[2])) {
          addPoint({ ...point, code: airport[2], name: airport[1].replace(/[,\s–—-]+$/, "").trim() });
          pendingTime = null; pendingAirport = null; expectLayoverPlace = false;
        } else if (pendingAirport) {
          addPoint({ ...point, ...pendingAirport });
          pendingAirport = null; pendingTime = null;
        } else {
          pendingTime = point;
          const date = rest ? parseDateText(rest) : null;
          if (date) pendingTime.date = date;
        }
        continue;
      }
    }
    const travel = /^(?:travel time|tiempo de viaje|tiempo de vuelo|duracion(?: del vuelo)?|duration|flight time)\b[\s:]*(.*)$/.exec(lower);
    if (travel) {
      const minutes = parseDurationText(travel[1]);
      const active = current as Draft | null;
      if (minutes !== null) {
        if (active && active.points.length === 1 && active.segment.duracionMin === null) active.segment.duracionMin = minutes;
        else pendingDuration = minutes;
      }
      continue;
    }
    if (layoverWords.test(lower) && (parseDurationText(lower) !== null || /overnight|nocturna/.test(lower))) {
      layoverSeen = parseDurationText(lower);
      if (/change (?:of )?airport|cambio de aeropuerto|cambia de aeropuerto/.test(lower)) issues.push({ nivel: "aviso", categoria: "confirmar", mensaje: "El itinerario incluye un cambio de aeropuerto durante una conexión." });
      finish();
      expectLayoverPlace = !/\([A-Z]{3}\)/.test(line);
      continue;
    }
    if (/change (?:of )?airport|cambio de aeropuerto/.test(lower)) { issues.push({ nivel: "aviso", categoria: "confirmar", mensaje: "El itinerario incluye un cambio de aeropuerto durante una conexión." }); continue; }
    const airport = airportPattern.exec(line);
    if (airport && !currencyCodes.has(airport[2])) {
      if (expectLayoverPlace && !pendingTime) { expectLayoverPlace = false; continue; }
      const name = `${airport[1]} ${airport[3]}`.replace(/[,\s–—-]+$/, "").trim();
      if (pendingTime) {
        addPoint({ ...pendingTime, code: airport[2], name });
        pendingTime = null;
      } else {
        pendingAirport = { code: airport[2], name };
      }
      expectLayoverPlace = false;
      continue;
    }
    if (noisePattern.test(lower) || amenityPattern.test(lower) || pricePattern.test(lower) || /^(overnight|vuelo nocturno|red-eye)$/.test(lower)) continue;
    if (!header && !leg) {
      const date = !hasTime && line.length <= 40 ? parseDateText(line) : null;
      if (date && !/[A-Z]{2}\s?\d{1,4}\b/.test(line.replace(/\d{1,2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|ENE|ABR|AGO|DIC)/g, ""))) {
        ensureJourney();
        const journey = journeys[journeyIndex];
        const active = current as Draft | null;
        if (!active || active.journey !== journeyIndex) { if (!journey.date) journey.date = date; }
        else if (pendingTime) pendingTime.date = date;
        continue;
      }
    }
    if (gdsPattern.test(line.toUpperCase())) continue;
    const attributes = attributesOf(line);
    if (attributes) {
      const active = current as Draft | null;
      // A second flight number while the current flight already has one belongs to the next flight.
      if (active && !(attributes.flight && active.segment.vuelo && active.points.length === 2)) applyAttributes(active.segment, attributes);
      else pendingAttributes = { ...pendingAttributes, ...Object.fromEntries(Object.entries(attributes).filter(([, value]) => value)) };
      continue;
    }
    if (ignored.length < 30) ignored.push(line.slice(0, 160));
  }

  let groups: { tipo: JourneyKind | null; segments: FlightSegment[] }[] = [];
  let formato: ParseResult["formato"] = "google";
  if (drafts.length) {
    assignDates(drafts, journeys, options.referencia, issues);
    const headerless = journeys.every(journey => journey.tipo === null);
    drafts.forEach((draft, index) => {
      const previous = drafts[index - 1];
      // Without headers, consecutive flights belong to the same journey only when a layover links them.
      const split = !previous || previous.journey !== draft.journey || (headerless && !draft.connected);
      if (split) groups.push({ tipo: journeys[draft.journey]?.tipo ?? null, segments: [] });
      groups[groups.length - 1].segments.push(draft.segment);
      if (draft.points.length < 2) {
        flag(draft.segment, "destino"); flag(draft.segment, "llegadaHora");
        issues.push({ nivel: "error", categoria: "faltante", mensaje: `Vuelo desde ${draft.segment.origen}: no se encontró el aeropuerto u hora de llegada.` });
      }
    });
  } else {
    groups = parseGds(lines, options, issues);
    formato = groups.length ? "gds" : "ninguno";
    if (formato === "gds") ignored.length = 0;
  }

  let counter = 0;
  const result = labelJourneys(groups);
  result.forEach((journey, journeyNumber) => {
    journey.id = `${options.idPrefix}j${journeyNumber + 1}`;
    journey.segmentos.forEach(segment => {
      counter += 1;
      segment.id = `${options.idPrefix}${counter}`;
      fillNames(segment);
      const known = segment.vuelo ? airlineName(segment.vuelo.slice(0, 2)) : null;
      if (!segment.aerolinea && known) { segment.aerolinea = known; flag(segment, "aerolinea"); }
      // "American" written next to an AA flight is the short form of the designator's airline.
      else if (known && strip(known).startsWith(`${strip(segment.aerolinea)} `)) segment.aerolinea = known;
      for (const code of [segment.origen, segment.destino]) if (code && !airportInfo(code)) issues.push({ nivel: "info", categoria: "confirmar", mensaje: `${code} no está en la lista de aeropuertos de referencia: se usa el nombre del texto y no se verifica la duración con su zona horaria.` });
    });
  });
  if (!result.length) issues.push({ nivel: "error", categoria: "faltante", mensaje: "No se reconoció ningún vuelo. Revise que el texto incluya horarios y códigos de aeropuerto, por ejemplo (SAP), o ingrese los vuelos manualmente." });
  if (separate) issues.push({ nivel: "aviso", categoria: "confirmar", mensaje: "El texto indica boletos separados: cada boleto tiene sus propias condiciones. Indíquelo en las condiciones de la cotización." });
  const validation = result.length ? validateItinerary(result) : [];
  const seen = new Set<string>();
  const merged = [...issues, ...validation].filter(issue => { const key = `${issue.nivel}|${issue.mensaje}`; if (seen.has(key)) return false; seen.add(key); return true; });
  return { formato, journeys: result, issues: merged, ignoradas: ignored, boletosSeparados: separate };
}
