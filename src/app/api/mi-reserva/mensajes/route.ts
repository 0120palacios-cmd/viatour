import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIP, readBody } from "@/lib/public-security";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { missingTable, readThread, validateMessage } from "@/lib/reservation-messages";
import { attachmentMaxBytes, attachmentPath, checkAttachment } from "@/lib/chat-attachments";
import { cleanImage } from "@/lib/attachment-image";
import { portalDocsBucket } from "@/lib/portal-documents";
import { captureNotificationFailure, sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
// A message with one file: the file (4 MB) plus the form fields and multipart framing.
const maxBody = attachmentMaxBytes + 64 * 1024;
const attachmentErrors = {
  empty: "El archivo está vacío.",
  tooLarge: "El archivo debe pesar como máximo 4 MB.",
  type: "Solo se pueden adjuntar fotos (JPG, PNG o WebP) y documentos PDF.",
  activePdf: "Este PDF no se puede adjuntar. Envíe una foto o un PDF sin contenido interactivo.",
  image: "No pudimos leer la imagen. Intente con otra foto.",
} as const;

// The reservation always comes from the verified OTP session cookie; nothing in the request selects it.
async function sessionReservation() { return verifyPortalCookie((await cookies()).get(portalCookieName)?.value); }

export async function GET() {
  const reservationId = await sessionReservation();
  if (!reservationId) return json({ ok: false, error: "No autorizado." }, 401);
  const client = createAdminClient();
  try {
    const thread = await readThread(client, reservationId);
    if (!thread.available) return json({ ok: true, available: false, attachments: false, messages: [] });
    const unread = thread.messages.filter(message => message.sender === "agencia" && !message.customer_read_at).map(message => message.id);
    // Seen now: the replies shown in this response stop counting as new. Failure only affects the badge.
    if (unread.length) await client.from("reservation_messages").update({ customer_read_at: new Date().toISOString() }).eq("reservation_id", reservationId).in("id", unread);
    return json({ ok: true, available: true, attachments: Boolean(thread.attachments), messages: thread.messages.map(({ id, sender, topic, body, created_at, attachments }) => ({ id, sender, topic, body, created_at, unread: unread.includes(id), attachments: attachments ?? [] })) });
  } catch {
    return json({ ok: false, error: "No se pudieron cargar los mensajes." }, 503);
  }
}

type Parsed = { body: unknown; topic: unknown; file: File | null };
async function parse(request: Request): Promise<Parsed | null> {
  const type = request.headers.get("content-type") ?? "";
  const raw = await readBody(request, maxBody);
  if (type.startsWith("multipart/form-data")) {
    const form = await new Response(raw, { headers: { "content-type": type } }).formData();
    const file = form.get("archivo");
    return { body: form.get("body") ?? "", topic: form.get("topic") || null, file: file instanceof File && file.size ? file : null };
  }
  const input = JSON.parse(raw.toString("utf8")) as { body?: unknown; topic?: unknown } | null;
  return input && typeof input === "object" ? { body: input.body, topic: input.topic ?? null, file: null } : null;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "Solicitud no permitida." }, 403);
  const reservationId = await sessionReservation();
  if (!reservationId) return json({ ok: false, error: "No autorizado." }, 401);
  if (Number(request.headers.get("content-length") ?? 0) > maxBody) return json({ ok: false, error: attachmentErrors.tooLarge }, 413);
  const client = createAdminClient();
  let stored: string | null = null;
  try {
    const keys = [`/mi-reserva:mensajes:reservation:${hash(reservationId)}`, `/mi-reserva:mensajes:ip:${hash(clientIP(request))}`];
    const limits = await Promise.all(keys.map((key, index) => client.rpc("hit_rate_limit", { p_key: key, p_max: index === 0 ? 20 : 40, p_window_seconds: 3600 })));
    if (limits.some(result => result.error || result.data !== true)) return json({ ok: false, error: "Alcanzó el límite de mensajes por ahora. Si es urgente, escríbanos por WhatsApp." }, 429);
    const input = await parse(request).catch(error => { if (error instanceof Error && error.message === "Body too large") throw error; return null; });
    const message = input ? validateMessage({ body: input.body, topic: input.topic }, { withAttachment: Boolean(input.file) }) : null;
    if (!input || !message) return json({ ok: false, error: "Revise su mensaje (hasta 2000 caracteres)." }, 400);

    let attachment: { path: string; name: string; mime: string; size: number } | null = null;
    if (input.file) {
      // Attachments need their table; without it nothing is uploaded.
      const ready = await client.from("reservation_message_attachments").select("id").eq("reservation_id", reservationId).limit(1);
      if (ready.error) return json({ ok: false, attachments: false, error: "Por ahora no se pueden adjuntar archivos. Envíe el texto o compártalo por WhatsApp." }, 503);
      const bytes = new Uint8Array(await input.file.arrayBuffer());
      const check = checkAttachment(bytes, input.file.type, input.file.name);
      if (!check.ok) return json({ ok: false, error: attachmentErrors[check.reason] }, check.reason === "tooLarge" ? 413 : 400);
      const clean = await cleanImage(bytes, check.mime);
      if (!clean) return json({ ok: false, error: attachmentErrors.image }, 400);
      const path = attachmentPath(reservationId, crypto.randomUUID(), clean.mime);
      const upload = await client.storage.from(portalDocsBucket).upload(path, clean.bytes, { contentType: clean.mime, upsert: false });
      if (upload.error) return json({ ok: false, error: "No se pudo guardar el archivo. Inténtelo nuevamente." }, 503);
      stored = path;
      attachment = { path, name: clean.mime === check.mime ? check.name : check.name.replace(/\.[a-z]+$/, ".jpg"), mime: clean.mime, size: clean.bytes.length };
    }

    let saved: { id: string; created_at: string; attachmentId: string | null };
    if (attachment) {
      // Message and attachment in one transaction (docs/sql/mi_viaje_premium.sql).
      const posted = await client.rpc("post_customer_message", { p_reservation_id: reservationId, p_topic: message.topic, p_body: message.body, p_path: attachment.path, p_name: attachment.name, p_mime: attachment.mime, p_size: attachment.size });
      const row = Array.isArray(posted.data) ? posted.data[0] as { message_id: string; message_created_at: string; attachment_id: string } | undefined : undefined;
      if (posted.error || !row) throw new Error("post failed");
      saved = { id: row.message_id, created_at: row.message_created_at, attachmentId: row.attachment_id };
      stored = null;
    } else {
      const inserted = await client.from("reservation_messages").insert({ reservation_id: reservationId, sender: "cliente", topic: message.topic, body: message.body }).select("id,created_at").single();
      if (missingTable(inserted.error)) return json({ ok: false, available: false, error: "Los mensajes no están disponibles en este momento." }, 503);
      if (inserted.error || !inserted.data) return json({ ok: false, error: "No se pudo enviar el mensaje." }, 503);
      saved = { id: inserted.data.id, created_at: inserted.data.created_at, attachmentId: null };
    }

    // Internal notice to the agency inbox only; the customer is never emailed from here.
    const reservation = await client.from("reservations").select("codigo").eq("id", reservationId).maybeSingle();
    const code = reservation.data?.codigo ?? "reserva";
    try {
      await sendResendEmail({ idempotencyKey: `reservation-message/${saved.id}`, from: siteConfig.supportEmail, to: [siteConfig.supportEmail], subject: `Nuevo mensaje del cliente | ${code}`, text: `Reserva: ${code}\nTema: ${message.topic ?? "sin tema"}${attachment ? `\nAdjunto: ${attachment.name} (se ve en el panel)` : ""}\n\n${message.body || "(sin texto)"}\n\nResponder en: ${siteConfig.url}/admin/reservas/${reservationId}#mensajes` });
    } catch (error) {
      captureNotificationFailure("reservation_message", String(saved.id), error);
    }
    return json({ ok: true, message: { id: saved.id, sender: "cliente", topic: message.topic, body: message.body, created_at: saved.created_at, unread: false, attachments: attachment && saved.attachmentId ? [{ id: saved.attachmentId, name: attachment.name, mime: attachment.mime, size: attachment.size }] : [] } });
  } catch (error) {
    if (error instanceof Error && error.message === "Body too large") return json({ ok: false, error: attachmentErrors.tooLarge }, 413);
    return json({ ok: false, error: "No se pudo enviar el mensaje." }, 503);
  } finally {
    // An uploaded file whose message could not be saved is removed, so storage never holds orphans.
    if (stored) await client.storage.from(portalDocsBucket).remove([stored]).catch(() => null);
  }
}
