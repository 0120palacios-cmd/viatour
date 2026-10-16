"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin";
import { airlineEntryErrors, airlineEntryToRow, catalogEntryFromStay, hotelEntryErrors, hotelEntryToRow, isMissingTable, presetErrors, presetToRow, sanitizeAirlineEntry, sanitizeHotelEntry, sanitizePreset } from "@/lib/catalog";
import { sanitizeDetails } from "@/lib/quotation-details";
import { validUuid } from "@/lib/quotation-validation";
import { isServiceCatalogKind, sanitizeServiceEntry, serviceEntryErrors, serviceEntryFromQuotation, serviceEntryToRow } from "@/lib/service-catalog";

// Catalog writes from the admin panel. Every call checks the admin session (without redirecting, so a
// form with unsaved work is kept), sanitizes the input with the same rules as the reads and writes with
// the admin's own session: RLS (public.is_admin()) and the audit trigger apply in the database.

export type CatalogActionState = { error?: string; success?: string; id?: string; updatedAt?: string; conflict?: boolean };

const maxPayload = 200_000;
const sessionExpired = "Su sesión venció y los cambios no se guardaron. Inicie sesión en otra pestaña (/admin/login) y vuelva a guardar; no cierre esta página.";
const schemaMissing = "Los catálogos aún no existen en la base de datos. Ejecute docs/sql/quotations_v6.sql en Supabase.";
const conflictMessage = "Otra persona u otra pestaña guardó cambios en este registro. Recargue la página para ver la versión más reciente.";

function parse(payload: string): Record<string, unknown> | null {
  if (typeof payload !== "string" || !payload || payload.length > maxPayload) return null;
  try {
    const value = JSON.parse(payload);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function refresh(...paths: string[]) {
  for (const path of ["/admin/catalogos/hoteles", "/admin/catalogos/aerolineas", "/admin/catalogos/servicios", "/admin/cotizaciones/nuevo", ...paths]) revalidatePath(path);
}

type DbError = { code?: string; message?: string } | null | undefined;
function failure(error: DbError, duplicate: string, fallback: string): CatalogActionState {
  if (isMissingTable(error)) return { error: schemaMissing };
  if (error?.code === "23505") return { error: duplicate };
  return { error: fallback };
}

export async function saveHotelEntry(payload: string): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  const raw = parse(payload);
  if (!raw) return { error: "Datos del hotel inválidos." };
  const entry = sanitizeHotelEntry(raw);
  const errors = hotelEntryErrors(entry);
  if (errors.length) return { error: errors.join(" ") };
  const row = hotelEntryToRow(entry);
  const duplicate = "Ya existe un hotel con ese nombre en esa ciudad. Búsquelo en el catálogo y edítelo.";
  if (entry.id) {
    let query = session.client.from("hotel_catalog").update(row).eq("id", entry.id);
    if (entry.updatedAt) query = query.eq("updated_at", entry.updatedAt);
    const saved = await query.select("id,updated_at").maybeSingle();
    if (saved.error) return failure(saved.error, duplicate, "No se pudo guardar el hotel. Revise los datos e intente nuevamente.");
    if (!saved.data) return { error: conflictMessage, conflict: true };
    refresh(`/admin/catalogos/hoteles/${entry.id}`);
    return { success: "Hotel guardado.", id: entry.id, updatedAt: String(saved.data.updated_at) };
  }
  const saved = await session.client.from("hotel_catalog").insert(row).select("id,updated_at").single();
  if (saved.error || !saved.data) return failure(saved.error, duplicate, "No se pudo crear el hotel. Revise los datos e intente nuevamente.");
  refresh();
  return { success: "Hotel agregado al catálogo.", id: String(saved.data.id), updatedAt: String(saved.data.updated_at) };
}

// "Guardar en el catálogo" from a hotel typed in a quotation. Only reusable data goes to the catalog
// (no dates, occupancy or prices); the quotation itself is not changed.
export async function saveHotelFromQuotation(stayPayload: string): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  const raw = parse(stayPayload);
  if (!raw) return { error: "Datos del hotel inválidos." };
  const [stay] = sanitizeDetails({ hoteles: [raw] }).hoteles;
  if (!stay?.nombre) return { error: "Indique el nombre del hotel antes de guardarlo en el catálogo." };
  const entry = catalogEntryFromStay(stay);
  if (hotelEntryErrors(entry).length) return { error: "Indique el destino del hotel antes de guardarlo en el catálogo." };
  const saved = await session.client.from("hotel_catalog").insert(hotelEntryToRow(entry)).select("id,updated_at").single();
  if (saved.error || !saved.data) return failure(saved.error, "Ese hotel ya está en el catálogo. Selecciónelo desde «Buscar en el catálogo».", "No se pudo guardar el hotel en el catálogo.");
  refresh();
  return { success: "Hotel guardado en el catálogo. Complete sus datos en Catálogos cuando pueda.", id: String(saved.data.id), updatedAt: String(saved.data.updated_at) };
}

export async function setHotelActive(id: string, active: boolean): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  if (!validUuid(id)) return { error: "Registro inválido." };
  const saved = await session.client.from("hotel_catalog").update({ activo: active }).eq("id", id).select("id,updated_at").maybeSingle();
  if (saved.error || !saved.data) return failure(saved.error, "", "No se pudo cambiar el estado del hotel.");
  refresh(`/admin/catalogos/hoteles/${id}`);
  return { success: active ? "Hotel activado." : "Hotel desactivado. Ya no aparece al cotizar; las cotizaciones existentes no cambian.", id, updatedAt: String(saved.data.updated_at) };
}

export async function saveAirlineEntry(payload: string): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  const raw = parse(payload);
  if (!raw) return { error: "Datos de la aerolínea inválidos." };
  const entry = sanitizeAirlineEntry(raw);
  const errors = airlineEntryErrors(entry, raw);
  if (errors.length) return { error: errors.join(" ") };
  const duplicate = "Ya existe una aerolínea activa con ese nombre o código IATA.";
  if (entry.id) {
    let query = session.client.from("airline_catalog").update(airlineEntryToRow(entry)).eq("id", entry.id);
    if (entry.updatedAt) query = query.eq("updated_at", entry.updatedAt);
    const saved = await query.select("id,updated_at").maybeSingle();
    if (saved.error) return failure(saved.error, duplicate, "No se pudo guardar la aerolínea.");
    if (!saved.data) return { error: conflictMessage, conflict: true };
    refresh(`/admin/catalogos/aerolineas/${entry.id}`);
    return { success: "Aerolínea guardada.", id: entry.id, updatedAt: String(saved.data.updated_at) };
  }
  const saved = await session.client.from("airline_catalog").insert(airlineEntryToRow(entry)).select("id,updated_at").single();
  if (saved.error || !saved.data) return failure(saved.error, duplicate, "No se pudo crear la aerolínea.");
  refresh();
  return { success: "Aerolínea agregada al catálogo.", id: String(saved.data.id), updatedAt: String(saved.data.updated_at) };
}

export async function saveFarePreset(payload: string): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  const raw = parse(payload);
  if (!raw) return { error: "Datos de la tarifa inválidos." };
  const preset = sanitizePreset(raw);
  const errors = presetErrors(preset);
  if (errors.length) return { error: errors.join(" ") };
  const duplicate = "Esta aerolínea ya tiene una tarifa con ese nombre.";
  if (preset.id) {
    let query = session.client.from("airline_fare_presets").update(presetToRow(preset)).eq("id", preset.id).eq("airline_id", preset.airlineId);
    if (preset.updatedAt) query = query.eq("updated_at", preset.updatedAt);
    const saved = await query.select("id,updated_at").maybeSingle();
    if (saved.error) return failure(saved.error, duplicate, "No se pudo guardar la tarifa.");
    if (!saved.data) return { error: conflictMessage, conflict: true };
    refresh(`/admin/catalogos/aerolineas/${preset.airlineId}`);
    return { success: "Tarifa guardada.", id: preset.id, updatedAt: String(saved.data.updated_at) };
  }
  const saved = await session.client.from("airline_fare_presets").insert(presetToRow(preset)).select("id,updated_at").single();
  if (saved.error || !saved.data) return failure(saved.error, duplicate, "No se pudo crear la tarifa.");
  refresh(`/admin/catalogos/aerolineas/${preset.airlineId}`);
  return { success: "Tarifa agregada.", id: String(saved.data.id), updatedAt: String(saved.data.updated_at) };
}

// ----- services (docs/sql/service_catalog_v7.sql) -----

const serviceSchemaMissing = "El catálogo de servicios aún no existe en la base de datos. Ejecute docs/sql/service_catalog_v7.sql en Supabase.";
const serviceDuplicate = "Ya existe un servicio de ese tipo con el mismo nombre y operador. Búsquelo en el catálogo.";
function serviceFailure(error: DbError, fallback: string): CatalogActionState {
  if (isMissingTable(error)) return { error: serviceSchemaMissing };
  if (error?.code === "23505") return { error: serviceDuplicate };
  return { error: fallback };
}

export async function saveServiceEntry(payload: string): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  const raw = parse(payload);
  if (!raw || !isServiceCatalogKind(raw.tipo)) return { error: "Datos del servicio inválidos." };
  const entry = sanitizeServiceEntry(raw);
  const errors = serviceEntryErrors(entry);
  if (errors.length) return { error: errors.join(" ") };
  const row = serviceEntryToRow(entry);
  if (entry.id) {
    let query = session.client.from("service_catalog").update(row).eq("id", entry.id);
    if (entry.updatedAt) query = query.eq("updated_at", entry.updatedAt);
    const saved = await query.select("id,updated_at").maybeSingle();
    if (saved.error) return serviceFailure(saved.error, "No se pudo guardar el servicio. Revise los datos e intente nuevamente.");
    if (!saved.data) return { error: conflictMessage, conflict: true };
    refresh(`/admin/catalogos/servicios/${entry.id}`);
    return { success: "Servicio guardado.", id: entry.id, updatedAt: String(saved.data.updated_at) };
  }
  const saved = await session.client.from("service_catalog").insert(row).select("id,updated_at").single();
  if (saved.error || !saved.data) return serviceFailure(saved.error, "No se pudo crear el servicio. Revise los datos e intente nuevamente.");
  refresh();
  return { success: "Servicio agregado al catálogo.", id: String(saved.data.id), updatedAt: String(saved.data.updated_at) };
}

// "Guardar en el catálogo" from a transfer, tour… or ferry typed in a quotation. Only reusable data goes
// to the catalog (no dates, legs, passengers or prices); the quotation itself is not changed.
export async function saveServiceFromQuotation(componentPayload: string): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  const raw = parse(componentPayload);
  if (!raw || !isServiceCatalogKind(raw.tipo)) return { error: "Datos del servicio inválidos." };
  const tipo = raw.tipo;
  // The same sanitizing as a saved quotation: build a one-component package and read it back.
  const details = sanitizeDetails({ paquete: { componentes: [raw] } });
  const component = details.paquete.componentes[0];
  if (!component) return { error: "Datos del servicio inválidos." };
  const entry = serviceEntryFromQuotation(tipo, { service: component.servicio, ferry: component.ferry, nombre: component.titulo });
  if (serviceEntryErrors(entry).length) return { error: tipo === "ferry" ? "Indique la naviera en el trayecto o un título para el servicio antes de guardarlo." : "Escriba la descripción del servicio antes de guardarlo en el catálogo." };
  const saved = await session.client.from("service_catalog").insert(serviceEntryToRow(entry)).select("id,updated_at").single();
  if (saved.error || !saved.data) return serviceFailure(saved.error, "No se pudo guardar el servicio en el catálogo.");
  refresh();
  return { success: "Guardado en el catálogo. Complete sus datos en Catálogos cuando pueda.", id: String(saved.data.id), updatedAt: String(saved.data.updated_at) };
}

export async function setServiceActive(id: string, active: boolean): Promise<CatalogActionState> {
  const session = await adminSession();
  if (!session) return { error: sessionExpired };
  if (!validUuid(id)) return { error: "Registro inválido." };
  const saved = await session.client.from("service_catalog").update({ activo: active }).eq("id", id).select("id,updated_at").maybeSingle();
  if (saved.error || !saved.data) return serviceFailure(saved.error, "No se pudo cambiar el estado del servicio.");
  refresh(`/admin/catalogos/servicios/${id}`);
  return { success: active ? "Servicio activado." : "Servicio desactivado. Ya no aparece al cotizar; las cotizaciones existentes no cambian.", id, updatedAt: String(saved.data.updated_at) };
}
