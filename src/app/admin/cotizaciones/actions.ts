"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getAdminQuotation } from "@/lib/quotation-data";
import { renderQuotationPdf } from "@/lib/quotation-pdf";
import { clean, isQuotationStatus, validUuid, validateQuotationFields } from "@/lib/quotation-validation";
import { siteConfig } from "@/lib/site-config";
import { convertQuotationToReservation } from "@/app/admin/reservas/actions";

export { convertQuotationToReservation };

export type QuotationActionState = { error?: string; success?: string; whatsappUrl?: string; quotationId?: string };

function quotationCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `COT-${date}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function refreshQuotationPaths(id?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/cotizaciones");
  if (id) revalidatePath(`/admin/cotizaciones/${id}`);
}

export async function saveQuotation(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client, user } = await requireAdmin();
  const id = clean(form.get("id"));
  if (id && !validUuid(id)) return { error: "Cotización inválida." };
  const result = validateQuotationFields(form);
  if (result.error) return result;
  const { values, items } = result;
  let customerId = values.customer_id;
  if (!customerId) {
    const customer = await client.from("customers").insert({ nombre: values.cliente_nombre, email: values.cliente_email, telefono: values.cliente_telefono, notas: null }).select("id").single();
    if (customer.error || !customer.data) return { error: "No se pudo crear el cliente. Revise los datos e intente nuevamente." };
    customerId = customer.data.id;
  }
  const total = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  const quoteValues = { customer_id: customerId, cliente_nombre: values.cliente_nombre, cliente_email: values.cliente_email, cliente_telefono: values.cliente_telefono, destino: values.destino, moneda: values.moneda, validez: values.validez, notas: values.notas, total: Number(total.toFixed(2)), agente_id: user.id };
  let saved;
  if (id) {
    saved = await client.from("quotations").update(quoteValues).eq("id", id).select("id").single();
  } else {
    saved = await client.from("quotations").insert({ ...quoteValues, codigo: quotationCode(), estado: "borrador" }).select("id").single();
  }
  if (saved.error || !saved.data) return { error: "No se pudo guardar la cotización. Revise los datos e intente nuevamente." };
  const quotationId = String(saved.data.id);
  const removed = await client.from("quotation_items").delete().eq("quotation_id", quotationId);
  if (removed.error) return { error: "La cotización se guardó, pero no se pudieron actualizar sus ítems." };
  const inserted = await client.from("quotation_items").insert(items.map(item => ({ quotation_id: quotationId, descripcion: item.descripcion, tipo: item.tipo, cantidad: item.cantidad, precio_unitario: item.precio_unitario, orden: item.orden })));
  if (inserted.error) return { error: "La cotización se guardó, pero no se pudieron guardar sus ítems." };
  refreshQuotationPaths(quotationId);
  return { success: "Cotización guardada.", quotationId };
}

export async function updateQuotationStatus(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  const status = clean(form.get("estado"));
  if (!validUuid(id) || !isQuotationStatus(status) || !["aceptada", "rechazada", "expirada"].includes(status)) return { error: "Seleccione un estado válido." };
  const result = await client.from("quotations").update({ estado: status }).eq("id", id).select("id").single();
  if (result.error || !result.data) return { error: "No se pudo actualizar el estado." };
  refreshQuotationPaths(id);
  return { success: "Estado actualizado." };
}

export async function sendQuotation(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  if (!validUuid(id)) return { error: "Cotización inválida." };
  const record = await getAdminQuotation(client, id);
  if (!record) return { error: "No se encontró la cotización." };
  if (!record.quotation.cliente_email || !record.quotation.cliente_email.includes("@")) return { error: "La cotización no tiene un correo electrónico válido." };
  if (!process.env.RESEND_API_KEY) return { error: "El envío de correo no está configurado." };
  try {
    const pdf = await renderQuotationPdf(record.quotation, record.items);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `quotation/${id}` },
      body: JSON.stringify({ from: siteConfig.supportEmail, to: [record.quotation.cliente_email], reply_to: siteConfig.supportEmail, subject: `Su cotización ${record.quotation.codigo} | viatour`, text: `Estimado cliente:\n\nLe compartimos su cotización de viatour en el archivo adjunto. Los precios son referenciales y están sujetos a confirmación.\n\nCódigo: ${record.quotation.codigo}\nDestino: ${record.quotation.destino}\nTotal referencial: ${record.quotation.total} ${record.quotation.moneda}\n\nSi desea revisar algún detalle, comuníquese con su asesor por WhatsApp al +504 8866-8704.\n\nSaludos,\nviatour | asesores de viaje`, attachments: [{ filename: `cotizacion-${record.quotation.codigo}.pdf`, content: pdf.toString("base64") }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
  } catch (error) {
    console.error("Quotation email failed", { quotationId: id, error: error instanceof Error ? error.message : "Unknown error" });
    return { error: "No se pudo enviar el correo. La cotización se conservó sin cambios." };
  }
  const updated = await client.from("quotations").update({ estado: "enviada" }).eq("id", id).select("id").single();
  if (updated.error || !updated.data) return { error: "El correo se envió, pero no se pudo actualizar el estado. Revise la cotización antes de reenviar." };
  refreshQuotationPaths(id);
  const message = `Hola, le comparto la cotización ${record.quotation.codigo} de viatour para ${record.quotation.destino}. Total referencial: ${record.quotation.total} ${record.quotation.moneda}.`;
  return { success: "Cotización enviada al correo del cliente.", whatsappUrl: `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}` };
}
