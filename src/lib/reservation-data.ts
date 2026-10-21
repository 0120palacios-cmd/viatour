import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invoice, Payment, Reservation, ReservationItem } from "@/lib/reservation-types";
import { invoiceFields, selectInvoices } from "@/lib/invoice-query";

const reservationFields = "id,codigo,quotation_id,customer_id,cliente_nombre,cliente_email,cliente_telefono,destino,moneda,total,estado,fecha_inicio,fecha_fin,notas,agente_id,created_at,updated_at";

export async function getAdminReservation(client: SupabaseClient, id: string) {
  const reservationResult = await client.from("reservations").select(reservationFields).eq("id", id).maybeSingle();
  if (reservationResult.error || !reservationResult.data) return null;
  const [itemsResult, paymentsResult, invoicesResult] = await Promise.all([
    client.from("reservation_items").select("id,reservation_id,descripcion,tipo,cantidad,precio_unitario,orden").eq("reservation_id", id).order("orden", { ascending: true }).order("id", { ascending: true }),
    client.from("payments").select("id,reservation_id,monto,moneda,metodo,referencia,fecha_pago,notas,created_at").eq("reservation_id", id).order("fecha_pago", { ascending: false }).order("created_at", { ascending: false }),
    selectInvoices(fields => client.from("invoices").select(fields).eq("reservation_id", id).order("created_at", { ascending: false })),
  ]);
  if (itemsResult.error || paymentsResult.error || invoicesResult.error) throw new Error("No se pudieron cargar los datos de la reserva.");
  // Income columns are optional (docs/sql/reservations_income.sql); a missing column must not break the page.
  const income = await client.from("reservations").select("comision,segmento").eq("id", id).maybeSingle();
  const commercial = await client.from("reservations").select("prerreserva,accepted_version_id,accepted_snapshot,supplier_status,supplier_reference,cliente_apellido").eq("id", id).maybeSingle();
  return {
    reservation: { ...(reservationResult.data as Reservation), ...(commercial.error ? {} : commercial.data), ...(income.error || !income.data ? {} : income.data) },
    items: (itemsResult.data ?? []) as ReservationItem[],
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as unknown as Invoice[],
  };
}

export async function getAdminInvoice(client: SupabaseClient, id: string) {
  const invoiceResult = await selectInvoices(fields => client.from("invoices").select(fields).eq("id", id).maybeSingle());
  if (invoiceResult.error || !invoiceResult.data) return null;
  const reservationResult = await client.from("reservations").select(reservationFields).eq("id", (invoiceResult.data as unknown as { reservation_id: string }).reservation_id).maybeSingle();
  if (reservationResult.error || !reservationResult.data) return null;
  const payments = await client.from("payments").select("monto,moneda").eq("reservation_id", reservationResult.data.id);
  if (payments.error) throw new Error("No se pudieron verificar los pagos.");
  const currency = reservationResult.data.moneda;
  const received = (payments.data ?? []).filter(p => p.moneda === currency).reduce((sum, p) => sum + Math.round(Number(p.monto) * 100), 0) / 100;
  return { invoice: { ...(invoiceResult.data as unknown as Invoice), payments_received: received }, reservation: reservationResult.data as Reservation };
}

export { reservationFields, invoiceFields };
