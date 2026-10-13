import { airportInfo, zoneOffsetMinutes } from "@/lib/flight-reference";

// Structured flight itinerary stored in quotations.detalles. Dates and times are the local clock times
// printed on the ticket (never converted to UTC); time zones are only used to check durations.

export type FlightSegment = {
  id: string;
  origen: string; // IATA code
  origenNombre: string;
  destino: string;
  destinoNombre: string;
  salidaFecha: string; // YYYY-MM-DD, local to the origin; "" when unknown
  salidaHora: string; // HH:MM 24 h, local to the origin
  llegadaFecha: string; // YYYY-MM-DD, local to the destination
  llegadaHora: string;
  aerolinea: string;
  vuelo: string; // "AM 675"
  operadoPor: string;
  aeronave: string;
  cabina: string;
  claseReserva: string;
  duracionMin: number | null;
  // Fields the parser could not settle; the advisor clears each one by confirming or editing it.
  revisar: string[];
};

export type JourneyKind = "ida" | "regreso" | "tramo";
export type FlightJourney = { id: string; tipo: JourneyKind; segmentos: FlightSegment[] };

export type ItineraryIssue = { nivel: "error" | "aviso" | "info"; mensaje: string; tramo?: number; segmento?: number; campo?: string };

export const segmentFieldLabels: Record<string, string> = {
  origen: "origen", destino: "destino", salidaFecha: "fecha de salida", salidaHora: "hora de salida", llegadaFecha: "fecha de llegada",
  llegadaHora: "hora de llegada", aerolinea: "aerolínea", vuelo: "número de vuelo", operadoPor: "operador", aeronave: "aeronave",
  cabina: "cabina", claseReserva: "clase de reserva", duracionMin: "duración",
};

export const iataPattern = /^[A-Z]{3}$/;
export const flightNumberPattern = /^(?=[A-Z0-9]{2}\s?\d)(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{1,4}[A-Z]?$/;
export const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptySegment(id: string): FlightSegment {
  return { id, origen: "", origenNombre: "", destino: "", destinoNombre: "", salidaFecha: "", salidaHora: "", llegadaFecha: "", llegadaHora: "", aerolinea: "", vuelo: "", operadoPor: "", aeronave: "", cabina: "", claseReserva: "", duracionMin: null, revisar: [] };
}

export function journeyTitle(journey: FlightJourney, index: number) {
  return journey.tipo === "ida" ? "Vuelo de ida" : journey.tipo === "regreso" ? "Vuelo de regreso" : `Tramo ${index + 1}`;
}

export function clockMinutes(time: string) {
  const match = timePattern.exec(time);
  return match ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;
}

export function addDays(date: string, days: number) {
  if (!datePattern.test(date)) return "";
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dayDifference(from: string, to: string) {
  if (!datePattern.test(from) || !datePattern.test(to)) return null;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

// Minutes since the epoch on the local clock (no zone): only comparable between times at the same place.
function localMinutes(date: string, time: string) {
  const clock = clockMinutes(time);
  if (!datePattern.test(date) || clock === null) return null;
  return Date.parse(`${date}T00:00:00Z`) / 60000 + clock;
}

// Real elapsed minutes since the epoch, when the airport's zone is known.
export function absoluteMinutes(code: string, date: string, time: string) {
  const local = localMinutes(date, time);
  const zone = airportInfo(code)?.zona;
  if (local === null || !zone) return null;
  const offset = zoneOffsetMinutes(zone, date, time);
  return offset === null ? null : local - offset;
}

export function computedDuration(segment: FlightSegment) {
  const start = absoluteMinutes(segment.origen, segment.salidaFecha, segment.salidaHora);
  const end = absoluteMinutes(segment.destino, segment.llegadaFecha, segment.llegadaHora);
  return start === null || end === null ? null : end - start;
}

export function segmentDuration(segment: FlightSegment) {
  return segment.duracionMin ?? computedDuration(segment);
}

export function layoverMinutes(previous: FlightSegment, next: FlightSegment) {
  if (previous.destino && previous.destino === next.origen) {
    const arrival = localMinutes(previous.llegadaFecha, previous.llegadaHora);
    const departure = localMinutes(next.salidaFecha, next.salidaHora);
    if (arrival !== null && departure !== null) return departure - arrival;
  }
  const arrival = absoluteMinutes(previous.destino, previous.llegadaFecha, previous.llegadaHora);
  const departure = absoluteMinutes(next.origen, next.salidaFecha, next.salidaHora);
  return arrival === null || departure === null ? null : departure - arrival;
}

export function journeyDuration(journey: FlightJourney) {
  const segments = journey.segmentos;
  if (!segments.length) return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const start = absoluteMinutes(first.origen, first.salidaFecha, first.salidaHora);
  const end = absoluteMinutes(last.destino, last.llegadaFecha, last.llegadaHora);
  if (start !== null && end !== null) return end - start;
  let total = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const flight = segmentDuration(segments[index]);
    if (flight === null) return null;
    total += flight;
    if (index > 0) {
      const wait = layoverMinutes(segments[index - 1], segments[index]);
      if (wait === null) return null;
      total += wait;
    }
  }
  return total;
}

export function formatDuration(minutes: number | null) {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${String(rest).padStart(2, "0")} min` : ""}` : `${rest} min`;
}

export function cityName(code: string, fallback = "") {
  return airportInfo(code)?.ciudad ?? fallback;
}

export function airportName(code: string, written: string) {
  return airportInfo(code)?.nombre ?? written;
}

export function journeyRoute(journey: FlightJourney) {
  const codes = journey.segmentos.flatMap((segment, index) => index === 0 ? [segment.origen, segment.destino] : segment.origen === journey.segmentos[index - 1].destino ? [segment.destino] : [segment.origen, segment.destino]);
  return codes.filter(Boolean).join(" – ");
}

export function journeyAirlines(journey: FlightJourney) {
  return Array.from(new Set(journey.segmentos.map(segment => segment.aerolinea.trim()).filter(Boolean)));
}

export function itineraryType(journeys: FlightJourney[]) {
  const usable = journeys.filter(journey => journey.segmentos.length);
  if (!usable.length) return "";
  if (usable.length === 1) return "Solo ida";
  const first = usable[0].segmentos[0].origen;
  const last = usable[usable.length - 1].segmentos.at(-1)?.destino;
  if (usable.length === 2) return first === last ? "Ida y vuelta" : "Ida y vuelta con regreso desde otra ciudad";
  return "Multidestino";
}

export function validateItinerary(journeys: FlightJourney[]): ItineraryIssue[] {
  const issues: ItineraryIssue[] = [];
  if (!journeys.some(journey => journey.segmentos.length)) return [{ nivel: "error", mensaje: "Agregue al menos un vuelo al itinerario." }];
  let previousEnd: { segment: FlightSegment; tramo: number } | null = null;
  journeys.forEach((journey, tramo) => {
    if (!journey.segmentos.length) issues.push({ nivel: "aviso", tramo, mensaje: `${journeyTitle(journey, tramo)} no tiene vuelos.` });
    journey.segmentos.forEach((segment, index) => {
      const where = { tramo, segmento: index };
      const name = `${journeyTitle(journey, tramo)}, vuelo ${index + 1}`;
      if (!iataPattern.test(segment.origen)) issues.push({ ...where, campo: "origen", nivel: "error", mensaje: `${name}: el origen debe ser un código IATA de 3 letras.` });
      if (!iataPattern.test(segment.destino)) issues.push({ ...where, campo: "destino", nivel: "error", mensaje: `${name}: el destino debe ser un código IATA de 3 letras.` });
      if (segment.origen && segment.origen === segment.destino) issues.push({ ...where, campo: "destino", nivel: "error", mensaje: `${name}: el origen y el destino son el mismo aeropuerto.` });
      if (!datePattern.test(segment.salidaFecha)) issues.push({ ...where, campo: "salidaFecha", nivel: "error", mensaje: `${name}: falta la fecha de salida.` });
      if (!timePattern.test(segment.salidaHora)) issues.push({ ...where, campo: "salidaHora", nivel: "error", mensaje: `${name}: falta la hora de salida.` });
      if (!datePattern.test(segment.llegadaFecha)) issues.push({ ...where, campo: "llegadaFecha", nivel: "error", mensaje: `${name}: falta la fecha de llegada.` });
      if (!timePattern.test(segment.llegadaHora)) issues.push({ ...where, campo: "llegadaHora", nivel: "error", mensaje: `${name}: falta la hora de llegada.` });
      if (!segment.vuelo.trim()) issues.push({ ...where, campo: "vuelo", nivel: "aviso", mensaje: `${name}: falta el número de vuelo.` });
      else if (!flightNumberPattern.test(segment.vuelo.trim().toUpperCase())) issues.push({ ...where, campo: "vuelo", nivel: "aviso", mensaje: `${name}: revise el número de vuelo (${segment.vuelo}).` });
      if (!segment.aerolinea.trim()) issues.push({ ...where, campo: "aerolinea", nivel: "aviso", mensaje: `${name}: falta la aerolínea.` });
      const days = dayDifference(segment.salidaFecha, segment.llegadaFecha);
      if (days !== null && (days < -1 || days > 2)) issues.push({ ...where, campo: "llegadaFecha", nivel: "error", mensaje: `${name}: la fecha de llegada no es coherente con la salida.` });
      const computed = computedDuration(segment);
      if (computed !== null && computed <= 0) issues.push({ ...where, campo: "llegadaHora", nivel: "error", mensaje: `${name}: la llegada queda antes de la salida.` });
      else if (computed !== null && segment.duracionMin !== null && Math.abs(computed - segment.duracionMin) > 5) issues.push({ ...where, campo: "duracionMin", nivel: "aviso", mensaje: `${name}: la duración indicada (${formatDuration(segment.duracionMin)}) no coincide con los horarios (${formatDuration(computed)}). Revise fechas y horas.` });
      else if (computed === null && days !== null && days === 0 && segment.origen && airportInfo(segment.origen)?.zona && airportInfo(segment.origen)?.zona === airportInfo(segment.destino)?.zona) {
        const start = clockMinutes(segment.salidaHora);
        const end = clockMinutes(segment.llegadaHora);
        if (start !== null && end !== null && end <= start) issues.push({ ...where, campo: "llegadaFecha", nivel: "error", mensaje: `${name}: la llegada queda antes de la salida; revise si llega al día siguiente.` });
      }
      if (segment.revisar.length) issues.push({ ...where, nivel: "aviso", mensaje: `${name}: confirme ${segment.revisar.map(field => segmentFieldLabels[field] ?? field).join(", ")}.` });
      if (index > 0) {
        const previous = journey.segmentos[index - 1];
        if (previous.destino && segment.origen && previous.destino !== segment.origen) issues.push({ ...where, campo: "origen", nivel: "aviso", mensaje: `${name}: la conexión cambia de aeropuerto (${previous.destino} a ${segment.origen}). Confirme el traslado entre aeropuertos.` });
        const wait = layoverMinutes(previous, segment);
        if (wait !== null && wait <= 0) issues.push({ ...where, campo: "salidaHora", nivel: "error", mensaje: `${name}: sale antes de que llegue el vuelo anterior.` });
        else if (wait !== null && wait > 24 * 60) issues.push({ ...where, nivel: "aviso", mensaje: `${name}: la conexión dura más de 24 horas (${formatDuration(wait)}). Confirme que es correcto.` });
      }
    });
    const first = journey.segmentos[0];
    if (previousEnd && first) {
      const wait = layoverMinutes(previousEnd.segment, first);
      if (wait !== null && wait <= 0) issues.push({ tramo, segmento: 0, campo: "salidaFecha", nivel: "error", mensaje: `${journeyTitle(journey, tramo)} sale antes de terminar el tramo anterior.` });
      else if (wait === null) {
        const days = dayDifference(previousEnd.segment.llegadaFecha, first.salidaFecha);
        if (days !== null && days < 0) issues.push({ tramo, segmento: 0, campo: "salidaFecha", nivel: "error", mensaje: `${journeyTitle(journey, tramo)} sale antes de terminar el tramo anterior.` });
      }
      if (journey.tipo === "regreso" && previousEnd.segment.destino && first.origen !== previousEnd.segment.destino) issues.push({ tramo, segmento: 0, nivel: "info", mensaje: `El regreso sale de ${first.origen} y la ida llega a ${previousEnd.segment.destino} (itinerario con regreso desde otra ciudad).` });
    }
    const last = journey.segmentos.at(-1);
    if (last) previousEnd = { segment: last, tramo };
  });
  return issues;
}
