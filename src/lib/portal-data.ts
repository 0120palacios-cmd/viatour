import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Currency } from "@/lib/quotation-types";
import type { Invoice, Payment, ReservationItem } from "@/lib/reservation-types";

export type PortalReservation = {
  id: string;
  codigo: string;
  destino: string;
  moneda: Currency;
  total: number;
  estado: "pendiente" | "confirmada" | "en_curso" | "completada" | "cancelada";
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type PortalDocument = { name: string; path: string; url: string };
export type PortalTicket = { id: string; asunto: string; mensaje: string; estado: string; created_at: string; respuesta: string | null };

const portalReservationFields = "id,codigo,destino,moneda,total,estado,fecha_inicio,fecha_fin";
const portalInvoiceFields = "id,reservation_id,numero,cliente_nombre,cliente_email,cliente_telefono,items,total,moneda,fecha_emision,fecha_vencimiento,estado,notas,created_at,updated_at";

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
    client
      .from("invoices")
      .select(portalInvoiceFields)
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: false }),
  ]);

  if (itemsResult.error || paymentsResult.error || invoicesResult.error) return null;
  return {
    reservation: reservationResult.data as PortalReservation,
    items: (itemsResult.data ?? []) as ReservationItem[],
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as Invoice[],
  };
}

export async function getPortalInvoice(client: SupabaseClient, reservationId: string, invoiceId: string) {
  const result = await client
    .from("invoices")
    .select(portalInvoiceFields)
    .eq("id", invoiceId)
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return result.data as Invoice;
}

export async function getPortalDocuments(client: SupabaseClient, reservationId: string) {
  const listed = await client.storage.from("portal-docs").list(reservationId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (listed.error) return [] as PortalDocument[];
  const documents = await Promise.all((listed.data ?? []).filter(file => file.name).map(async file => {
    const path = `${reservationId}/${file.name}`;
    const signed = await client.storage.from("portal-docs").createSignedUrl(path, 300);
    return signed.data?.signedUrl ? { name: file.name, path, url: signed.data.signedUrl } : null;
  }));
  return documents.filter((document): document is PortalDocument => Boolean(document));
}

export async function getPortalTickets(client: SupabaseClient, reservationId: string) {
  const result = await client.from("support_tickets")
    .select("id,asunto,mensaje,estado,created_at,respuesta")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false });
  if (result.error) return [] as PortalTicket[];
  return (result.data ?? []) as PortalTicket[];
}
