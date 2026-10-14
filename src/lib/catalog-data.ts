import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { airlineEntryFromRow, airlineForEditor, hotelEntryFromRow, hotelForEditor, isMissingTable, type AirlineEntry, type HotelCatalogEntry } from "@/lib/catalog";
import { sanitizeDetails, expandedDetails } from "@/lib/quotation-details";

// Catalog reads always use the admin's own session (RLS: public.is_admin()). When the V6 SQL has not been
// applied the tables do not exist; callers get ready: false and the panel explains what to run.

export type CatalogResult<T> = { ready: boolean; rows: T[] };

const hotelFields = "id,nombre,cadena,pais,ciudad,destino,direccion,ubicacion,telefono,email,sitio_web,descripcion,estrellas,fotos,amenidades,habitaciones,planes,inclusiones,check_in,check_out,politicas,cancelacion,impuestos,cargo_resort,referencia_proveedor,notas_internas,activo,updated_at";
const airlineFields = "id,nombre,iata,icao,pais,operadora,notas_internas,activo,updated_at";
const presetFields = "id,airline_id,nombre,cabina,tipo_tarifa,aplica_a,equipaje,cambios,cancelacion,reembolso,asientos,restricciones,otras_inclusiones,fuente,verificado_en,activo,updated_at";

export async function listHotelCatalog(client: SupabaseClient, options: { activeOnly?: boolean; limit?: number } = {}): Promise<CatalogResult<HotelCatalogEntry>> {
  let query = client.from("hotel_catalog").select(hotelFields).order("nombre", { ascending: true }).limit(options.limit ?? 500);
  if (options.activeOnly) query = query.eq("activo", true);
  const result = await query;
  if (isMissingTable(result.error)) return { ready: false, rows: [] };
  if (result.error) throw new Error("No se pudo cargar el catálogo de hoteles.");
  return { ready: true, rows: (result.data ?? []).map(row => hotelEntryFromRow(row as Record<string, unknown>)) };
}

export async function getHotelEntry(client: SupabaseClient, id: string): Promise<HotelCatalogEntry | null> {
  const result = await client.from("hotel_catalog").select(hotelFields).eq("id", id).maybeSingle();
  if (result.error && !isMissingTable(result.error)) throw new Error("No se pudo cargar el hotel.");
  return result.data ? hotelEntryFromRow(result.data as Record<string, unknown>) : null;
}

export async function listAirlineCatalog(client: SupabaseClient, options: { activeOnly?: boolean } = {}): Promise<CatalogResult<AirlineEntry>> {
  let airlines = client.from("airline_catalog").select(airlineFields).order("nombre", { ascending: true }).limit(300);
  let presets = client.from("airline_fare_presets").select(presetFields).order("nombre", { ascending: true }).limit(2000);
  if (options.activeOnly) { airlines = airlines.eq("activo", true); presets = presets.eq("activo", true); }
  const [airlineResult, presetResult] = await Promise.all([airlines, presets]);
  if (isMissingTable(airlineResult.error) || isMissingTable(presetResult.error)) return { ready: false, rows: [] };
  if (airlineResult.error || presetResult.error) throw new Error("No se pudo cargar el catálogo de aerolíneas.");
  const byAirline = new Map<string, Record<string, unknown>[]>();
  for (const row of (presetResult.data ?? []) as Record<string, unknown>[]) byAirline.set(String(row.airline_id), [...(byAirline.get(String(row.airline_id)) ?? []), row]);
  return { ready: true, rows: (airlineResult.data ?? []).map(row => airlineEntryFromRow(row as Record<string, unknown>, byAirline.get(String((row as Record<string, unknown>).id)) ?? [])) };
}

export async function getAirlineEntry(client: SupabaseClient, id: string): Promise<AirlineEntry | null> {
  const [airline, presets] = await Promise.all([
    client.from("airline_catalog").select(airlineFields).eq("id", id).maybeSingle(),
    client.from("airline_fare_presets").select(presetFields).eq("airline_id", id).order("nombre", { ascending: true }),
  ]);
  if ((airline.error && !isMissingTable(airline.error)) || (presets.error && !isMissingTable(presets.error))) throw new Error("No se pudo cargar la aerolínea.");
  return airline.data ? airlineEntryFromRow(airline.data as Record<string, unknown>, (presets.data ?? []) as Record<string, unknown>[]) : null;
}

// What the quotation editor needs: active hotels and airlines with their active presets, plus the
// airlines and presets used most recently in quotations (shown first in the selectors).
export type EditorCatalogs = { ready: boolean; hotels: HotelCatalogEntry[]; airlines: AirlineEntry[]; recentAirlines: string[]; recentPresets: string[] };

export async function editorCatalogs(client: SupabaseClient): Promise<EditorCatalogs> {
  const [hotels, airlines, recent] = await Promise.all([
    listHotelCatalog(client, { activeOnly: true }),
    listAirlineCatalog(client, { activeOnly: true }),
    client.from("quotations").select("detalles").in("tipo", ["vuelo", "paquete", "combinado"]).order("updated_at", { ascending: false }).limit(40),
  ]);
  const recentAirlines: string[] = [];
  const recentPresets: string[] = [];
  for (const row of recent.error ? [] : recent.data ?? []) {
    const details = expandedDetails(sanitizeDetails((row as { detalles: unknown }).detalles));
    const fares = [...details.tarifas, ...details.paquete.componentes.flatMap(component => component.vuelo?.tarifas ?? [])];
    for (const fare of fares) {
      if (fare.aerolinea && !recentAirlines.includes(fare.aerolinea)) recentAirlines.push(fare.aerolinea);
      if (fare.plantillaId && !recentPresets.includes(fare.plantillaId)) recentPresets.push(fare.plantillaId);
    }
  }
  return { ready: hotels.ready && airlines.ready, hotels: hotels.rows.map(hotelForEditor), airlines: airlines.rows.map(airlineForEditor), recentAirlines: recentAirlines.slice(0, 8), recentPresets: recentPresets.slice(0, 12) };
}
