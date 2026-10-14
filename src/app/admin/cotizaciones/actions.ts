"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminSession, requireAdmin } from "@/lib/admin";
import { getAdminQuotation, isMissingColumn, toRecord } from "@/lib/quotation-data";
import { renderQuotationPdf, quotationPdfFilename } from "@/lib/quotation-pdf";
import { loadQuotationPhotos, quotationMediaBucket } from "@/lib/quotation-media";
import { derivedTripDates, legacyValidityDate, photoPathPattern, quotationReadiness, resolveTermsApproval, sanitizeDetails, zonedToIso } from "@/lib/quotation-details";
import { parseQuotationPayload } from "@/lib/quotation-payload";
import { clean, isQuotationStatus, validUuid } from "@/lib/quotation-validation";
import { formatQuotationAmount } from "@/lib/quotation-types";
import { totalAmount } from "@/lib/money";
import { captureNotificationFailure } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";
import { customerWhatsappHref } from "@/lib/lead-admin";
import { normalizePhone } from "@/lib/lead-validation";
import { convertQuotationToReservation } from "@/app/admin/reservas/actions";

export { convertQuotationToReservation };

export type CustomerSuggestion = { id: string; nombre: string };
export type QuotationActionState = { error?: string; success?: string; whatsappUrl?: string; quotationId?: string; updatedAt?: string; conflict?: boolean; sessionExpired?: boolean; locked?: boolean; customerSuggestions?: CustomerSuggestion[] };
export type PhotoCleanupState = { error?: string; success?: string; unused?: number; checked?: number };

const schemaMissing = "Para guardar cotizaciones de vuelo, hotel o paquete, ejecute primero docs/sql/quotations_v5.sql en Supabase.";
const lockedMessage = "El cliente aceptó esta cotización: su contenido quedó bloqueado. Para cambiar precios o condiciones, cree una enmienda.";
const photoGraceDays = 7;

type DbError = { code?: string } | null | undefined;
// "Function not found" from PostgREST or Postgres: the SQL that defines it has not been run yet.
const missingFunction = (error: DbError) => error?.code === "PGRST202" || error?.code === "42883";
// check_violation raised by the database lock on accepted quotations (docs/sql/quotations_v5.sql).
const lockedByDatabase = (error: DbError) => error?.code === "23514";
const sameName = (left: string, right: string) => left.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase() === right.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

function quotationCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `COT-${date}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function refreshQuotationPaths(id?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/cotizaciones");
  if (id) revalidatePath(`/admin/cotizaciones/${id}`);
}

// Saves a draft from the editor (manual save and autosave). It never redirects: an expired session is
// reported so the editor keeps what the admin typed.
export async function saveQuotation(payloadText: string): Promise<QuotationActionState> {
  const session = await adminSession();
  if (!session) return { error: "Su sesión venció y los cambios no se guardaron. Inicie sesión en otra pestaña (/admin/login) y vuelva a presionar Guardar; no cierre esta página.", sessionExpired: true };
  const { client, user } = session;
  const parsed = parseQuotationPayload(payloadText);
  if ("error" in parsed) return { error: parsed.error };
  const { payload } = parsed;
  const { detalles } = payload;
  const now = new Date().toISOString();

  let previousApproval: (typeof detalles)["aprobacionCondiciones"] = null;
  if (payload.id) {
    let current = await client.from("quotations").select("estado,detalles").eq("id", payload.id).maybeSingle();
    if (isMissingColumn(current.error)) current = await client.from("quotations").select("estado").eq("id", payload.id).maybeSingle();
    if (current.error) return { error: "No se pudo guardar la cotización. Intente nuevamente." };
    if (!current.data) return { error: "No se encontró la cotización." };
    if (current.data.estado === "aceptada") return { error: lockedMessage, locked: true };
    previousApproval = "detalles" in current.data ? sanitizeDetails(current.data.detalles).aprobacionCondiciones : null;
  }

  // A customer record is linked only when the admin picked it, or when both e-mail and name match one
  // customer. A shared e-mail alone (a family address, an agency) is offered as a suggestion instead.
  let customerId: string | null = null;
  let customerSuggestions: CustomerSuggestion[] | undefined;
  if (payload.customerId) {
    const chosen = await client.from("customers").select("id").eq("id", payload.customerId).maybeSingle();
    if (chosen.error || !chosen.data) return { error: "El cliente seleccionado ya no existe. Búsquelo de nuevo o deje la búsqueda vacía." };
    customerId = payload.customerId;
  } else if (payload.cliente.email) {
    const matches = await client.from("customers").select("id,nombre").eq("email", payload.cliente.email).limit(5);
    if (matches.error) return { error: "No se pudo verificar el cliente. Intente nuevamente." };
    const rows = (matches.data ?? []).map(row => ({ id: String(row.id), nombre: String(row.nombre) }));
    const same = rows.filter(row => sameName(row.nombre, payload.cliente.nombre));
    if (same.length === 1) customerId = same[0].id;
    else if (rows.length) customerSuggestions = rows;
    else {
      const customer = await client.from("customers").insert({ nombre: payload.cliente.nombre, email: payload.cliente.email, telefono: payload.cliente.telefono, notas: null }).select("id").single();
      if (customer.error || !customer.data) return { error: "No se pudo crear el cliente. Revise los datos e intente nuevamente." };
      customerId = String(customer.data.id);
    }
  }

  const expiry = detalles.validez.venceEn || zonedToIso(`${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T23:59`);
  const trip = derivedTripDates(detalles);
  // agente_id is not part of an edit: the assigned advisor changes only through assignQuotationToMe.
  const base = {
    customer_id: customerId, cliente_nombre: payload.cliente.nombre, cliente_email: payload.cliente.email, cliente_telefono: payload.cliente.telefono,
    destino: payload.destino || "Por definir", moneda: payload.moneda, validez: legacyValidityDate(expiry), notas: payload.notas,
    total: totalAmount(payload.items),
  };
  const structuredDetails = { ...detalles, fechaSalida: detalles.fechaSalida || trip.salida, fechaRegreso: detalles.fechaRegreso || trip.regreso, aprobacionCondiciones: resolveTermsApproval(detalles, previousApproval, user.id, now) };
  const structured = { tipo: payload.tipo, detalles: structuredDetails, vence_en: detalles.validez.venceEn || null };
  let quotationId = payload.id;
  let updatedAt: string | undefined;

  if (quotationId) {
    let query = client.from("quotations").update({ ...base, ...structured, updated_at: now }).eq("id", quotationId);
    if (payload.expectedUpdatedAt) query = query.eq("updated_at", payload.expectedUpdatedAt);
    let saved = await query.select("id,updated_at").maybeSingle();
    if (isMissingColumn(saved.error)) {
      if (payload.tipo !== "general") return { error: schemaMissing };
      saved = await client.from("quotations").update(base).eq("id", quotationId).select("id,updated_at").maybeSingle();
    }
    if (lockedByDatabase(saved.error)) return { error: lockedMessage, locked: true };
    if (saved.error) return { error: "No se pudo guardar la cotización. Revise los datos e intente nuevamente." };
    if (!saved.data) return { error: "Otra persona u otra pestaña guardó cambios en esta cotización. Recargue la página para ver la versión más reciente antes de seguir editando.", conflict: true };
    updatedAt = String(saved.data.updated_at ?? now);
  } else {
    const token = detalles.refCreacion;
    if (token) {
      const previous = await client.from("quotations").select("id,updated_at").eq("detalles->>refCreacion", token).limit(1).maybeSingle();
      if (previous.data?.id) return { success: "Cotización guardada.", quotationId: String(previous.data.id), updatedAt: String(previous.data.updated_at ?? ""), customerSuggestions };
    }
    const created: Record<string, unknown> = { ...base, ...structured, agente_id: user.id, codigo: quotationCode(), estado: "borrador" };
    let saved = await client.from("quotations").insert(payload.leadId ? { ...created, lead_id: payload.leadId } : created).select("id,updated_at").single();
    // lead_id arrives with docs/sql/leads_contact.sql; without it the quotation is saved unlinked.
    if (saved.error && payload.leadId && isMissingColumn(saved.error)) saved = await client.from("quotations").insert(created).select("id,updated_at").single();
    if (saved.error && isMissingColumn(saved.error)) {
      if (payload.tipo !== "general") return { error: schemaMissing };
      saved = await client.from("quotations").insert({ ...base, agente_id: user.id, codigo: quotationCode(), estado: "borrador" }).select("id,updated_at").single();
    }
    if (saved.error || !saved.data) return { error: "No se pudo crear la cotización. Revise los datos e intente nuevamente." };
    quotationId = String(saved.data.id);
    updatedAt = String(saved.data.updated_at ?? now);
    if (payload.leadId) await client.from("leads").update({ estado: "contactado" }).eq("id", payload.leadId).eq("estado", "nuevo");
  }

  const itemRows = payload.items.map(item => ({ descripcion: item.descripcion, tipo: item.tipo, cantidad: item.cantidad, precio_unitario: item.precio_unitario }));
  // One transaction in the database (delete + insert + total, with the quotation row locked), so a
  // conversion or another save never sees half-replaced prices.
  const replaced = await client.rpc("replace_quotation_items", { p_quotation_id: quotationId, p_items: itemRows });
  if (lockedByDatabase(replaced.error)) return { error: lockedMessage, locked: true, quotationId, updatedAt };
  if (replaced.error && !missingFunction(replaced.error)) return { error: "La cotización se guardó, pero no se pudieron guardar sus precios. Intente nuevamente.", quotationId, updatedAt };
  if (replaced.error) {
    // Before docs/sql/quotations_v5.sql: new prices first, then the old ones, so a failure never leaves the quotation empty.
    const previousItems = await client.from("quotation_items").select("id").eq("quotation_id", quotationId);
    if (previousItems.error) return { error: "La cotización se guardó, pero no se pudieron actualizar sus precios.", quotationId, updatedAt };
    if (itemRows.length) {
      const inserted = await client.from("quotation_items").insert(itemRows.map((item, orden) => ({ ...item, quotation_id: quotationId, orden }))).select("id");
      if (inserted.error) return { error: "La cotización se guardó, pero no se pudieron guardar sus precios. Intente nuevamente.", quotationId, updatedAt };
    }
    const oldIds = (previousItems.data ?? []).map(item => String(item.id));
    if (oldIds.length) {
      const removed = await client.from("quotation_items").delete().in("id", oldIds);
      if (removed.error) return { error: "La cotización se guardó, pero quedaron precios duplicados. Revise los conceptos de precio.", quotationId, updatedAt };
    }
  }
  refreshQuotationPaths(quotationId);
  return { success: "Cotización guardada.", quotationId, updatedAt, ...(customerSuggestions ? { customerSuggestions } : {}) };
}

// "copia": a new draft to adapt for another customer or date. "enmienda": the way to change an accepted
// quotation; the original stays accepted and locked, and the amendment records which one it replaces.
// Either way the itinerary, baggage and conditions must be confirmed and approved again.
export async function duplicateQuotation(id: string, mode: "copia" | "enmienda" = "copia"): Promise<QuotationActionState> {
  const { client, user } = await requireAdmin();
  if (!validUuid(id)) return { error: "Cotización inválida." };
  const record = await getAdminQuotation(client, id);
  if (!record) return { error: "No se encontró la cotización." };
  const details = { ...record.details, vuelos: { ...record.details.vuelos, confirmado: false }, equipajeConfirmado: false, validez: { ...record.details.validez, venceEn: "", limitePago: "", limiteEmision: "" }, refCreacion: "", aprobacionCondiciones: null, enmiendaDe: mode === "enmienda" ? record.quotation.codigo : "" };
  const copy: Record<string, unknown> = {
    customer_id: record.quotation.customer_id, cliente_nombre: record.quotation.cliente_nombre, cliente_email: record.quotation.cliente_email, cliente_telefono: record.quotation.cliente_telefono,
    destino: record.quotation.destino, moneda: record.quotation.moneda, validez: legacyValidityDate(zonedToIso(`${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T23:59`)),
    notas: record.quotation.notas, total: totalAmount(record.items), agente_id: user.id, codigo: quotationCode(), estado: "borrador",
  };
  let saved = await client.from("quotations").insert(record.schemaReady ? { ...copy, tipo: record.kind, detalles: details, vence_en: null } : copy).select("id").single();
  if (saved.error && isMissingColumn(saved.error)) saved = await client.from("quotations").insert(copy).select("id").single();
  if (saved.error || !saved.data) return { error: "No se pudo crear la copia." };
  const newId = String(saved.data.id);
  if (record.items.length) {
    const items = await client.from("quotation_items").insert(record.items.map((item, orden) => ({ quotation_id: newId, descripcion: item.descripcion, tipo: item.tipo, cantidad: item.cantidad, precio_unitario: item.precio_unitario, orden })));
    if (items.error) {
      await client.from("quotations").delete().eq("id", newId);
      return { error: "No se pudo crear la copia." };
    }
  }
  refreshQuotationPaths(newId);
  redirect(`/admin/cotizaciones/${newId}?${mode === "enmienda" ? "enmienda" : "duplicada"}=1`);
}

// The only way the assigned advisor changes: an admin explicitly takes the quotation.
export async function assignQuotationToMe(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client, user } = await requireAdmin();
  const id = clean(form.get("id"));
  if (!validUuid(id)) return { error: "Cotización inválida." };
  const result = await client.from("quotations").update({ agente_id: user.id }).eq("id", id).select("id").single();
  if (result.error || !result.data) return { error: "No se pudo asignar la cotización." };
  refreshQuotationPaths(id);
  return { success: "La cotización quedó asignada a usted." };
}

// Marking a quotation accepted records which sent version the customer accepted: the reservation is
// later created from that frozen copy, and the content stays locked while it is accepted.
export async function updateQuotationStatus(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id"));
  const status = clean(form.get("estado"));
  if (!validUuid(id) || !isQuotationStatus(status) || !["aceptada", "rechazada", "expirada"].includes(status)) return { error: "Seleccione un estado válido." };
  if (status !== "aceptada") {
    const reservation = await client.from("reservations").select("id").eq("quotation_id", id).limit(1).maybeSingle();
    if (reservation.data) return { error: "Esta cotización ya se convirtió en reserva; su estado no se puede cambiar." };
  }
  let accepted: number | null = null;
  if (status === "aceptada") {
    const latest = await client.from("quotation_versions").select("version").eq("quotation_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
    accepted = latest.error || !latest.data ? null : Number(latest.data.version);
  }
  let result = await client.from("quotations").update({ estado: status, version_aceptada: accepted }).eq("id", id).select("id").single();
  if (isMissingColumn(result.error)) result = await client.from("quotations").update({ estado: status }).eq("id", id).select("id").single();
  if (result.error || !result.data) return { error: "No se pudo actualizar el estado." };
  refreshQuotationPaths(id);
  return { success: accepted ? `Aceptada: se registró la versión ${accepted} enviada al cliente.` : "Estado actualizado." };
}

// Sending freezes an immutable version (quotation_versions) and e-mails the PDF rendered from it. The
// e-mail is only sent when the quotation is complete, its conditions are approved and it is still valid.
export async function sendQuotation(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client, user } = await requireAdmin();
  const id = clean(form.get("id"));
  if (!validUuid(id)) return { error: "Cotización inválida." };
  const record = await getAdminQuotation(client, id);
  if (!record) return { error: "No se encontró la cotización." };
  const { quotation } = record;
  if (quotation.estado === "aceptada") return { error: "El cliente ya aceptó esta cotización. Para enviar cambios, cree una enmienda." };
  if (!quotation.cliente_email || !quotation.cliente_email.includes("@")) return { error: "La cotización no tiene un correo electrónico válido." };
  const blocking = record.schemaReady ? quotationReadiness(record.kind, record.details, record.items).filter(issue => issue.nivel === "error") : [];
  if (!record.schemaReady && !record.items.length) blocking.push({ nivel: "error", seccion: "precio", mensaje: "Agregue al menos un concepto de precio." });
  if (blocking.length) return { error: `Antes de enviar: ${blocking.map(issue => issue.mensaje).join(" ")}` };
  if (!process.env.RESEND_API_KEY) return { error: "El envío de correo no está configurado." };

  let versionNumber: number | undefined;
  let snapshotRecord = record;
  if (record.schemaReady) {
    // The next number comes from the versions themselves, so a failed counter update can never block later sends.
    const latest = await client.from("quotation_versions").select("version").eq("quotation_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
    if (latest.error && !isMissingColumn(latest.error) && latest.error.code !== "42P01") return { error: "No se pudo preparar la versión de la cotización. Intente nuevamente." };
    versionNumber = Math.max(Number(quotation.version ?? 0), Number(latest.data?.version ?? 0)) + 1;
    const row = { ...quotation, version: versionNumber };
    const snapshot = { quotation: row, items: record.items, emitida_en: new Date().toISOString() };
    const version = await client.from("quotation_versions").insert({ quotation_id: id, version: versionNumber, snapshot, emitida_por: user.id }).select("id").single();
    if (version.error?.code === "23505") return { error: "Se registró otra versión al mismo tiempo. Recargue la página e intente nuevamente." };
    if (version.error) return { error: isMissingColumn(version.error) || version.error.code === "42P01" ? schemaMissing : "No se pudo registrar la versión de la cotización. Intente nuevamente." };
    await client.from("quotations").update({ version: versionNumber }).eq("id", id);
    snapshotRecord = toRecord(row, record.items, true);
  }
  try {
    const photos = await loadQuotationPhotos(client, snapshotRecord.details);
    const pdf = await renderQuotationPdf(snapshotRecord, { photos, versionNumber });
    const total = formatQuotationAmount(Number(quotation.total), quotation.moneda);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `quotation/${id}/v${versionNumber ?? 0}` },
      body: JSON.stringify({ from: siteConfig.supportEmail, to: [quotation.cliente_email], reply_to: siteConfig.supportEmail, subject: `Su cotización ${quotation.codigo} | viatour`, text: `Estimado cliente:\n\nLe compartimos su cotización de viatour en el archivo adjunto. Los precios son referenciales y están sujetos a confirmación.\n\nCódigo: ${quotation.codigo}\nDestino: ${quotation.destino}\nTotal referencial: ${total}\n\nSi desea revisar algún detalle, comuníquese con su asesor por WhatsApp al +504 8866-8704.\n\nSaludos,\nviatour | asesores de viaje`, attachments: [{ filename: quotationPdfFilename(snapshotRecord, versionNumber), content: pdf.toString("base64") }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
  } catch (error) {
    captureNotificationFailure("quotation", id, error);
    return { error: `No se pudo enviar el correo.${versionNumber ? ` La versión ${versionNumber} quedó registrada; puede reenviarla.` : " La cotización se conservó sin cambios."}` };
  }
  const updated = await client.from("quotations").update({ estado: "enviada" }).eq("id", id).select("id").single();
  if (updated.error || !updated.data) return { error: "El correo se envió, pero no se pudo actualizar el estado. Revise la cotización antes de reenviar." };
  refreshQuotationPaths(id);
  const message = `Hola, le comparto la cotización ${quotation.codigo} de viatour para ${quotation.destino}. Total referencial: ${formatQuotationAmount(Number(quotation.total), quotation.moneda)}.`;
  // The share link opens a chat with the customer; it is omitted when there is no usable phone.
  const whatsappUrl = customerWhatsappHref(normalizePhone(quotation.cliente_telefono ?? "") || quotation.cliente_telefono || "", message);
  return { success: versionNumber ? `Versión ${versionNumber} enviada al correo del cliente.` : "Cotización enviada al correo del cliente.", ...(whatsappUrl ? { whatsappUrl } : {}) };
}

// Hotel photos nobody uses any more: uploaded more than 7 days ago and absent from every quotation and
// every sent version. The storage policy re-checks the same rule in the database on each deletion, so
// a bug here cannot remove a photo that is still in use.
export async function cleanupUnusedHotelPhotos(_: PhotoCleanupState, form: FormData): Promise<PhotoCleanupState> {
  const { client } = await requireAdmin();
  const remove = clean(form.get("accion")) === "eliminar";
  const storage = client.storage.from(quotationMediaBucket);
  const files: { path: string; created: number }[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const page = await storage.list("hotel", { limit: 1000, offset, sortBy: { column: "created_at", order: "asc" } });
    if (page.error) return { error: "No se pudieron revisar las fotos. Si es la primera vez, ejecute docs/sql/quotations_v5.sql." };
    for (const file of page.data ?? []) files.push({ path: `hotel/${file.name}`, created: Date.parse(String(file.created_at ?? "")) });
    if ((page.data ?? []).length < 1000) break;
  }
  const [quotations, versions] = await Promise.all([
    client.from("quotations").select("detalles").limit(20000),
    client.from("quotation_versions").select("snapshot").limit(20000),
  ]);
  if (quotations.error || versions.error) return { error: "No se pudieron revisar las cotizaciones. Intente nuevamente." };
  const used = new Set(`${JSON.stringify(quotations.data ?? [])}${JSON.stringify(versions.data ?? [])}`.match(/hotel\/[0-9a-f]{32}\.jpg/g) ?? []);
  const cutoff = Date.now() - photoGraceDays * 86400000;
  const unused = files.filter(file => photoPathPattern.test(file.path) && !used.has(file.path) && Number.isFinite(file.created) && file.created < cutoff).map(file => file.path);
  if (!remove) return { unused: unused.length, checked: files.length };
  let deleted = 0;
  for (let index = 0; index < unused.length; index += 100) {
    const result = await storage.remove(unused.slice(index, index + 100));
    if (result.error) return { error: `Se eliminaron ${deleted} fotos; las demás no se pudieron eliminar.`, unused: unused.length - deleted, checked: files.length };
    deleted += (result.data ?? []).length;
  }
  return { success: `Se eliminaron ${deleted} ${deleted === 1 ? "foto sin uso" : "fotos sin uso"}.`, unused: unused.length - deleted, checked: files.length };
}
