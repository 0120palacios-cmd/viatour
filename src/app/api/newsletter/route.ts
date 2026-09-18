import { createAdminClient } from "@/lib/supabase/admin";
import { publicError, rateLimit, readBody, verifyTurnstile } from "@/lib/public-security";
export async function POST(request: Request) {
  const limited = await rateLimit(request, "/api/newsletter", 5); if (limited) return limited;
  let payload;
  try { payload = JSON.parse((await readBody(request, 4096)).toString("utf8")); } catch { return publicError(400, "Revise los campos indicados."); }
  if (!payload || typeof payload.email !== "string" || payload.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim()) || payload.consent !== true || (payload.nombre !== undefined && (typeof payload.nombre !== "string" || payload.nombre.length > 120)) || payload.website) return publicError(400, "Revise los campos indicados.");
  if (!await verifyTurnstile(request, payload.turnstileToken)) return publicError(400, "No se pudo verificar su solicitud. Inténtelo nuevamente.");
  try {
    const { error } = await createAdminClient().from("newsletter_subscribers").upsert({ email: payload.email.trim().toLowerCase(), nombre: payload.nombre?.trim() || null, consent: true }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw Error("Insert"); return Response.json({ ok: true }, { status: 201 });
  } catch { return publicError(503, "No se pudo procesar su solicitud. Inténtelo nuevamente."); }
}
