import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invoice, Payment, Reservation, ReservationItem } from "@/lib/reservation-types";

const reservationFields = "id,codigo,quotation_id,customer_id,cliente_nombre,cliente_email,cliente_telefono,destino,moneda,total,estado,fecha_inicio,fecha_fin,notas,agente_id,created_at,updated_at";
const invoiceFields = "id,reservation_id,numero,cliente_nombre,cliente_email,cliente_telefono,items,total,moneda,fecha_emision,fecha_vencimiento,estado,notas,created_at,updated_at";

export async function getAdminReservation(client: SupabaseClient, id: string) {
  const reservationResult = await client.from("reservations").select(reservationFields).eq("id", id).maybeSingle();
  if (reservationResult.error || !reservationResult.data) return null;
  const [itemsResult, paymentsResult, invoicesResult] = await Promise.all([
    client.from("reservation_items").select("id,reservation_id,descripcion,tipo,cantidad,precio_unitario,orden").eq("reservation_id", id).order("orden", { ascending: true }).order("id", { ascending: true }),
    client.from("payments").select("id,reservation_id,monto,moneda,metodo,referencia,fecha_pago,notas,created_at").eq("reservation_id", id).order("fecha_pago", { ascending: false }).order("created_at", { ascending: false }),
    client.from("invoices").select(invoiceFields).eq("reservation_id", id).order("created_at", { ascending: false }),
  ]);
  if (itemsResult.error || paymentsResult.error || invoicesResult.error) throw new Error("No se pudieron cargar los datos de la reserva.");
  return {
    reservation: reservationResult.data as Reservation,
    items: (itemsResult.data ?? []) as ReservationItem[],
    payments: (paymentsResult.data ?? []) as Payment[],
    invoices: (invoicesResult.data ?? []) as Invoice[],
  };
}

export async function getAdminInvoice(client: SupabaseClient, id: string) {
  const invoiceResult = await client.from("invoices").select(invoiceFields).eq("id", id).maybeSingle();
  if (invoiceResult.error || !invoiceResult.data) return null;
  const reservationResult = await client.from("reservations").select(reservationFields).eq("id", invoiceResult.data.reservation_id).maybeSingle();
  if (reservationResult.error || !reservationResult.data) return null;
  return { invoice: invoiceResult.data as Invoice, reservation: reservationResult.data as Reservation };
}

export { reservationFields, invoiceFields };
