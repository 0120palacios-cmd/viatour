import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalTickets } from "@/lib/portal-data";
import { clientIP } from "@/lib/public-security";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
const genericError = "No se pudo procesar su solicitud. Inténtelo nuevamente.";

async function sessionReservationId() { return verifyPortalCookie((await cookies()).get(portalCookieName)?.value); }
async function limited(client: ReturnType<typeof createAdminClient>, request: Request, reservationId: string) {
  const ip = clientIP(request);
  const keys = [`/mi-reserva:tickets:ip:${createHash("sha256").update(ip).digest("hex")}`, `/mi-reserva:tickets:reservation:${createHash("sha256").update(reservationId).digest("hex")}`];
  const results = await Promise.all(keys.map(key => client.rpc("hit_rate_limit", { p_key: key, p_max: 10, p_window_seconds: 3600 })));
  return results.every(result => !result.error && result.data === true);
}

export async function GET() {
  const reservationId = await sessionReservationId();
  if (!reservationId) return Response.json({ ok: false, error: "No autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const tickets = await getPortalTickets(createAdminClient(), reservationId);
  return Response.json({ ok: true, tickets }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ ok: false, error: "Solicitud no permitida." }, { status: 403 });
  const reservationId = await sessionReservationId();
  if (!reservationId) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const client = createAdminClient();
  try {
    if (!await limited(client, request, reservationId)) return Response.json({ ok: false, error: genericError }, { status: 429 });
    const form = await request.formData();
    const asunto = String(form.get("asunto") ?? "").trim();
    const mensaje = String(form.get("mensaje") ?? "").trim();
    if (!asunto || asunto.length > 160 || !mensaje || mensaje.length > 4000) return Response.json({ ok: false, error: "Revise el asunto y el detalle de su solicitud." }, { status: 400 });
    const inserted = await client.from("support_tickets").insert({ reservation_id: reservationId, asunto, mensaje, estado: "abierto" }).select("id").single();
    if (inserted.error) return Response.json({ ok: false, error: genericError }, { status: 503 });
    const reservation = await client.from("reservations").select("codigo").eq("id", reservationId).maybeSingle();
    try {
      await sendResendEmail({ idempotencyKey: `support-ticket/${inserted.data.id}`, from: siteConfig.supportEmail, to: [siteConfig.supportEmail], subject: `Nueva solicitud de soporte | ${reservation.data?.codigo ?? "reserva"}`, text: `Reserva: ${reservation.data?.codigo ?? reservationId}\nAsunto: ${asunto}\n\n${mensaje}` });
    } catch {
      // La solicitud ya quedó guardada; el equipo puede verla en el panel privado.
    }
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: genericError }, { status: 503 });
  }
}
