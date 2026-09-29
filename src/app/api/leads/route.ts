import { createAdminClient } from "@/lib/supabase/admin";
import { validateLead } from "@/lib/lead-validation";
import { notifySubmission } from "@/lib/notifications";
import { publicError, rateLimit, readBody, verifyTurnstile } from "@/lib/public-security";

// Unambiguous characters only: customers may read the reference aloud or retype it.
const referenceAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function leadReference() {
  return "VT-" + Array.from(crypto.getRandomValues(new Uint8Array(5)), byte => referenceAlphabet[byte % referenceAlphabet.length]).join("");
}
// telefono/email/referencia/origen_web/segmento come from docs/sql/leads_contact.sql. Until it runs,
// the insert is retried without them; the same values remain in `payload`, so no lead is lost.
const missingColumn = (error: { code?: string }) => error.code === "PGRST204" || error.code === "42703";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "/api/leads", 10); if (limited) return limited;
  let raw: Record<string, unknown>, payload: ReturnType<typeof validateLead>;
  try { raw = JSON.parse((await readBody(request, 32 * 1024)).toString("utf8")); payload = validateLead(raw); }
  catch { return publicError(400, "Revise los datos de su solicitud."); }
  if (!await verifyTurnstile(request, raw.turnstileToken)) return publicError(400, "No se pudo verificar su solicitud. Inténtelo nuevamente.");
  const id = crypto.randomUUID(), fields = payload.fields;
  const packagePassengers = payload.servicio === "Paquete" ? `Adultos: ${fields.Adultos}; niños: ${fields.Niños}` : null;
  const base = { id, servicio: payload.servicio, nombre: fields.Nombre || null, origen: fields.Origen || null, destino: fields.Destino || null, fechas: fields.Fechas || null, pasajeros: fields.Pasajeros || fields.Huéspedes || packagePassengers, clase: fields.Clase || null, presupuesto: payload.formData.budget ? Number(payload.formData.budget) : null, moneda: payload.currency, notas: fields.Notas || null, user_agent: request.headers.get("user-agent")?.slice(0, 512) || null };
  const legacyRow = (referencia: string) => ({ ...base, payload: { ...payload, referencia } });
  const fullRow = (referencia: string) => ({ ...legacyRow(referencia), telefono: payload.contacto.telefono || null, email: payload.contacto.email || null, referencia, origen_web: Object.keys(payload.origen).length ? payload.origen : null, segmento: payload.segmento || null });
  const insert = (row: Record<string, unknown>) => createAdminClient().from("leads").insert(row).abortSignal(AbortSignal.timeout(8000));
  try {
    let referencia = leadReference();
    let { error } = await insert(fullRow(referencia));
    if (error?.code === "23505") { referencia = leadReference(); ({ error } = await insert(fullRow(referencia))); }
    if (error && missingColumn(error)) {
      console.warn("Lead contact columns unavailable; values kept in payload", { id });
      ({ error } = await insert(legacyRow(referencia)));
    }
    if (error) { console.error("Lead insert failed", { id, code: error.code }); return publicError(502, "No se pudo guardar su solicitud."); }
    await notifySubmission("lead", id, { ...payload, referencia });
    return Response.json({ ok: true, id, referencia }, { status: 201 });
  } catch { console.error("Lead insert unavailable", { id }); return publicError(503, "No se pudo guardar su solicitud."); }
}
