import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminQuotationStatusLabel, type AdminQuotationStatus } from "@/lib/admin-quotation-status";
import { reservationStatusLabel, type ReservationStatus } from "@/lib/reservation-types";

// The activity history (docs/sql/admin_audit_log.sql and later steps) in words. Entries hold states, codes and
// amounts only, never personal data, so nothing here can reveal a passport, a phone or a message.
export type ActivityEntry = { id: number; at: string; actor: string | null; action: string; entity: string; entity_id: string | null; reference: string | null; details: Record<string, unknown> };
export type ActivityLine = { id: number; at: string; who: string; text: string; href: string | null; reference: string };

export const activityEntities = [["", "Todo"], ["quotation", "Cotizaciones"], ["reservation", "Reservas"], ["payment", "Pagos"], ["invoice", "Facturas"], ["receipt", "Recibos"], ["travel", "Expedientes"], ["passenger_profile", "Pasajeros"]] as const;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const quotationState = (value: unknown) => str(value) ? adminQuotationStatusLabel(str(value) as AdminQuotationStatus) ?? str(value) : "";
const reservationState = (value: unknown) => str(value) ? reservationStatusLabel(str(value) as ReservationStatus) ?? str(value) : "";
const money = (amount: unknown, currency: unknown) => typeof amount === "number" || (typeof amount === "string" && amount) ? `${Number(amount).toFixed(2)} ${str(currency)}`.trim() : "";
const pair = (value: unknown) => Array.isArray(value) ? value : [];

function describe(entry: ActivityEntry): string {
  const d = entry.details ?? {};
  switch (entry.action) {
    case "quotation.created": return "Cotización creada";
    case "quotation.status_changed": return `Cotización: ${quotationState(d.from)} → ${quotationState(d.to)}`;
    case "quotation.reassigned": return "Cotización asignada a otro asesor";
    case "quotation.version_linked": return `Versión ${str(String(d.version ?? ""))} registrada`;
    case "quotation.share_prepared": return "Envío por WhatsApp preparado (enlace seguro creado)";
    case "quotation.share_confirmado": return "Envío por WhatsApp confirmado por el asesor";
    case "quotation.share_cancelado": return "Envío por WhatsApp cancelado";
    case "quotation.share_revocado": return "Enlace de la cotización desactivado";
    case "reservation.created": return `Reserva creada${d.total != null ? ` por ${money(d.total, d.moneda)}` : ""}`;
    case "reservation.cancelled": return "Reserva cancelada";
    case "reservation.status_changed": { const [from, to] = pair((d as { estado?: unknown }).estado); return `Reserva: ${reservationState(from)} → ${reservationState(to)}`; }
    case "reservation.promoted": return "Prerreservación convertida en reserva";
    case "reservation.supplier_changed": return "Confirmación del proveedor actualizada";
    case "reservation.updated": { const total = pair((d as { total?: unknown }).total); return total.length ? `Total de la reserva: ${money(total[0], "")} → ${money(total[1], "")}` : "Reserva actualizada"; }
    case "payment.recorded": return `Pago registrado: ${money(d.monto, d.moneda)}`;
    case "payment.refunded": return `Devolución registrada: ${money(d.monto, d.moneda)}`;
    case "payment.reversed": return `Pago revertido: ${money(d.monto, d.moneda)}`;
    case "payment.edited": return "Pago editado";
    case "payment.deleted": return "Pago eliminado";
    case "invoice.created": return `Factura creada: ${money(d.total, d.moneda)}`;
    case "invoice.issued": return "Factura emitida";
    case "invoice.paid": return "Factura marcada como pagada";
    case "invoice.annulled": return "Factura anulada";
    case "invoice.status_changed": return "Estado de la factura actualizado";
    case "receipt.created": return "Recibo generado";
    case "travel.revised": return `Expediente de pasajeros guardado (revisión ${String(d.revision ?? "")})`;
    case "passenger.created": return "Pasajero agregado";
    case "passenger.updated": return "Pasajero actualizado";
    case "passenger.deleted": return "Pasajero borrado, con sus imágenes";
    case "passenger.passport_image_removed": return "Imagen del pasaporte eliminada";
    case "passenger.passport_viewed": return "Imagen del pasaporte consultada";
    default: return entry.action;
  }
}

function link(entry: ActivityEntry) {
  const d = entry.details ?? {};
  if (entry.entity === "quotation" && entry.entity_id) return `/admin/cotizaciones/${entry.entity_id}`;
  if ((entry.entity === "reservation" || entry.entity === "travel") && entry.entity_id) return `/admin/reservas/${entry.entity_id}`;
  if (entry.entity === "invoice" && entry.entity_id) return `/admin/facturacion/${entry.entity_id}`;
  if (str(d.reservation_id)) return `/admin/reservas/${str(d.reservation_id)}`;
  if (str(d.customer_id)) return `/admin/clientes/${str(d.customer_id)}`;
  return null;
}

export function toLines(entries: ActivityEntry[], userId: string): ActivityLine[] {
  return entries.map(entry => ({ id: entry.id, at: entry.at, who: entry.actor ? (entry.actor === userId ? "Usted" : "Otro administrador") : "Sistema", text: describe(entry), href: link(entry), reference: entry.reference ?? "" }));
}

export const activityFields = "id,at,actor,action,entity,entity_id,reference,details";
const fields = activityFields;
// Latest entries, optionally of one kind. Before the activity log exists the list is simply unavailable.
export async function listActivity(client: SupabaseClient, { entity = "", limit = 100, before }: { entity?: string; limit?: number; before?: number } = {}) {
  let query = client.from("admin_audit_log").select(fields).order("id", { ascending: false }).limit(limit);
  if (entity) query = query.eq("entity", entity);
  if (before) query = query.lt("id", before);
  const result = await query;
  return { available: !result.error, entries: (result.data ?? []) as ActivityEntry[] };
}

// Everything about one record: its own entries plus payments, invoices and receipts that point to it.
export async function recordActivity(client: SupabaseClient, id: string, limit = 30) {
  const result = await client.from("admin_audit_log").select(fields).or(`entity_id.eq.${id},details->>reservation_id.eq.${id}`).order("id", { ascending: false }).limit(limit);
  return { available: !result.error, entries: (result.data ?? []) as ActivityEntry[] };
}
