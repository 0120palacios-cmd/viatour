import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveExpiry, expandedDetails, quotationKinds, sanitizeDetails, type HotelStay, type QuotationDetails, type QuotationKind } from "@/lib/quotation-details";
import type { Quotation, QuotationItem } from "@/lib/quotation-types";

const legacyFields = "id,codigo,customer_id,cliente_nombre,cliente_email,cliente_telefono,destino,moneda,validez,notas,total,estado,agente_id,created_at,updated_at";
const quotationFields = `${legacyFields},tipo,detalles,vence_en,version`;

// PostgREST / Postgres codes for "column does not exist": docs/sql/quotations_v5.sql has not been run.
export function isMissingColumn(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST204" || error?.code === "42703" || error?.code === "PGRST200";
}

export type QuotationRecord = { quotation: Quotation; items: QuotationItem[]; kind: QuotationKind; details: QuotationDetails; expiry: string; schemaReady: boolean };

export function quotationKind(value: unknown): QuotationKind {
  return quotationKinds.includes(value as QuotationKind) ? value as QuotationKind : "general";
}

export function toRecord(quotation: Quotation, items: QuotationItem[], schemaReady: boolean): QuotationRecord {
  const kind = quotationKind(quotation.tipo);
  const details = sanitizeDetails(quotation.detalles ?? {});
  const expiry = effectiveExpiry(details.validez.venceEn || quotation.vence_en, quotation.validez);
  if (!details.validez.venceEn) details.validez.venceEn = expiry;
  return { quotation, items, kind, details, expiry, schemaReady };
}

export async function getAdminQuotation(client: SupabaseClient, id: string): Promise<QuotationRecord | null> {
  let schemaReady = true;
  let quotationResult = await client.from("quotations").select(quotationFields).eq("id", id).maybeSingle();
  if (isMissingColumn(quotationResult.error)) {
    schemaReady = false;
    quotationResult = await client.from("quotations").select(legacyFields).eq("id", id).maybeSingle();
  }
  if (quotationResult.error || !quotationResult.data) return null;
  const itemsResult = await client.from("quotation_items").select("id,quotation_id,descripcion,tipo,cantidad,precio_unitario,orden").eq("quotation_id", id).order("orden", { ascending: true }).order("id", { ascending: true });
  if (itemsResult.error) throw new Error("No se pudieron cargar los ítems de la cotización.");
  const items = ((itemsResult.data ?? []) as QuotationItem[]).map(item => ({ ...item, cantidad: Number(item.cantidad), precio_unitario: Number(item.precio_unitario) }));
  return toRecord(quotationResult.data as unknown as Quotation, items, schemaReady);
}

export type QuotationVersion = { id: string; version: number; emitida_en: string };

export async function listQuotationVersions(client: SupabaseClient, id: string): Promise<QuotationVersion[]> {
  const result = await client.from("quotation_versions").select("id,version,emitida_en").eq("quotation_id", id).order("version", { ascending: false }).limit(50);
  return result.error ? [] : (result.data ?? []) as QuotationVersion[];
}

// An issued version is rendered from its own snapshot, never from the current (possibly edited) quotation.
export async function getQuotationVersion(client: SupabaseClient, id: string, version: number): Promise<QuotationRecord | null> {
  const result = await client.from("quotation_versions").select("snapshot").eq("quotation_id", id).eq("version", version).maybeSingle();
  if (result.error || !result.data) return null;
  const snapshot = result.data.snapshot as { quotation?: Quotation; items?: QuotationItem[] };
  if (!snapshot?.quotation || !Array.isArray(snapshot.items)) return null;
  return toRecord(snapshot.quotation, snapshot.items, true);
}

export { legacyFields, quotationFields };

// Hotels from recent quotations, offered as suggestions so an advisor can reuse address, services and
// photos. Only data the team entered before; nothing is fetched from outside.
export async function recentQuotationHotels(client: SupabaseClient, limit = 40): Promise<HotelStay[]> {
  const result = await client.from("quotations").select("tipo,detalles").in("tipo", ["hotel", "paquete", "combinado"]).order("updated_at", { ascending: false }).limit(limit);
  if (result.error || !result.data) return [];
  const seen = new Set<string>();
  const hotels: HotelStay[] = [];
  for (const row of result.data) {
    for (const hotel of expandedDetails(sanitizeDetails(row.detalles)).hoteles) {
      const key = hotel.nombre.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      hotels.push(hotel);
    }
  }
  return hotels.slice(0, 60);
}
