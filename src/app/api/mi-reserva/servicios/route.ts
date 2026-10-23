import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { readBody } from "@/lib/public-security";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { validateServiceRequest } from "@/lib/trip-requests";
import { reservationContext, storeServiceRequest, underLimit } from "@/lib/trip-request-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// "Cotizar auto", "Agregar traslado"...: an additional-service request for the signed-in reservation.
// The reservation, destination, dates and party size come from the server, never from the browser; the
// browser only says which service and an optional note. The record is saved before anything else, and the
// WhatsApp link the customer may open afterwards is built on their screen from what was saved.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "Solicitud no permitida." }, 403);
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) return json({ ok: false, error: "No autorizado." }, 401);
  const client = createAdminClient();
  try {
    if (!await underLimit(client, request, "servicios", reservationId, 10)) return json({ ok: false, error: "Recibimos varias solicitudes seguidas. Inténtelo más tarde o escríbanos por WhatsApp." }, 429);
    const raw = await readBody(request, 4 * 1024).catch(() => null);
    const input = raw ? (() => { try { return JSON.parse(raw.toString("utf8")) as Record<string, unknown>; } catch { return null; } })() : null;
    const valid = input ? validateServiceRequest({ service: input.service, note: input.note }) : null;
    if (!valid) return json({ ok: false, error: "Revise su solicitud (la nota puede tener hasta 600 caracteres)." }, 400);
    const context = await reservationContext(client, reservationId);
    if (!context) return json({ ok: false, error: "No encontramos su reserva." }, 404);
    if (context.estado === "cancelada") return json({ ok: false, error: "Esta reserva fue cancelada. Escríbanos para planificar un nuevo viaje." }, 409);
    const saved = await storeServiceRequest(client, reservationId, context, valid.service, valid.note);
    if (!saved) return json({ ok: false, error: "No se pudo registrar su solicitud. Inténtelo nuevamente." }, 503);
    return json({ ok: true, reference: context.code, service: valid.service });
  } catch {
    return json({ ok: false, error: "No se pudo registrar su solicitud. Inténtelo nuevamente." }, 503);
  }
}
