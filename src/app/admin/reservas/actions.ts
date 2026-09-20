"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getAdminInvoice, getAdminReservation } from "@/lib/reservation-data";
import { invoiceStatuses, paymentMethods, reservationStatuses } from "@/lib/reservation-types";
import { validUuid } from "@/lib/quotation-validation";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { siteConfig } from "@/lib/site-config";

export type ReservationActionState = { error?: string; success?: string; reservationId?: string };
export type InvoiceActionState = { error?: string; success?: string; whatsappUrl?: string; invoiceId?: string };

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const amountPattern = /^\d+(\.\d{1,2})?$/;

function code(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

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

export async function convertQuotationToReservation(_: ReservationActionState, form: FormData): Promise<ReservationActionState> {
  const { client, user } = await requireAdmin();
  const quotationId = clean(form.get("quotation_id"));
  if (!validUuid(quotationId)) return { error: "Cotización inválida." };
  const quotationResult = await client.from("quotations").select("id,customer_id,cliente_nombre,cliente_email,cliente_telefono,destino,moneda,total,estado,notas").eq("id", quotationId).maybeSingle();
  if (quotationResult.error || !quotationResult.data) return { error: "No se encontró la cotización." };
  if (quotationResult.data.estado !== "aceptada") return { error: "Solo se puede convertir una cotización aceptada." };
  const itemsResult = await client.from("quotation_items").select("descripcion,tipo,cantidad,precio_unitario,orden").eq("quotation_id", quotationId).order("orden", { ascending: true });
  if (itemsResult.error || !itemsResult.data?.length) return { error: "La cotización no tiene ítems para convertir." };
  const reservation = await client.from("reservations").insert({
    codigo: code("RES"), quotation_id: quotationId, customer_id: quotationResult.data.customer_id,
    cliente_nombre: quotationResult.data.cliente_nombre, cliente_email: quotationResult.data.cliente_email,
    cliente_telefono: quotationResult.data.cliente_telefono, destino: quotationResult.data.destino,
    moneda: quotationResult.data.moneda, total: quotationResult.data.total, estado: "pendiente",
    fecha_inicio: null, fecha_fin: null, notas: quotationResult.data.notas, agente_id: user.id,
  }).select("id").single();
  if (reservation.error || !reservation.data) return { error: "No se pudo crear la reserva." };
  const reservationId = String(reservation.data.id);
  const items = await client.from("reservation_items").insert(itemsResult.data.map(item => ({ ...item, reservation_id: reservationId })));
  if (items.error) {
    await client.from("reservations").delete().eq("id", reservationId);
    return { error: "La reserva se creó, pero no se pudieron copiar sus ítems." };
  }
  refreshReservationPaths(reservationId);
  redirect(`/admin/reservas/${reservationId}`);
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
  const parsed = parseItems(form);
  if (parsed.error) return parsed;
  const total = parsed.items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  const updated = await client.from("reservations").update({ estado, fecha_inicio: fecha_inicio || null, fecha_fin: fecha_fin || null, notas: notas || null, total: Number(total.toFixed(2)) }).eq("id", id).select("id").single();
  if (updated.error || !updated.data) return { error: "No se pudo actualizar la reserva." };
  const removed = await client.from("reservation_items").delete().eq("reservation_id", id);
  if (removed.error) return { error: "La reserva se actualizó, pero no se pudieron actualizar sus ítems." };
  const inserted = await client.from("reservation_items").insert(parsed.items.map(item => ({ ...item, reservation_id: id })));
  if (inserted.error) return { error: "La reserva se actualizó, pero no se pudieron guardar sus ítems." };
  refreshReservationPaths(id);
  return { success: "Reserva guardada.", reservationId: id };
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
  const reservation = await client.from("reservations").select("id,moneda").eq("id", reservationId).maybeSingle();
  if (reservation.error || !reservation.data) return { error: "No se encontró la reserva." };
  if (reservation.data.moneda !== moneda) return { error: "La moneda del pago debe coincidir con la moneda de la reserva." };
  const result = await client.from("payments").insert({ reservation_id: reservationId, monto: Number(monto), moneda, metodo, referencia: referencia || null, fecha_pago, notas: notas || null }).select("id").single();
  if (result.error || !result.data) return { error: "No se pudo registrar el pago." };
  refreshReservationPaths(reservationId);
  return { success: "Pago registrado." };
}

export async function createInvoice(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const { client } = await requireAdmin();
  const reservationId = clean(form.get("reservation_id"));
  const fecha_vencimiento = clean(form.get("fecha_vencimiento"));
  if (!validUuid(reservationId) || !datePattern.test(fecha_vencimiento)) return { error: "Ingrese una fecha de vencimiento válida." };
  const record = await getAdminReservation(client, reservationId);
  if (!record || !record.items.length) return { error: "No se encontró la reserva o no tiene ítems." };
  const result = await client.from("invoices").insert({
    reservation_id: reservationId, numero: code("FAC"), cliente_nombre: record.reservation.cliente_nombre,
    cliente_email: record.reservation.cliente_email, cliente_telefono: record.reservation.cliente_telefono,
    items: record.items, total: record.reservation.total, moneda: record.reservation.moneda,
    fecha_emision: new Date().toISOString().slice(0, 10), fecha_vencimiento, estado: "borrador", notas: record.reservation.notas,
  }).select("id").single();
  if (result.error || !result.data) return { error: "No se pudo crear la factura." };
  refreshReservationPaths(reservationId);
  return { success: "Factura creada.", invoiceId: String(result.data.id) };
}

export async function updateInvoiceStatus(_: InvoiceActionState, form: FormData): Promise<InvoiceActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  const estado = clean(form.get("estado"));
  if (!validUuid(id) || !invoiceStatuses.includes(estado as never)) return { error: "Seleccione un estado válido." };
  const result = await client.from("invoices").update({ estado }).eq("id", id).select("id,reservation_id").single();
  if (result.error || !result.data) return { error: "No se pudo actualizar el estado de la factura." };
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
    console.error("Invoice email failed", { invoiceId: id, error: error instanceof Error ? error.message : "Unknown error" });
    return { error: "No se pudo enviar el correo. La factura se conservó sin cambios." };
  }
  const updated = await client.from("invoices").update({ estado: "emitida" }).eq("id", id).select("id,reservation_id").single();
  if (updated.error || !updated.data) return { error: "El correo se envió, pero no se pudo actualizar el estado de la factura." };
  refreshReservationPaths(String(updated.data.reservation_id));
  const message = `Hola, le comparto la factura ${record.invoice.numero} de viatour. Total: ${record.invoice.total} ${record.invoice.moneda}.`;
  return { success: "Factura enviada al correo del cliente.", invoiceId: id, whatsappUrl: `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}` };
}
