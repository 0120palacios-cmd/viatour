"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { composeShareMessage, linkPlaceholder, maxShareMessage, newShareToken, shareExpiry, shareOrigin, shareTemplate } from "@/lib/quotation-share";
import { revalidatePath } from "next/cache";
import { adminSession, requireAdmin } from "@/lib/admin";
import { getAdminQuotation, getQuotationVersion, isMissingColumn, toRecord } from "@/lib/quotation-data";
import { isMissingTable } from "@/lib/catalog";
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
import { commercialError } from "@/lib/commercial-errors";
import { convertQuotationToReservation } from "@/app/admin/reservas/actions";

export { convertQuotationToReservation };

export type CustomerSuggestion = { id: string; nombre: string };
export type QuotationActionState = { error?: string; success?: string; whatsappUrl?: string; versionPdf?: string; quotationId?: string; updatedAt?: string; conflict?: boolean; sessionExpired?: boolean; locked?: boolean; customerSuggestions?: CustomerSuggestion[] };
export type PhotoCleanupState = { error?: string; success?: string; unused?: number; checked?: number };

const schemaMissing = "Para guardar cotizaciones de vuelo, hotel o paquete, ejecute primero docs/sql/quotations_v5.sql en Supabase.";
const lockedMessage = "El cliente aceptó esta cotización: su contenido quedó bloqueado. Para cambiar precios o condiciones, cree una enmienda.";
const photoGraceDays = 7;

type DbError = { code?: string; message?: string } | null | undefined;
// "Function not found" from PostgREST or Postgres: the SQL that defines it has not been run yet.
const missingFunction = (error: DbError) => error?.code === "PGRST202" || error?.code === "42883";
// The 'combinado' type arrives with docs/sql/quotations_v6.sql; before it, the tipo check rejects it.
const packageSchemaMissing = (error: DbError) => error?.code === "23514" && /quotations_tipo_check/.test(error?.message ?? "");
const packageSchemaMessage = "Para guardar paquetes combinados, ejecute primero docs/sql/quotations_v6.sql en Supabase.";
// check_violation raised by the database lock on accepted quotations (docs/sql/quotations_v5.sql).
const lockedByDatabase = (error: DbError) => error?.code === "23514" && !packageSchemaMissing(error);
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
  } else if (normalizePhone(payload.cliente.telefono ?? "")) {
    // WhatsApp-only customers: the same rule with the phone number (compared in E.164), so the
    // quotation has a customer to convert into a reservation.
    const phone = normalizePhone(payload.cliente.telefono ?? "");
    const local = phone.slice(-8);
    const matches = await client.from("customers").select("id,nombre,telefono").ilike("telefono", `%${local.slice(0, 4)}%${local.slice(4)}%`).limit(10);
    if (matches.error) return { error: "No se pudo verificar el cliente. Intente nuevamente." };
    const rows = (matches.data ?? []).filter(row => normalizePhone(String(row.telefono ?? "")) === phone).map(row => ({ id: String(row.id), nombre: String(row.nombre) }));
    const same = rows.filter(row => sameName(row.nombre, payload.cliente.nombre));
    if (same.length === 1) customerId = same[0].id;
    else if (rows.length) customerSuggestions = rows;
    else {
      const customer = await client.from("customers").insert({ nombre: payload.cliente.nombre, email: null, telefono: phone, notas: null }).select("id").single();
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
    if (packageSchemaMissing(saved.error)) return { error: packageSchemaMessage };
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
    if (packageSchemaMissing(saved.error)) return { error: packageSchemaMessage };
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
// quotation; the original stays accepted and locked until the amendment is accepted, which replaces it (and
// moves its reservation) in the database. Either way the itinerary, baggage and conditions must be confirmed
// and approved again. The copy and its price lines are created in one transaction (create_quotation_copy).
export async function duplicateQuotation(id: string, mode: "copia" | "enmienda" = "copia"): Promise<QuotationActionState> {
  const { client } = await requireAdmin();
  if (!validUuid(id)) return { error: "Cotización inválida." };
  let record = await getAdminQuotation(client, id);
  if (!record) return { error: "No se encontró la cotización." };
  if (mode === "enmienda" && record.quotation.estado === "aceptada") {
    const accepted = await client.from("quotations").select("version_aceptada").eq("id", id).single();
    if (!accepted.data?.version_aceptada) return { error: "Revise la versión aceptada antes de crear una enmienda." };
    record = await getQuotationVersion(client, id, Number(accepted.data.version_aceptada));
    if (!record) return { error: "No se encontró la versión aceptada." };
  }
  // A package's flights must be confirmed again too, as in a flight quotation.
  const paquete = { ...record.details.paquete, componentes: record.details.paquete.componentes.map(component => component.vuelo ? { ...component, vuelo: { ...component.vuelo, vuelos: { ...component.vuelo.vuelos, confirmado: false }, equipajeConfirmado: false } } : component) };
  const details = { ...record.details, vuelos: { ...record.details.vuelos, confirmado: false }, equipajeConfirmado: false, validez: { ...record.details.validez, venceEn: "", limitePago: "", limiteEmision: "" }, refCreacion: "", aprobacionCondiciones: null, enmiendaDe: mode === "enmienda" ? record.quotation.codigo : "", paquete };
  const row = {
    customer_id: record.quotation.customer_id, cliente_nombre: record.quotation.cliente_nombre, cliente_email: record.quotation.cliente_email, cliente_telefono: record.quotation.cliente_telefono,
    destino: record.quotation.destino, moneda: record.quotation.moneda, validez: legacyValidityDate(zonedToIso(`${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T23:59`)),
    notas: record.quotation.notas, codigo: quotationCode(), tipo: record.kind, detalles: details,
  };
  const items = record.items.map(item => ({ descripcion: item.descripcion, tipo: item.tipo, cantidad: item.cantidad, precio_unitario: item.precio_unitario }));
  const saved = await client.rpc("create_quotation_copy", { p_source: id, p_amendment: mode === "enmienda", p_row: row, p_items: items });
  if (saved.error || !saved.data) return { error: missingFunction(saved.error) ? "Falta la actualización de la base de datos para copiar cotizaciones (docs/sql/quotation_integrity.sql)." : saved.error?.code === "23514" ? commercialError(saved.error) : "No se pudo crear la copia. No se guardó nada; intente nuevamente." };
  const newId = String(saved.data);
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
  const id = clean(form.get("id")), status = clean(form.get("estado"));
  if (!validUuid(id) || !isQuotationStatus(status)) return { error: "Seleccione un estado válido." };
  if (status === "aceptada") {
    const versionId = clean(form.get("version_id"));
    if (!validUuid(versionId) || form.get("confirmado") !== "si") return { error: "Confirme la versión y la aceptación comunicada por el cliente." };
    const result = await client.rpc("accept_quotation", { p_id: id, p_version_id: versionId, p_notes: clean(form.get("notas")) });
    if (result.error) return { error: commercialError(result.error) };
    refreshQuotationPaths(id);
    // An accepted amendment replaced its original in the same transaction and may have moved its reservation.
    const amendment = await client.from("quotations").select("enmienda_de").eq("id", id).maybeSingle();
    const moved = amendment.data?.enmienda_de ? await client.from("reservations").select("id,codigo").eq("quotation_id", id).maybeSingle() : null;
    if (moved?.data) {
      revalidatePath(`/admin/reservas/${moved.data.id}`);
      return { success: `Enmienda aceptada. La reserva ${moved.data.codigo} pasó a esta versión: revise su nuevo total y saldo.` };
    }
    return { success: "Cotización aceptada. Puede crear una prerreservación o una reserva." };
  }
  if (!["rechazada", "expirada"].includes(status)) return { error: "Estado inválido." };
  // A rejection always records why; the database refuses it without a reason (docs/sql/quotation_integrity.sql).
  const motivo = clean(form.get("motivo")).replace(/\s+/g, " ");
  if (status === "rechazada" && (motivo.length < 3 || motivo.length > 500)) return { error: "Indique en pocas palabras por qué el cliente rechazó la cotización." };
  const changes = status === "rechazada" ? { estado: status, motivo_rechazo: motivo, rechazada_en: new Date().toISOString() } : { estado: status };
  const result = await client.from("quotations").update(changes).eq("id", id).in("estado", ["borrador", "enviada"]).select("id").single();
  if (result.error && isMissingColumn(result.error)) return { error: "Falta la actualización de la base de datos para registrar el motivo del rechazo (docs/sql/quotation_integrity.sql)." };
  if (result.error) return { error: "No se pudo cambiar el estado. Una cotización aceptada requiere una enmienda." };
  refreshQuotationPaths(id);
  return { success: "Estado actualizado." };
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["client"];
// How the customer received the version: e-mailed from the panel, or shared by the advisor outside it.
export type SendChannel = "correo" | "whatsapp" | "presencial";
const manualChannels: readonly SendChannel[] = ["whatsapp", "presencial"];
type FrozenVersion = { versionNumber: number; snapshotRecord: NonNullable<Awaited<ReturnType<typeof getAdminQuotation>>> } | { error: string };

// Key-order independent JSON, so a stored snapshot compares equal to the same content read again.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value ?? null);
}
const volatileFields = ["version", "estado", "updated_at"];
const commercialContent = (quotation: Record<string, unknown>, items: { descripcion: string; tipo: string | null; cantidad: number; precio_unitario: number }[]) => canonical({
  quotation: Object.fromEntries(Object.entries(quotation).filter(([key]) => !volatileFields.includes(key))),
  items: items.map(item => [item.descripcion, item.tipo ?? null, Number(item.cantidad), Number(item.precio_unitario)]),
});

// True when the latest version was frozen for a send on this channel, was never recorded as the sent (or
// accepted) version, and the quotation still has exactly the content it froze.
async function undelivered(client: AdminClient, id: string, latest: { id: string; version: number; snapshot: unknown }, record: NonNullable<Awaited<ReturnType<typeof getAdminQuotation>>>, canal: SendChannel) {
  const snapshot = latest.snapshot as { quotation?: Record<string, unknown>; items?: { descripcion: string; tipo: string | null; cantidad: number; precio_unitario: number }[]; canal?: string; origen?: string } | null;
  if (!snapshot?.quotation || !Array.isArray(snapshot.items) || snapshot.origen || (snapshot.canal ?? "correo") !== canal) return false;
  const links = await client.from("quotations").select("sent_version_id,accepted_version_id").eq("id", id).maybeSingle();
  if (links.error || !links.data || [links.data.sent_version_id, links.data.accepted_version_id].includes(latest.id)) return false;
  return commercialContent(snapshot.quotation, snapshot.items) === commercialContent(record.quotation as unknown as Record<string, unknown>, record.items);
}

// Freezes the quotation as it stands into an immutable version (quotation_versions). Sending uses it
// before e-mailing; accepting uses it when nothing was ever sent from the panel (a PDF shared by
// WhatsApp, for example), so every accepted quotation keeps a fixed copy of what was agreed.
async function freezeVersion(client: AdminClient, userId: string, record: NonNullable<Awaited<ReturnType<typeof getAdminQuotation>>>, origen: "envio" | "aceptacion", canal: SendChannel = "correo"): Promise<FrozenVersion> {
  const { quotation } = record;
  const id = quotation.id;
  // The next number comes from the versions themselves, so a failed counter update can never block later sends.
  const latest = await client.from("quotation_versions").select("id,version,snapshot").eq("quotation_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (latest.error && !isMissingColumn(latest.error) && latest.error.code !== "42P01") return { error: "No se pudo preparar la versión de la cotización. Intente nuevamente." };
  // A send that failed halfway (e-mail not delivered, or delivered but the status not saved) left a frozen
  // version that was never marked as sent. If nothing changed since, the retry reuses it: same number, same
  // PDF and same e-mail idempotency key, so the customer never gets two different versions of one send.
  if (origen === "envio" && latest.data && await undelivered(client, id, latest.data, record, canal)) {
    return { versionNumber: Number(latest.data.version), snapshotRecord: toRecord({ ...quotation, version: Number(latest.data.version) }, record.items, true) };
  }
  const versionNumber = Math.max(Number(quotation.version ?? 0), Number(latest.data?.version ?? 0)) + 1;
  const row = { ...quotation, version: versionNumber };
  const snapshot = { quotation: row, items: record.items, emitida_en: new Date().toISOString(), canal, ...(origen === "aceptacion" ? { origen } : {}) };
  const version = await client.from("quotation_versions").insert({ quotation_id: id, version: versionNumber, snapshot, emitida_por: userId }).select("id").single();
  if (version.error?.code === "23505") return { error: "Se registró otra versión al mismo tiempo. Recargue la página e intente nuevamente." };
  if (version.error) return { error: isMissingColumn(version.error) || version.error.code === "42P01" ? schemaMissing : "No se pudo registrar la versión de la cotización. Intente nuevamente." };
  await client.from("quotations").update({ version: versionNumber }).eq("id", id);
  return { versionNumber, snapshotRecord: toRecord(row, record.items, true) };
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
    const frozen = await freezeVersion(client, user.id, record, "envio");
    if ("error" in frozen) return { error: frozen.error };
    ({ versionNumber, snapshotRecord } = frozen);
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
  const delivered = versionNumber ? await client.from("quotation_versions").select("id").eq("quotation_id", id).eq("version", versionNumber).single() : null;
  const frozenVersionId = delivered?.data?.id;
  if (versionNumber && !frozenVersionId) return { error: "El correo se envió, pero no se pudo registrar la versión enviada. Revise el historial." };
  const updated = await client.from("quotations").update({ estado: "enviada", ...(versionNumber ? { sent_version_id: frozenVersionId } : {}) }).eq("id", id).select("id").single();
  if (updated.error || !updated.data) return { error: "El correo se envió, pero no se pudo actualizar el estado. Revise la cotización antes de reenviar." };
  refreshQuotationPaths(id);
  const message = `Hola, le comparto la cotización ${quotation.codigo} de viatour para ${quotation.destino}. Total referencial: ${formatQuotationAmount(Number(quotation.total), quotation.moneda)}.`;
  // The share link opens a chat with the customer; it is omitted when there is no usable phone.
  const whatsappUrl = customerWhatsappHref(normalizePhone(quotation.cliente_telefono ?? "") || quotation.cliente_telefono || "", message);
  return { success: versionNumber ? `Versión ${versionNumber} enviada al correo del cliente.` : "Cotización enviada al correo del cliente.", ...(whatsappUrl ? { whatsappUrl } : {}) };
}

// Most quotations reach the customer by WhatsApp or in person, not by e-mail. Recording that send freezes
// the same immutable version an e-mail would (with the channel), marks the quotation sent and links that
// version, so the customer's answer can later be accepted and converted. Nothing is sent from here: the
// advisor shares the PDF of that version themselves.
export async function registerQuotationSent(_: QuotationActionState, form: FormData): Promise<QuotationActionState> {
  const { client, user } = await requireAdmin();
  const id = clean(form.get("id")), canal = clean(form.get("canal")) as SendChannel;
  if (!validUuid(id) || !manualChannels.includes(canal)) return { error: "Elija cómo compartió la cotización." };
  if (form.get("confirmado") !== "si") return { error: "Confirme que compartió con el cliente el PDF de esta versión." };
  const record = await getAdminQuotation(client, id);
  if (!record) return { error: "No se encontró la cotización." };
  const { quotation } = record;
  if (!["borrador", "enviada"].includes(quotation.estado)) return { error: quotation.estado === "aceptada" ? "El cliente ya aceptó esta cotización. Para enviar cambios, cree una enmienda." : "Esta cotización ya no está abierta. Use «Duplicar» para preparar una nueva." };
  if (!record.schemaReady) return { error: schemaMissing };
  const blocking = quotationReadiness(record.kind, record.details, record.items).filter(issue => issue.nivel === "error");
  if (blocking.length) return { error: `Antes de registrar el envío: ${blocking.map(issue => issue.mensaje).join(" ")}` };
  const frozen = await freezeVersion(client, user.id, record, "envio", canal);
  if ("error" in frozen) return { error: frozen.error };
  const version = await client.from("quotation_versions").select("id").eq("quotation_id", id).eq("version", frozen.versionNumber).single();
  if (version.error || !version.data) return { error: `La versión ${frozen.versionNumber} quedó guardada, pero no se pudo vincular. Recargue la página e intente de nuevo.` };
  const updated = await client.from("quotations").update({ estado: "enviada", sent_version_id: version.data.id }).eq("id", id).in("estado", ["borrador", "enviada"]).select("id").single();
  if (updated.error || !updated.data) return { error: `La versión ${frozen.versionNumber} quedó guardada, pero no se pudo marcar como enviada. Recargue la página e intente de nuevo.` };
  refreshQuotationPaths(id);
  const message = `Hola, le comparto la cotización ${quotation.codigo} de viatour para ${quotation.destino}. Total referencial: ${formatQuotationAmount(Number(quotation.total), quotation.moneda)}.`;
  const whatsappUrl = canal === "whatsapp" ? customerWhatsappHref(normalizePhone(quotation.cliente_telefono ?? "") || quotation.cliente_telefono || "", message) : "";
  return { success: `Versión ${frozen.versionNumber} registrada como enviada${canal === "whatsapp" ? " por WhatsApp" : " en persona"}. Cuando el cliente responda, márquela como aceptada.`, versionPdf: `/api/admin/cotizaciones/${id}/pdf?version=${frozen.versionNumber}`, ...(whatsappUrl ? { whatsappUrl } : {}) };
}

export type ShareState = { error?: string; success?: string; shareId?: string; shareUrl?: string; whatsappUrl?: string; versionPdf?: string; message?: string; versionNumber?: number; done?: "confirmado" | "cancelado" };
const sharesMissing = "Falta la actualización de la base de datos para compartir por WhatsApp (docs/sql/quotation_shares.sql).";

// "Compartir por WhatsApp", step 1: freezes the version the customer will see (or reuses the one prepared
// before if nothing changed), creates a secure link to it and returns the WhatsApp chat with the message.
// Nothing is sent and the quotation does not change state: opening WhatsApp is not proof of sending.
export async function prepareWhatsappShare(_: ShareState, form: FormData): Promise<ShareState> {
  const { client, user } = await requireAdmin();
  const id = clean(form.get("id"));
  const telefono = normalizePhone(clean(form.get("telefono")));
  const text = String(form.get("mensaje") ?? "");
  if (!validUuid(id)) return { error: "Cotización inválida." };
  if (!telefono) return { error: "Escriba el número de WhatsApp del cliente con su código de país, por ejemplo +504 9999-9999." };
  if (!text.trim() || text.length > maxShareMessage - 120) return { error: "Escriba un mensaje breve para el cliente (hasta 880 caracteres)." };
  const record = await getAdminQuotation(client, id);
  if (!record) return { error: "No se encontró la cotización." };
  if (!["borrador", "enviada"].includes(record.quotation.estado)) return { error: record.quotation.estado === "aceptada" ? "El cliente ya aceptó esta cotización. Para enviar cambios, cree una enmienda." : "Esta cotización ya no está abierta. Use «Duplicar» para preparar una nueva." };
  if (!record.schemaReady) return { error: schemaMissing };
  const blocking = quotationReadiness(record.kind, record.details, record.items).filter(issue => issue.nivel === "error");
  if (blocking.length) return { error: `Antes de compartir: ${blocking.map(issue => issue.mensaje).join(" ")}` };
  const frozen = await freezeVersion(client, user.id, record, "envio", "whatsapp");
  if ("error" in frozen) return { error: frozen.error };
  const version = await client.from("quotation_versions").select("id").eq("quotation_id", id).eq("version", frozen.versionNumber).single();
  if (version.error || !version.data) return { error: "No se pudo preparar la versión. Recargue la página e intente de nuevo." };
  // Only one pending share at a time: an earlier link that was never confirmed stops working.
  const closed = await client.from("quotation_shares").update({ estado: "cancelado", cerrado_en: new Date().toISOString() }).eq("quotation_id", id).eq("estado", "preparado");
  if (closed.error) return { error: missingFunction(closed.error) || closed.error.code === "42P01" || closed.error.code === "PGRST205" ? sharesMissing : "No se pudo preparar el enlace. Intente nuevamente." };
  const { token, hash } = newShareToken();
  const shareUrl = `${shareOrigin((await headers()).get("host"))}/cotizacion/${token}`;
  const message = composeShareMessage(text, shareUrl);
  if (message.length > maxShareMessage) return { error: "El mensaje es demasiado largo. Acórtelo un poco." };
  // The record keeps the text with {enlace}, never the link itself: only the advisor's screen gets the token.
  const saved = await client.from("quotation_shares").insert({ quotation_id: id, version_id: version.data.id, canal: "whatsapp_manual", telefono, mensaje: composeShareMessage(text, linkPlaceholder), plantilla: shareTemplate, token_hash: hash, expira_en: shareExpiry(record.expiry).toISOString(), creado_por: user.id }).select("id").single();
  if (saved.error || !saved.data) return { error: saved.error?.code === "42P01" || saved.error?.code === "PGRST205" ? sharesMissing : "No se pudo preparar el enlace. Intente nuevamente." };
  return { shareId: String(saved.data.id), shareUrl, message, versionNumber: frozen.versionNumber, whatsappUrl: customerWhatsappHref(telefono, message), versionPdf: `/api/admin/cotizaciones/${id}/pdf?version=${frozen.versionNumber}` };
}

// Step 2: the advisor confirms the message went out ("Lo envié"), or that it did not ("No lo envié").
export async function confirmWhatsappShare(_: ShareState, form: FormData): Promise<ShareState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id")), shareId = clean(form.get("share_id"));
  if (!validUuid(id) || !validUuid(shareId)) return { error: "Envío inválido." };
  if (form.get("resultado") === "no") {
    const cancelled = await client.from("quotation_shares").update({ estado: "cancelado", cerrado_en: new Date().toISOString() }).eq("id", shareId).eq("quotation_id", id).eq("estado", "preparado").select("id");
    if (cancelled.error) return { error: "No se pudo cancelar. Recargue la página." };
    refreshQuotationPaths(id);
    return { done: "cancelado", success: "Envío cancelado; el enlace preparado quedó desactivado. La cotización no cambió." };
  }
  const result = await client.rpc("confirm_quotation_share", { p_share: shareId });
  if (result.error) return { error: missingFunction(result.error) ? sharesMissing : commercialError(result.error) };
  refreshQuotationPaths(id);
  return { done: "confirmado", success: "Envío registrado. La cotización quedó como enviada; cuando el cliente responda, márquela como aceptada." };
}

// Turns off a customer link that was already shared (for example, sent to the wrong number).
export async function revokeQuotationShare(_: ShareState, form: FormData): Promise<ShareState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id")), shareId = clean(form.get("share_id"));
  if (!validUuid(id) || !validUuid(shareId)) return { error: "Envío inválido." };
  const result = await client.from("quotation_shares").update({ estado: "revocado", cerrado_en: new Date().toISOString() }).eq("id", shareId).eq("quotation_id", id).in("estado", ["confirmado", "enviado", "entregado", "leido"]).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "No se pudo desactivar el enlace. Recargue la página." };
  refreshQuotationPaths(id);
  return { success: "Enlace desactivado. El cliente ya no puede abrirlo." };
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
  const [quotations, versions, hotelCatalog] = await Promise.all([
    client.from("quotations").select("detalles").limit(20000),
    client.from("quotation_versions").select("snapshot").limit(20000),
    // Catalog photos (docs/sql/quotations_v6.sql) are in use too; before V6 the table does not exist.
    client.from("hotel_catalog").select("fotos").limit(20000),
  ]);
  if (quotations.error || versions.error || (hotelCatalog.error && !isMissingTable(hotelCatalog.error))) return { error: "No se pudieron revisar las cotizaciones. Intente nuevamente." };
  const used = new Set(`${JSON.stringify(quotations.data ?? [])}${JSON.stringify(versions.data ?? [])}${JSON.stringify(hotelCatalog.error ? [] : hotelCatalog.data ?? [])}`.match(/hotel\/[0-9a-f]{32}\.jpg/g) ?? []);
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
