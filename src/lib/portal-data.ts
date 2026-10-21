import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Currency } from "@/lib/quotation-types";
import type { Invoice, Payment, ReservationItem } from "@/lib/reservation-types";
import { listReservationDocuments, portalDocsBucket, type StoredDocument } from "@/lib/portal-documents";
import { selectInvoices } from "@/lib/invoice-query";

export type PortalReservation = {
  id: string;
  codigo: string;
  destino: string;
  moneda: Currency;
  total: number;
  estado: "pendiente" | "confirmada" | "en_curso" | "completada" | "cancelada";
  accepted_snapshot?: { quotation?: { detalles?: unknown } };
  prerreserva?: boolean;
  supplier_status?: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type PortalDocument = StoredDocument;
export type PortalTicket = { id: string; asunto: string; mensaje: string; estado: string; created_at: string; respuesta: string | null };

const portalReservationFields = "id,codigo,destino,moneda,total,estado,fecha_inicio,fecha_fin";

export async function getPortalReservation(client: SupabaseClient, reservationId: string) {
  const reservationResult = await client
    .from("reservations")
    .select(portalReservationFields)
    .eq("id", reservationId)
    .maybeSingle();
  if (reservationResult.error || !reservationResult.data) return null;

  const [itemsResult, paymentsResult, invoicesResult] = await Promise.all([
    client
      .from("reservation_items")
      .select("id,reservation_id,descripcion,tipo,cantidad,precio_unitario,orden")
      .eq("reservation_id", reservationId)
      .order("orden", { ascending: true })
      .order("id", { ascending: true }),
    client
      .from("payments")
      .select("id,reservation_id,monto,moneda,metodo,referencia,fecha_pago,notas,created_at")
      .eq("reservation_id", reservationId)
      .order("fecha_pago", { ascending: false })
      .order("created_at", { ascending: false }),
    selectInvoices(fields => client
      .from("invoices")
      .select(fields)
      .eq("reservation_id", reservationId)
      .in("estado", ["emitida", "pagada"])
      .order("created_at", { ascending: false })),
  ]);

  if (itemsResult.error || paymentsResult.error || invoicesResult.error) return null;
  const commercial = await client.from("reservations").select("prerreserva,supplier_status,accepted_snapshot").eq("id", reservationId).maybeSingle();
  return {
    reservation: { ...reservationResult.data, ...(commercial.error ? {} : commercial.data) } as PortalReservation,
    items: (itemsResult.data ?? []) as ReservationItem[],
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as unknown as Invoice[],
  };
}

export async function getPortalInvoice(client: SupabaseClient, reservationId: string, invoiceId: string) {
  const result = await selectInvoices(fields => client
    .from("invoices")
    .select(fields)
    .eq("id", invoiceId)
    .in("estado", ["emitida", "pagada"])
    .eq("reservation_id", reservationId)
    .maybeSingle());
  if (result.error || !result.data) return null;
  const invoice = result.data as unknown as Invoice;
  const payments = await client.from("payments").select("monto,moneda").eq("reservation_id", reservationId);
  if (payments.error) return null;
  invoice.payments_received = (payments.data ?? []).filter(p => p.moneda === invoice.moneda).reduce((sum, p) => sum + Math.round(Number(p.monto) * 100), 0) / 100;
  return invoice;
}

// Listed without URLs: each link points to /api/mi-reserva/documentos, which checks the session and
// signs a short-lived URL at click time, so a page left open never shows an expired link.
export async function getPortalDocuments(client: SupabaseClient, reservationId: string): Promise<PortalDocument[]> {
  try { return await listReservationDocuments(client.storage.from(portalDocsBucket), reservationId); } catch { return []; }
}

export async function getPortalTickets(client: SupabaseClient, reservationId: string) {
  const result = await client.from("support_tickets")
    .select("id,asunto,mensaje,estado,created_at,respuesta")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false });
  if (result.error) return [] as PortalTicket[];
  return (result.data ?? []) as PortalTicket[];
}
