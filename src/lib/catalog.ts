import { emptyBaggage, emptyFare, newId, photoPathPattern, sanitizeBaggage, sanitizeInclusions, type BaggageAllowance, type FareRules, type HotelPhoto, type HotelStay, type Inclusion, type Refundability, type TaxState } from "@/lib/quotation-details";

// Admin-only reusable catalogs (V6, docs/sql/quotations_v6.sql): hotels, airlines and airline fare
// presets. A catalog record is master data the advisor starts from; a quotation always stores its own copy
// (snapshot), so editing or deactivating a record never changes a quotation that was already prepared or
// sent. Defaults are suggestions: nothing is treated as included or confirmed until the advisor confirms
// it in the quotation. No prices live here.

export type CatalogRoom = { id: string; categoria: string; camas: string; capacidad: string; descripcion: string };

export type HotelCatalogEntry = {
  id: string; nombre: string; cadena: string; pais: string; ciudad: string; destino: string; direccion: string; ubicacion: string;
  telefono: string; email: string; sitioWeb: string; descripcion: string; estrellas: number | null;
  fotos: HotelPhoto[]; amenidades: string[]; habitaciones: CatalogRoom[]; planes: string[]; inclusiones: Inclusion[];
  checkIn: string; checkOut: string; politicas: string; cancelacion: string; impuestos: TaxState; cargoResort: string;
  referenciaProveedor: string; notasInternas: string; activo: boolean; updatedAt: string;
};

export type FareBaggage = Omit<BaggageAllowance, "id" | "alcance">;
export type FarePreset = {
  id: string; airlineId: string; nombre: string; cabina: string; tipoTarifa: string; aplicaA: string; equipaje: FareBaggage;
  cambios: string; cancelacion: string; reembolso: Refundability; asientos: string; restricciones: string; otrasInclusiones: string;
  fuente: string; verificadoEn: string; activo: boolean; updatedAt: string;
};
export type AirlineEntry = { id: string; nombre: string; iata: string; icao: string; pais: string; operadora: string; notasInternas: string; activo: boolean; updatedAt: string; presets: FarePreset[] };

// Facilities a hotel may advertise (descriptive only, never printed as "included").
export const hotelAmenitySuggestions = ["Piscina", "Playa", "Wi-Fi", "Estacionamiento", "Gimnasio", "Spa", "Club infantil", "Actividades", "Restaurante", "Bar", "Servicio a la habitación", "Accesible para sillas de ruedas"];
// Entries offered for the Incluido / No incluido / Con cargo defaults (owner's list, 2026-10-14).
export const hotelCatalogInclusionSuggestions = ["Desayuno", "Almuerzo", "Cena", "Todo incluido", "Bebidas", "Piscina", "Playa", "Wi-Fi", "Estacionamiento", "Gimnasio", "Spa", "Club infantil", "Actividades", "Traslados", "Impuestos", "Propinas"];

type Source = Record<string, unknown>;
const record = (value: unknown): Source => (value && typeof value === "object" && !Array.isArray(value) ? value as Source : {});
const list = (value: unknown, max: number) => (Array.isArray(value) ? value.slice(0, max) : []);
const text = (value: unknown, max: number, multiline = false) => String(typeof value === "string" || typeof value === "number" ? value : "")
  .replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, multiline ? "" : " ")
  .trim().slice(0, max);
const choice = <T extends string>(value: unknown, options: readonly T[]): T => (options.includes(value as T) ? value as T : "" as T);
const uuid = (value: unknown) => { const result = text(value, 36).toLowerCase(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result) ? result : ""; };
const localId = (value: unknown) => { const result = text(value, 40); return /^[A-Za-z0-9_-]{1,40}$/.test(result) ? result : newId(); };
const clock = (value: unknown) => { const result = text(value, 5); return /^([01]\d|2[0-3]):[0-5]\d$/.test(result) ? result : ""; };
const isoDate = (value: unknown) => { const result = text(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(result) && !Number.isNaN(Date.parse(`${result}T00:00:00Z`)) ? result : ""; };
const words = (value: unknown, max: number, each: number) => Array.from(new Set(list(value, max).map(item => text(item, each)).filter(Boolean)));
const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ----- hotels -----

export function emptyHotelEntry(): HotelCatalogEntry {
  return { id: "", nombre: "", cadena: "", pais: "", ciudad: "", destino: "", direccion: "", ubicacion: "", telefono: "", email: "", sitioWeb: "", descripcion: "", estrellas: null, fotos: [], amenidades: [], habitaciones: [], planes: [], inclusiones: [], checkIn: "", checkOut: "", politicas: "", cancelacion: "", impuestos: "", cargoResort: "", referenciaProveedor: "", notasInternas: "", activo: true, updatedAt: "" };
}

export function sanitizeHotelEntry(value: unknown): HotelCatalogEntry {
  const source = record(value);
  const stars = Number(source.estrellas);
  const email = text(source.email, 254).toLowerCase();
  const site = text(source.sitioWeb, 300);
  return {
    id: uuid(source.id), nombre: text(source.nombre, 160), cadena: text(source.cadena, 120), pais: text(source.pais, 80), ciudad: text(source.ciudad, 120),
    destino: text(source.destino, 160), direccion: text(source.direccion, 300), ubicacion: text(source.ubicacion, 500, true), telefono: text(source.telefono, 60),
    email: emailPattern.test(email) ? email : "", sitioWeb: /^https:\/\/[^\s]+$/i.test(site) ? site : "", descripcion: text(source.descripcion, 2000, true),
    estrellas: Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : null,
    fotos: list(source.fotos, 12).map(item => { const photo = record(item); return { path: text(photo.path, 80), leyenda: text(photo.leyenda, 140), ancho: Math.max(0, Math.min(20000, Math.trunc(Number(photo.ancho) || 0))), alto: Math.max(0, Math.min(20000, Math.trunc(Number(photo.alto) || 0))) }; }).filter(photo => photoPathPattern.test(photo.path)),
    amenidades: words(source.amenidades, 40, 80),
    habitaciones: list(source.habitaciones, 30).map(item => { const room = record(item); return { id: localId(room.id), categoria: text(room.categoria, 120), camas: text(room.camas, 120), capacidad: text(room.capacidad, 80), descripcion: text(room.descripcion, 400) }; }).filter(room => room.categoria),
    planes: words(source.planes, 10, 80),
    inclusiones: sanitizeInclusions(source.inclusiones, 40),
    checkIn: clock(source.checkIn), checkOut: clock(source.checkOut), politicas: text(source.politicas, 1500, true), cancelacion: text(source.cancelacion, 1000, true),
    impuestos: choice<TaxState>(source.impuestos, ["incluidos", "no_incluidos", "parcial"]), cargoResort: text(source.cargoResort, 300),
    referenciaProveedor: text(source.referenciaProveedor, 160), notasInternas: text(source.notasInternas, 3000, true),
    activo: source.activo !== false, updatedAt: text(source.updatedAt, 40),
  };
}

export function hotelEntryErrors(entry: HotelCatalogEntry) {
  const errors: string[] = [];
  if (!entry.nombre) errors.push("Indique el nombre del hotel.");
  if (!entry.ciudad && !entry.destino) errors.push("Indique la ciudad o el destino del hotel.");
  return errors;
}

// Database row (snake_case, docs/sql/quotations_v6.sql) <-> entry.
export function hotelEntryFromRow(row: Record<string, unknown>): HotelCatalogEntry {
  return sanitizeHotelEntry({
    id: row.id, nombre: row.nombre, cadena: row.cadena, pais: row.pais, ciudad: row.ciudad, destino: row.destino, direccion: row.direccion, ubicacion: row.ubicacion,
    telefono: row.telefono, email: row.email, sitioWeb: row.sitio_web, descripcion: row.descripcion, estrellas: row.estrellas, fotos: row.fotos, amenidades: row.amenidades,
    habitaciones: row.habitaciones, planes: row.planes, inclusiones: row.inclusiones, checkIn: typeof row.check_in === "string" ? row.check_in.slice(0, 5) : "", checkOut: typeof row.check_out === "string" ? row.check_out.slice(0, 5) : "",
    politicas: row.politicas, cancelacion: row.cancelacion, impuestos: row.impuestos ?? "", cargoResort: row.cargo_resort, referenciaProveedor: row.referencia_proveedor,
    notasInternas: row.notas_internas, activo: row.activo, updatedAt: row.updated_at,
  });
}

export function hotelEntryToRow(entry: HotelCatalogEntry) {
  return {
    nombre: entry.nombre, cadena: entry.cadena || null, pais: entry.pais || null, ciudad: entry.ciudad || null, destino: entry.destino || null, direccion: entry.direccion || null,
    ubicacion: entry.ubicacion || null, telefono: entry.telefono || null, email: entry.email || null, sitio_web: entry.sitioWeb || null, descripcion: entry.descripcion || null,
    estrellas: entry.estrellas, fotos: entry.fotos, amenidades: entry.amenidades, habitaciones: entry.habitaciones, planes: entry.planes, inclusiones: entry.inclusiones,
    check_in: entry.checkIn || null, check_out: entry.checkOut || null, politicas: entry.politicas || null, cancelacion: entry.cancelacion || null, impuestos: entry.impuestos || null,
    cargo_resort: entry.cargoResort || null, referencia_proveedor: entry.referenciaProveedor || null, notas_internas: entry.notasInternas || null, activo: entry.activo,
  };
}

// The hotel's location as the quotation shows it.
export function hotelPlace(entry: Pick<HotelCatalogEntry, "destino" | "ciudad" | "pais">) {
  return entry.destino || [entry.ciudad, entry.pais].filter(Boolean).join(", ");
}

// Check-in/out times and general policies, as one paragraph for HotelStay.condiciones.
export function hotelPolicyText(entry: Pick<HotelCatalogEntry, "checkIn" | "checkOut" | "politicas">) {
  return [entry.checkIn ? `Entrada a partir de las ${entry.checkIn}.` : "", entry.checkOut ? `Salida hasta las ${entry.checkOut}.` : "", entry.politicas].filter(Boolean).join(" ");
}

// Fills a quotation's hotel from a catalog record. Only reusable data is copied: dates, rooms, occupancy
// and price are the advisor's. Inclusions keep their default state but must be confirmed again; the
// facilities list is not copied, so a facility is never printed as included.
export function applyCatalogHotel(stay: HotelStay, entry: HotelCatalogEntry): HotelStay {
  return {
    ...stay,
    catalogoId: entry.id,
    nombre: entry.nombre,
    destino: hotelPlace(entry) || stay.destino,
    direccion: entry.direccion || stay.direccion,
    planComidas: entry.planes.length === 1 ? entry.planes[0] : stay.planComidas,
    inclusiones: entry.inclusiones.map(item => ({ ...item, id: newId() })),
    inclusionesConfirmadas: false,
    impuestos: entry.impuestos || stay.impuestos,
    cargoResort: entry.cargoResort || stay.cargoResort,
    cancelacion: entry.cancelacion || stay.cancelacion,
    condiciones: hotelPolicyText(entry) || stay.condiciones,
    fotos: entry.fotos.map(photo => ({ ...photo })),
  };
}

// The reverse: a catalog record proposed from a hotel typed in a quotation ("Guardar en el catálogo").
export function catalogEntryFromStay(stay: HotelStay): HotelCatalogEntry {
  const rooms = new Map<string, CatalogRoom>();
  for (const room of stay.habitaciones) if (room.categoria && !rooms.has(fold(room.categoria))) rooms.set(fold(room.categoria), { id: newId(), categoria: room.categoria, camas: room.camas, capacidad: "", descripcion: "" });
  return {
    ...emptyHotelEntry(), nombre: stay.nombre, destino: stay.destino, direccion: stay.direccion, fotos: stay.fotos.map(photo => ({ ...photo })),
    habitaciones: Array.from(rooms.values()), planes: stay.planComidas ? [stay.planComidas] : [], inclusiones: stay.inclusiones.map(item => ({ ...item, id: newId() })),
    politicas: stay.condiciones, cancelacion: stay.cancelacion, impuestos: stay.impuestos, cargoResort: stay.cargoResort,
  };
}

// ----- airlines and fare presets -----

const pieceStates = ["incluido", "no_incluido", "con_cargo"] as const;

export function emptyAirlineEntry(): AirlineEntry {
  return { id: "", nombre: "", iata: "", icao: "", pais: "", operadora: "", notasInternas: "", activo: true, updatedAt: "", presets: [] };
}

export function emptyPreset(airlineId = ""): FarePreset {
  const bag = emptyBaggage("");
  return { id: "", airlineId, nombre: "", cabina: "", tipoTarifa: "", aplicaA: "", equipaje: { personal: bag.personal, mano: bag.mano, documentado: bag.documentado, adicional: "", notas: "" }, cambios: "", cancelacion: "", reembolso: "", asientos: "", restricciones: "", otrasInclusiones: "", fuente: "", verificadoEn: "", activo: true, updatedAt: "" };
}

export function sanitizeAirlineEntry(value: unknown): AirlineEntry {
  const source = record(value);
  // Validated whole, never truncated: "AAA" must not silently become "AA" (another airline).
  const iata = text(source.iata, 10).toUpperCase();
  const icao = text(source.icao, 10).toUpperCase();
  return {
    id: uuid(source.id), nombre: text(source.nombre, 120), iata: /^[A-Z0-9]{2}$/.test(iata) ? iata : "", icao: /^[A-Z]{3}$/.test(icao) ? icao : "",
    pais: text(source.pais, 80), operadora: text(source.operadora, 600, true), notasInternas: text(source.notasInternas, 3000, true), activo: source.activo !== false, updatedAt: text(source.updatedAt, 40),
    presets: list(source.presets, 40).map(sanitizePreset),
  };
}

export function airlineEntryErrors(entry: AirlineEntry, raw: Record<string, unknown> = {}) {
  const errors: string[] = [];
  if (!entry.nombre) errors.push("Indique el nombre de la aerolínea.");
  if (text(raw.iata, 10) && !entry.iata) errors.push("El código IATA tiene dos letras o números, por ejemplo AA o 5U.");
  if (text(raw.icao, 10) && !entry.icao) errors.push("El código OACI tiene tres letras, por ejemplo AAL.");
  return errors;
}

export function sanitizePreset(value: unknown): FarePreset {
  const source = record(value);
  const bag = sanitizeBaggage({ ...record(source.equipaje), id: "x" });
  return {
    id: uuid(source.id), airlineId: uuid(source.airlineId), nombre: text(source.nombre, 120), cabina: text(source.cabina, 60), tipoTarifa: text(source.tipoTarifa, 80), aplicaA: text(source.aplicaA, 300),
    equipaje: { personal: bag.personal, mano: bag.mano, documentado: bag.documentado, adicional: bag.adicional, notas: bag.notas },
    cambios: text(source.cambios, 400, true), cancelacion: text(source.cancelacion, 400, true), reembolso: choice<Refundability>(source.reembolso, ["reembolsable", "no_reembolsable", "parcial"]),
    asientos: text(source.asientos, 300), restricciones: text(source.restricciones, 600, true), otrasInclusiones: text(source.otrasInclusiones, 600, true),
    fuente: text(source.fuente, 300), verificadoEn: isoDate(source.verificadoEn), activo: source.activo !== false, updatedAt: text(source.updatedAt, 40),
  };
}

export function presetErrors(preset: FarePreset) {
  const errors: string[] = [];
  if (!preset.nombre) errors.push("Indique el nombre de la tarifa, por ejemplo Main Cabin.");
  if (!preset.airlineId) errors.push("La tarifa debe pertenecer a una aerolínea.");
  for (const key of ["personal", "mano", "documentado"] as const) if (preset.equipaje[key].estado && !pieceStates.includes(preset.equipaje[key].estado as typeof pieceStates[number])) errors.push("Estado de equipaje inválido.");
  return errors;
}

export function airlineEntryFromRow(row: Record<string, unknown>, presets: Record<string, unknown>[] = []): AirlineEntry {
  return sanitizeAirlineEntry({ id: row.id, nombre: row.nombre, iata: row.iata ?? "", icao: row.icao ?? "", pais: row.pais, operadora: row.operadora, notasInternas: row.notas_internas, activo: row.activo, updatedAt: row.updated_at, presets: presets.map(presetFromRow) });
}

export function airlineEntryToRow(entry: AirlineEntry) {
  return { nombre: entry.nombre, iata: entry.iata || null, icao: entry.icao || null, pais: entry.pais || null, operadora: entry.operadora || null, notas_internas: entry.notasInternas || null, activo: entry.activo };
}

export function presetFromRow(row: Record<string, unknown>) {
  return { id: row.id, airlineId: row.airline_id, nombre: row.nombre, cabina: row.cabina, tipoTarifa: row.tipo_tarifa, aplicaA: row.aplica_a, equipaje: row.equipaje, cambios: row.cambios, cancelacion: row.cancelacion, reembolso: row.reembolso ?? "", asientos: row.asientos, restricciones: row.restricciones, otrasInclusiones: row.otras_inclusiones, fuente: row.fuente, verificadoEn: row.verificado_en ?? "", activo: row.activo, updatedAt: row.updated_at };
}

export function presetToRow(preset: FarePreset) {
  return {
    airline_id: preset.airlineId, nombre: preset.nombre, cabina: preset.cabina || null, tipo_tarifa: preset.tipoTarifa || null, aplica_a: preset.aplicaA || null, equipaje: preset.equipaje,
    cambios: preset.cambios || null, cancelacion: preset.cancelacion || null, reembolso: preset.reembolso || null, asientos: preset.asientos || null, restricciones: preset.restricciones || null,
    otras_inclusiones: preset.otrasInclusiones || null, fuente: preset.fuente || null, verificado_en: preset.verificadoEn || null, activo: preset.activo,
  };
}

// A fare preset applied to one fare of a quotation: a copy the advisor reviews and edits. The baggage is
// returned separately and the caller leaves "equipaje confirmado" unchecked, so it must be confirmed.
export function applyPreset(fare: FareRules, preset: FarePreset, airline: Pick<AirlineEntry, "nombre">): { fare: FareRules; baggage: Omit<BaggageAllowance, "id" | "alcance"> } {
  const restrictions = [preset.restricciones, preset.otrasInclusiones].filter(Boolean).join("\n");
  return {
    fare: { ...(fare ?? emptyFare()), aerolinea: airline.nombre, cabina: preset.cabina || fare.cabina, tipoTarifa: preset.tipoTarifa || preset.nombre, cambios: preset.cambios, cancelacion: preset.cancelacion, reembolso: preset.reembolso, asientos: preset.asientos, restricciones: restrictions.slice(0, 600), plantilla: `${airline.nombre} · ${preset.nombre}`.slice(0, 120), plantillaId: preset.id },
    baggage: { personal: { ...preset.equipaje.personal }, mano: { ...preset.equipaje.mano }, documentado: { ...preset.equipaje.documentado }, adicional: preset.equipaje.adicional, notas: preset.equipaje.notas },
  };
}

// What the quotation editor receives: internal notes and supplier references stay on the server (they
// are never copied into a quotation, so the browser does not need them).
export function hotelForEditor(entry: HotelCatalogEntry): HotelCatalogEntry {
  return { ...entry, notasInternas: "", referenciaProveedor: "" };
}

export function airlineForEditor(entry: AirlineEntry): AirlineEntry {
  return { ...entry, notasInternas: "", presets: entry.presets.map(preset => ({ ...preset, fuente: "" })) };
}

// ----- search -----

export function searchText(...values: (string | null | undefined)[]) {
  return fold(values.filter(Boolean).join(" "));
}

// Every word of the query must appear (accents and case ignored).
export function matchesQuery(haystack: string, query: string) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  return terms.every(term => haystack.includes(term));
}

// Missing tables (docs/sql/quotations_v6.sql not run yet): PostgREST PGRST205/PGRST200, Postgres 42P01.
export function isMissingTable(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.code === "42P01" || error?.code === "PGRST200";
}
