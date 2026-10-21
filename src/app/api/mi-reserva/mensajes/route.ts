import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIP } from "@/lib/public-security";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { missingTable, readThread, validateMessage } from "@/lib/reservation-messages";
import { captureNotificationFailure, sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

// The reservation always comes from the verified OTP session cookie; nothing in the request selects it.
async function sessionReservation() { return verifyPortalCookie((await cookies()).get(portalCookieName)?.value); }

export async function GET() {
  const reservationId = await sessionReservation();
  if (!reservationId) return json({ ok: false, error: "No autorizado." }, 401);
  const client = createAdminClient();
  try {
    const thread = await readThread(client, reservationId);
    if (!thread.available) return json({ ok: true, available: false, messages: [] });
    const unread = thread.messages.filter(message => message.sender === "agencia" && !message.customer_read_at).map(message => message.id);
    // Seen now: the replies shown in this response stop counting as new. Failure only affects the badge.
    if (unread.length) await client.from("reservation_messages").update({ customer_read_at: new Date().toISOString() }).eq("reservation_id", reservationId).in("id", unread);
    return json({ ok: true, available: true, messages: thread.messages.map(({ id, sender, topic, body, created_at }) => ({ id, sender, topic, body, created_at, unread: unread.includes(id) })) });
  } catch {
    return json({ ok: false, error: "No se pudieron cargar los mensajes." }, 503);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "Solicitud no permitida." }, 403);
  const reservationId = await sessionReservation();
  if (!reservationId) return json({ ok: false, error: "No autorizado." }, 401);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16 * 1024) return json({ ok: false, error: "El mensaje es demasiado largo." }, 413);
  const client = createAdminClient();
  try {
    const keys = [`/mi-reserva:mensajes:reservation:${hash(reservationId)}`, `/mi-reserva:mensajes:ip:${hash(clientIP(request))}`];
    const limits = await Promise.all(keys.map((key, index) => client.rpc("hit_rate_limit", { p_key: key, p_max: index === 0 ? 20 : 40, p_window_seconds: 3600 })));
    if (limits.some(result => result.error || result.data !== true)) return json({ ok: false, error: "Alcanzó el límite de mensajes por ahora. Si es urgente, escríbanos por WhatsApp." }, 429);
    const input = await request.json().catch(() => null) as { body?: unknown; topic?: unknown } | null;
    const message = input ? validateMessage({ body: input.body, topic: input.topic ?? null }) : null;
    if (!message) return json({ ok: false, error: "Revise su mensaje (hasta 2000 caracteres)." }, 400);
    const inserted = await client.from("reservation_messages").insert({ reservation_id: reservationId, sender: "cliente", topic: message.topic, body: message.body }).select("id,sender,topic,body,created_at").single();
    if (missingTable(inserted.error)) return json({ ok: false, available: false, error: "Los mensajes no están disponibles en este momento." }, 503);
    if (inserted.error || !inserted.data) return json({ ok: false, error: "No se pudo enviar el mensaje." }, 503);
    // Internal notice to the agency inbox only; the customer is never emailed from here.
    const reservation = await client.from("reservations").select("codigo").eq("id", reservationId).maybeSingle();
    const code = reservation.data?.codigo ?? "reserva";
    try {
      await sendResendEmail({ idempotencyKey: `reservation-message/${inserted.data.id}`, from: siteConfig.supportEmail, to: [siteConfig.supportEmail], subject: `Nuevo mensaje del cliente | ${code}`, text: `Reserva: ${code}\nTema: ${message.topic ?? "sin tema"}\n\n${message.body}\n\nResponder en: ${siteConfig.url}/admin/reservas/${reservationId}#mensajes` });
    } catch (error) {
      captureNotificationFailure("reservation_message", String(inserted.data.id), error);
    }
    return json({ ok: true, message: { ...inserted.data, unread: false } });
  } catch {
    return json({ ok: false, error: "No se pudo enviar el mensaje." }, 503);
  }
}
