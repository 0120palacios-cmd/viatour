import { createAdminClient } from "@/lib/supabase/admin";
import { validateLead } from "@/lib/lead-validation";
import { notifySubmission } from "@/lib/notifications";
import { publicError, rateLimit, readBody, verifyTurnstile } from "@/lib/public-security";
export async function POST(request: Request) {
  const limited = await rateLimit(request, "/api/leads", 10); if (limited) return limited;
  let raw: Record<string, unknown>, payload: ReturnType<typeof validateLead>;
  try { raw = JSON.parse((await readBody(request, 32 * 1024)).toString("utf8")); payload = validateLead(raw); }
  catch { return publicError(400, "Revise los datos de su solicitud."); }
  if (!await verifyTurnstile(request, raw.turnstileToken)) return publicError(400, "No se pudo verificar su solicitud. Inténtelo nuevamente.");
  const id = crypto.randomUUID(), fields = payload.fields;
  const packagePassengers = payload.servicio === "Paquete" ? `Adultos: ${fields.Adultos}; niños: ${fields.Niños}` : null;
  const row = { id, servicio: payload.servicio, nombre: fields.Nombre || null, origen: fields.Origen || null, destino: fields.Destino || null, fechas: fields.Fechas || null, pasajeros: fields.Pasajeros || fields.Huéspedes || packagePassengers, clase: fields.Clase || null, presupuesto: payload.formData.budget ? Number(payload.formData.budget) : null, moneda: payload.currency, notas: fields.Notas || null, payload, user_agent: request.headers.get("user-agent")?.slice(0, 512) || null };
  try {
    const { error } = await createAdminClient().from("leads").insert(row).abortSignal(AbortSignal.timeout(8000));
    if (error) { console.error("Lead insert failed", { id, code: error.code }); return publicError(502, "No se pudo guardar su solicitud."); }
    await notifySubmission("lead", id, payload);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch { console.error("Lead insert unavailable", { id }); return publicError(503, "No se pudo guardar su solicitud."); }
}
