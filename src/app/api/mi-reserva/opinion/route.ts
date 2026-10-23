import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { readBody } from "@/lib/public-security";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { validateFeedback } from "@/lib/trip-requests";
import { reservationContext, storeFeedback, underLimit } from "@/lib/trip-request-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Private feedback about viatour's service for the signed-in reservation, from the last day of the trip on.
// It is never published and has no effect on anything else the customer sees: the invitation to a public
// review is shown to everyone, whatever the rating.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "Solicitud no permitida." }, 403);
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) return json({ ok: false, error: "No autorizado." }, 401);
  const client = createAdminClient();
  try {
    if (!await underLimit(client, request, "opinion", reservationId, 5, 86400)) return json({ ok: false, error: "Ya recibimos su opinión. Gracias." }, 429);
    const raw = await readBody(request, 8 * 1024).catch(() => null);
    const input = raw ? (() => { try { return JSON.parse(raw.toString("utf8")) as Record<string, unknown>; } catch { return null; } })() : null;
    const valid = input ? validateFeedback({ rating: input.rating, comment: input.comment }) : null;
    if (!valid) return json({ ok: false, error: "Elija una calificación del 1 al 5 (el comentario puede tener hasta 1000 caracteres)." }, 400);
    const context = await reservationContext(client, reservationId);
    if (!context) return json({ ok: false, error: "No encontramos su reserva." }, 404);
    if (!context.canGiveFeedback) return json({ ok: false, error: "Podrá contarnos cómo le fue al final de su viaje." }, 409);
    const saved = await storeFeedback(client, reservationId, context, valid.rating, valid.comment);
    if (!saved) return json({ ok: false, error: "No se pudo enviar su opinión. Inténtelo nuevamente." }, 503);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "No se pudo enviar su opinión. Inténtelo nuevamente." }, 503);
  }
}
