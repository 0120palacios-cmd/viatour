import { newId, sanitizeInclusions, type FerryDetails, type GeneralService, type Inclusion, type ServiceMode } from "@/lib/quotation-details";
import { matchesQuery, searchText } from "@/lib/catalog";

// Admin-only catalog of reusable services (V7, docs/sql/service_catalog_v7.sql): shipping lines (ferry) and
// transfers, tours, activities, insurance, travel assistance and other services. Same rules as the hotel
// catalog: master data only, no prices or availability; a quotation copies what it uses, so editing or
// deactivating a record never changes a quotation already prepared or sent; inclusions arrive unconfirmed.

export const serviceCatalogKinds = ["ferry", "traslado", "tour", "actividad", "seguro", "asistencia", "otro"] as const;
export type ServiceCatalogKind = (typeof serviceCatalogKinds)[number];
export const serviceCatalogLabels: Record<ServiceCatalogKind, string> = { ferry: "Naviera (ferry)", traslado: "Traslado", tour: "Tour o excursión", actividad: "Actividad", seguro: "Seguro de viaje", asistencia: "Asistencia al viajero", otro: "Otro servicio" };

export type ServiceCatalogEntry = {
  id: string; tipo: ServiceCatalogKind; nombre: string; operador: string; destino: string; descripcion: string; lugar: string; duracion: string;
  modalidad: ServiceMode; inclusiones: Inclusion[]; cancelacion: string;
  // Shipping-line conditions (tipo "ferry" only).
  cambios: string; equipajeIncluido: string; equipajeAdicional: string; embarque: string; documentos: string;
  notasInternas: string; activo: boolean; updatedAt: string;
};

type Source = Record<string, unknown>;
const record = (value: unknown): Source => (value && typeof value === "object" && !Array.isArray(value) ? value as Source : {});
const text = (value: unknown, max: number, multiline = false) => String(typeof value === "string" || typeof value === "number" ? value : "")
  .replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, multiline ? "" : " ")
  .trim().slice(0, max);
const uuid = (value: unknown) => { const result = text(value, 36).toLowerCase(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result) ? result : ""; };

export function isServiceCatalogKind(value: unknown): value is ServiceCatalogKind {
  return serviceCatalogKinds.includes(value as ServiceCatalogKind);
}

export function emptyServiceEntry(tipo: ServiceCatalogKind = "tour"): ServiceCatalogEntry {
  return { id: "", tipo, nombre: "", operador: "", destino: "", descripcion: "", lugar: "", duracion: "", modalidad: "", inclusiones: [], cancelacion: "", cambios: "", equipajeIncluido: "", equipajeAdicional: "", embarque: "", documentos: "", notasInternas: "", activo: true, updatedAt: "" };
}

export function sanitizeServiceEntry(value: unknown): ServiceCatalogEntry {
  const source = record(value);
  const tipo = isServiceCatalogKind(source.tipo) ? source.tipo : "otro";
  const ferry = tipo === "ferry";
  return {
    id: uuid(source.id), tipo, nombre: text(source.nombre, 160), operador: text(source.operador, 120), destino: text(source.destino, 160),
    descripcion: text(source.descripcion, 400), lugar: ferry ? "" : text(source.lugar, 200), duracion: ferry ? "" : text(source.duracion, 80),
    modalidad: !ferry && (source.modalidad === "compartido" || source.modalidad === "privado") ? source.modalidad : "",
    inclusiones: sanitizeInclusions(source.inclusiones, 30), cancelacion: text(source.cancelacion, 800, true),
    cambios: ferry ? text(source.cambios, 400, true) : "", equipajeIncluido: ferry ? text(source.equipajeIncluido, 300) : "", equipajeAdicional: ferry ? text(source.equipajeAdicional, 300) : "",
    embarque: ferry ? text(source.embarque, 400, true) : "", documentos: ferry ? text(source.documentos, 400, true) : "",
    notasInternas: text(source.notasInternas, 3000, true), activo: source.activo !== false, updatedAt: text(source.updatedAt, 40),
  };
}

export function serviceEntryErrors(entry: ServiceCatalogEntry) {
  const errors: string[] = [];
  if (!entry.nombre) errors.push(entry.tipo === "ferry" ? "Indique el nombre de la naviera o del barco." : "Indique el nombre del servicio.");
  return errors;
}

// Database row (snake_case) <-> entry.
export function serviceEntryFromRow(row: Record<string, unknown>): ServiceCatalogEntry {
  return sanitizeServiceEntry({
    id: row.id, tipo: row.tipo, nombre: row.nombre, operador: row.operador, destino: row.destino, descripcion: row.descripcion, lugar: row.lugar, duracion: row.duracion,
    modalidad: row.modalidad, inclusiones: row.inclusiones, cancelacion: row.cancelacion, cambios: row.cambios, equipajeIncluido: row.equipaje_incluido,
    equipajeAdicional: row.equipaje_adicional, embarque: row.embarque, documentos: row.documentos, notasInternas: row.notas_internas, activo: row.activo, updatedAt: row.updated_at,
  });
}

export function serviceEntryToRow(entry: ServiceCatalogEntry) {
  return {
    tipo: entry.tipo, nombre: entry.nombre, operador: entry.operador || null, destino: entry.destino || null, descripcion: entry.descripcion || null, lugar: entry.lugar || null,
    duracion: entry.duracion || null, modalidad: entry.modalidad || null, inclusiones: entry.inclusiones, cancelacion: entry.cancelacion || null, cambios: entry.cambios || null,
    equipaje_incluido: entry.equipajeIncluido || null, equipaje_adicional: entry.equipajeAdicional || null, embarque: entry.embarque || null, documentos: entry.documentos || null,
    notas_internas: entry.notasInternas || null, activo: entry.activo,
  };
}

// What the quotation editor receives: internal notes stay in the admin catalog.
export function serviceForEditor(entry: ServiceCatalogEntry): ServiceCatalogEntry {
  return { ...entry, notasInternas: "" };
}

export function serviceMatches(entry: ServiceCatalogEntry, query: string) {
  return !query.trim() || matchesQuery(searchText(entry.nombre, entry.operador, entry.destino, entry.descripcion), query);
}

const freshInclusions = (items: Inclusion[]) => items.map(item => ({ ...item, id: newId() }));

// Fills a transfer, tour, insurance… from a catalog record. Dates and times are the advisor's; a field the
// record leaves empty keeps what the advisor already typed. Inclusions must be confirmed again.
export function applyCatalogService(service: GeneralService, entry: ServiceCatalogEntry): GeneralService {
  return {
    ...service,
    descripcion: entry.descripcion || entry.nombre || service.descripcion,
    operador: entry.operador || service.operador,
    lugar: entry.lugar || service.lugar,
    duracion: entry.duracion || service.duracion,
    modalidad: entry.modalidad || service.modalidad,
    inclusiones: entry.inclusiones.length ? freshInclusions(entry.inclusiones) : service.inclusiones,
    inclusionesConfirmadas: false,
    cancelacion: entry.cancelacion || service.cancelacion,
  };
}

// Fills a ferry's standing conditions from a shipping line. Legs, class, seats, vehicles and the
// confirmation stay the advisor's; the conditions are marked unconfirmed.
export function applyCatalogFerry(ferry: FerryDetails, entry: ServiceCatalogEntry): FerryDetails {
  return {
    ...ferry,
    // A leg without an operator takes the shipping line; a leg the advisor already filled keeps its own.
    legs: ferry.legs.map(leg => leg.operador ? leg : { ...leg, operador: entry.operador || entry.nombre }),
    equipajeIncluido: entry.equipajeIncluido || ferry.equipajeIncluido,
    equipajeAdicional: entry.equipajeAdicional || ferry.equipajeAdicional,
    inclusiones: entry.inclusiones.length ? freshInclusions(entry.inclusiones) : ferry.inclusiones,
    inclusionesConfirmadas: false,
    cambios: entry.cambios || ferry.cambios,
    cancelacion: entry.cancelacion || ferry.cancelacion,
    embarque: entry.embarque || ferry.embarque,
    documentos: entry.documentos || ferry.documentos,
    confirmado: false,
  };
}

// The reverse ("Guardar en el catálogo"): a record proposed from what the advisor typed. No dates.
export function serviceEntryFromQuotation(tipo: ServiceCatalogKind, value: { service?: GeneralService | null; ferry?: FerryDetails | null; nombre?: string }): ServiceCatalogEntry {
  const entry = emptyServiceEntry(tipo);
  if (tipo === "ferry" && value.ferry) {
    const ferry = value.ferry;
    const operator = ferry.legs.find(leg => leg.operador)?.operador ?? "";
    return { ...entry, nombre: value.nombre || operator, operador: operator, equipajeIncluido: ferry.equipajeIncluido, equipajeAdicional: ferry.equipajeAdicional, inclusiones: freshInclusions(ferry.inclusiones), cambios: ferry.cambios, cancelacion: ferry.cancelacion, embarque: ferry.embarque, documentos: ferry.documentos };
  }
  const service = value.service;
  if (!service) return entry;
  return { ...entry, nombre: value.nombre || service.descripcion, operador: service.operador, descripcion: service.descripcion, lugar: service.lugar, duracion: service.duracion, modalidad: service.modalidad, inclusiones: freshInclusions(service.inclusiones), cancelacion: service.cancelacion };
}
