import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invoice } from "@/lib/reservation-types";
import { selectInvoices } from "@/lib/invoice-query";

export type PortalTicket = { id: string; asunto: string; mensaje: string; estado: string; created_at: string; respuesta: string | null };

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

export async function getPortalTickets(client: SupabaseClient, reservationId: string) {
  const result = await client.from("support_tickets")
    .select("id,asunto,mensaje,estado,created_at,respuesta")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false });
  if (result.error) return [] as PortalTicket[];
  return (result.data ?? []) as PortalTicket[];
}
