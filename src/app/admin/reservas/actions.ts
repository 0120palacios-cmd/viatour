"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getAdminInvoice, getAdminReservation } from "@/lib/reservation-data";
import { invoiceStatuses, paymentMethods, reservationStatuses } from "@/lib/reservation-types";
import { validUuid } from "@/lib/quotation-validation";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { siteConfig } from "@/lib/site-config";
import { captureNotificationFailure } from "@/lib/notifications";
import { customerWhatsappHref } from "@/lib/lead-admin";
import { leadSegments, normalizePhone } from "@/lib/lead-validation";
import { commercialError } from "@/lib/commercial-errors";
import { emptyTravel,validateTravel,publicTravel } from "@/lib/travel-operations";
import { sealTravel } from "@/lib/travel-vault";
import { hondurasToday } from "@/lib/portal-summary";

export type ReservationActionState = { error?: string; success?: string; reservationId?: string };
export type InvoiceActionState = { error?: string; success?: string; whatsappUrl?: string; invoiceId?: string };

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const amountPattern = /^\d+(\.\d{1,2})?$/;

function refreshReservationPaths(id?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/facturacion");
  if (id) {
    revalidatePath(`/admin/reservas/${id}`);
    revalidatePath(`/admin/facturacion/${id}`);
  }
}

function parseItems(form: FormData) {
  const descriptions = form.getAll("item_descripcion").map(String);
  const types = form.getAll("item_tipo").map(String);
  const quantities = form.getAll("item_cantidad").map(String);
  const prices = form.getAll("item_precio_unitario").map(String);
  if (!descriptions.length || descriptions.length > 50 || types.length !== descriptions.length || quantities.length !== descriptions.length || prices.length !== descriptions.length) return { error: "Agregue al menos un ítem y revise sus datos." } as const;
  const items = [];
  for (let index = 0; index < descriptions.length; index += 1) {
    const descripcion = descriptions[index].trim();
    const tipo = types[index].trim();
    const cantidad = Number(quantities[index]);
    const precio_unitario = Number(prices[index]);
    if (!descripcion || descripcion.length > 500 || !tipo || tipo.length > 80 || !amountPattern.test(quantities[index]) || !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 100000 || !amountPattern.test(prices[index]) || !Number.isFinite(precio_unitario) || precio_unitario < 0 || precio_unitario > 100000000) return { error: "Revise la descripción, tipo, cantidad y precio de cada ítem." } as const;
    items.push({ descripcion, tipo, cantidad, precio_unitario, orden: index });
  }
  return { items } as const;
}

// Creates the reservation from what the customer accepted: the frozen copy of the accepted sent version
// when there is one (quotations_v5), otherwise the quotation's current prices, which the database keeps
// locked while it is accepted. One reservation per quotation: a second click opens the existing one.
export async function convertQuotationToReservation(_: ReservationActionState, form: FormData): Promise<ReservationActionState> {
  const { client } = await requireAdmin();
  const quotationId = clean(form.get("quotation_id")), versionId = clean(form.get("version_id")), mode = clean(form.get("modo"));
  if (!validUuid(quotationId) || !validUuid(versionId) || !["prerreserva", "reserva"].includes(mode) || form.get("confirmado") !== "si") return { error: "Revise la versión y confirme la conversión." };
  const args = { p_id: quotationId, p_version_id: versionId, p_prereservation: mode === "prerreserva", p_lastname: clean(form.get("apellido")) };
  const passengers = form.get("passengers");
  let travelArgs;
  if (passengers) {
    try { if(String(passengers).length>100000)throw Error("Revise los pasajeros.");const travel=validateTravel({...emptyTravel(),passengers:JSON.parse(String(passengers))});travelArgs={...args,p_public:publicTravel(travel),p_encrypted:sealTravel(travel,quotationId)}; }
    catch { return {error:"No se pudieron validar o cifrar los pasajeros. Revise sus datos y la configuración de cifrado."}; }
  }
  const result = travelArgs ? await client.rpc("convert_quotation_with_passengers",travelArgs) : await client.rpc("convert_accepted_quotation", args);
  if (result.error || !result.data) return { error: commercialError(result.error) };
  refreshReservationPaths(String(result.data));
  revalidatePath(`/admin/cotizaciones/${quotationId}`);
  redirect(`/admin/reservas/${result.data}`);
}

export async function promoteReservation(_: ReservationActionState, form: FormData): Promise<ReservationActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  if (!validUuid(id)) return { error: "Reserva inválida." };
  const result = await client.from("reservations").update({ prerreserva: false }).eq("id", id).eq("prerreserva", true).eq("estado", "pendiente").select("id").single();
  if (result.error) return { error: commercialError(result.error) };
  refreshReservationPaths(id);
  return { success: "Prerreservación convertida en reserva. La confirmación del proveedor se registra por separado." };
}

export async function saveReservation(_: ReservationActionState, form: FormData): Promise<ReservationActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  const estado = clean(form.get("estado"));
  const fecha_inicio = clean(form.get("fecha_inicio"));
  const fecha_fin = clean(form.get("fecha_fin"));
  const notas = clean(form.get("notas"));
  if (!validUuid(id) || !reservationStatuses.includes(estado as never) || notas.length > 5000 || (fecha_inicio && !datePattern.test(fecha_inicio)) || (fecha_fin && !datePattern.test(fecha_fin))) return { error: "Revise el estado, las fechas y las notas de la reserva." };
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) return { error: "La fecha final no puede ser anterior a la fecha inicial." };
  const current = await getAdminReservation(client, id);
  if (!current) return { error: "Reserva no encontrada." };
  // Cancelling records a reason and reviews money and documents: it only happens in «Cancelar reserva».
  if (estado === "cancelada" && current.reservation.estado !== "cancelada") return { error: "Para cancelar la reserva use «Cancelar reserva»: registra el motivo y revisa pagos y facturas." };
  const comision = clean(form.get("comision")), segmento = clean(form.get("segmento"));
  if (comision && (!amountPattern.test(comision) || Number(comision) > 10000000)) return { error: "Revise la comisión." };
  if (segmento && !leadSegments.includes(segmento as never)) return { error: "Segmento inválido." };
  const supplier = clean(form.get("supplier_status")) || current.reservation.supplier_status || "pendiente";
  const reference = clean(form.get("supplier_reference"));
  if (!["pendiente", "parcial", "confirmada", "emitida"].includes(supplier) || reference.length > 500) return { error: "Revise la confirmación del proveedor." };
  const parsed = current.reservation.accepted_version_id ? { items: [] } : parseItems(form);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  const result = await client.rpc("save_reservation_record", { p_id: id, p_values: { estado, fecha_inicio, fecha_fin, notas, comision, segmento, supplier_status: supplier, supplier_reference: reference }, p_items: parsed.items });
  if (result.error) return { error: commercialError(result.error) };
  refreshReservationPaths(id);
  return { success: "Reserva guardada. Los importes aceptados se conservaron.", reservationId: id };
}

export async function recordPayment(_: ReservationActionState, form: FormData): Promise<ReservationActionState> {
  const { client } = await requireAdmin();
  const reservationId = clean(form.get("reservation_id"));
  const monto = clean(form.get("monto"));
  const moneda = clean(form.get("moneda"));
  const metodo = clean(form.get("metodo"));
  const referencia = clean(form.get("referencia"));
  const fecha_pago = clean(form.get("fecha_pago"));
  const notas = clean(form.get("notas"));
  if (!validUuid(reservationId) || !amountPattern.test(monto) || Number(monto) <= 0 || !["USD", "HNL"].includes(moneda) || !paymentMethods.includes(metodo as never) || !datePattern.test(fecha_pago) || referencia.length > 200 || notas.length > 5000) return { error: "Revise los datos del pago." };
  const paymentDay = new Date(`${fecha_pago}T00:00:00Z`);
  if (!Number.isFinite(paymentDay.getTime()) || paymentDay.toISOString().slice(0, 10) !== fecha_pago || fecha_pago > hondurasToday()) return { error: "Registre una fecha válida de un pago ya recibido; no se permiten fechas futuras." };
  const reservation = await client.from("reservations").select("id,moneda").eq("id", reservationId).maybeSingle();
  if (reservation.error || !reservation.data) return { error: "No se encontró la reserva." };
  if (reservation.data.moneda !== moneda) return { error: "La moneda del pago debe coincidir con la moneda de la reserva." };
  const requestId = clean(form.get("request_id"));
  if (!validUuid(requestId)) return { error: "Recargue el formulario para iniciar un registro de pago seguro." };
  const result = await client.rpc("record_reservation_payment", { p_request: requestId, p_reservation: reservationId, p_amount: Number(monto), p_currency: moneda, p_method: metodo, p_date: fecha_pago, p_reference: referencia || null, p_notes: notas || null });
  if (result.error || !result.data) return { error: "No se confirmó el pago. Reintente con los mismos datos; si cambió el contenido de un intento ya registrado, revise el historial antes de iniciar otro pago." };
  refreshReservationPaths(reservationId);
  return { success: "Pago registrado." };
}

export async function createInvoice(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const { client } = await requireAdmin();
  const reservationId = clean(form.get("reservation_id"));
  const fecha_vencimiento = clean(form.get("fecha_vencimiento"));
  if (!validUuid(reservationId) || !datePattern.test(fecha_vencimiento)) return { error: "Ingrese una fecha de vencimiento válida." };
  const result = await client.rpc("create_reservation_invoice", { p_id: reservationId, p_due: fecha_vencimiento });
  if (result.error || !result.data) return { error: commercialError(result.error) };
  refreshReservationPaths(reservationId);
  return { success: "Factura disponible.", invoiceId: String(result.data) };
}

export async function updateInvoiceStatus(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  const estado = clean(form.get("estado"));
  if (!validUuid(id) || !invoiceStatuses.includes(estado as never)) return { error: "Seleccione un estado válido." };
  const result = await client.from("invoices").update({ estado }).eq("id", id).select("id,reservation_id").single();
  if (result.error || !result.data) return { error: commercialError(result.error) };
  refreshReservationPaths(String(result.data.reservation_id));
  revalidatePath(`/admin/facturacion/${id}`);
  return { success: "Estado actualizado." };
}

export async function sendInvoice(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  if (!validUuid(id)) return { error: "Factura inválida." };
  const record = await getAdminInvoice(client, id);
  if (!record) return { error: "No se encontró la factura." };
  if (record.invoice.estado === "anulada") return { error: "No se puede enviar una factura anulada." };
  if (!record.invoice.cliente_email || !record.invoice.cliente_email.includes("@")) return { error: "La factura no tiene un correo electrónico válido." };
  if (!process.env.RESEND_API_KEY) return { error: "El envío de correo no está configurado." };
  try {
    const pdf = await renderInvoicePdf(record.invoice);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `invoice/${id}` },
      body: JSON.stringify({ from: siteConfig.supportEmail, to: [record.invoice.cliente_email], reply_to: siteConfig.supportEmail, subject: `Su factura ${record.invoice.numero} | viatour`, text: `Estimado cliente:\n\nLe compartimos su factura de viatour en el archivo adjunto.\n\nNúmero: ${record.invoice.numero}\nTotal: ${record.invoice.total} ${record.invoice.moneda}\n\nSi desea revisar algún detalle, comuníquese con su asesor por WhatsApp al +504 8866-8704.\n\nSaludos,\nviatour | asesores de viaje`, attachments: [{ filename: `factura-${record.invoice.numero}.pdf`, content: pdf.toString("base64") }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
  } catch (error) {
    captureNotificationFailure("invoice", id, error);
    return { error: "No se pudo enviar el correo. La factura se conservó sin cambios." };
  }
  const updated = await client.from("invoices").update({ estado: record.invoice.estado === "pagada" ? "pagada" : "emitida" }).eq("id", id).select("id,reservation_id").single();
  if (updated.error || !updated.data) return { error: "El correo se envió, pero no se pudo actualizar el estado de la factura." };
  refreshReservationPaths(String(updated.data.reservation_id));
  const message = `Hola, le comparto la factura ${record.invoice.numero} de viatour. Total: ${record.invoice.total} ${record.invoice.moneda}.`;
  const whatsappUrl = customerWhatsappHref(normalizePhone(record.invoice.cliente_telefono ?? "") || record.invoice.cliente_telefono || "", message);
  return { success: "Factura enviada al correo del cliente.", invoiceId: id, ...(whatsappUrl ? { whatsappUrl } : {}) };
}
