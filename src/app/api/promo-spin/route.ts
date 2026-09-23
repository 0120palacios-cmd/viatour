import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { segments } from "@/lib/promo-wheel";
import { clientIP, readBody } from "@/lib/public-security";

export const runtime = "nodejs";
const generic = "No se pudo validar el código. Revíselo o consulte con su asesor.";

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ ok: false, error: generic }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const body = JSON.parse((await readBody(request, 2048)).toString("utf8")) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!/^[A-Z0-9-]{8,40}$/.test(code)) return Response.json({ ok: false, error: generic }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const client = createAdminClient();
    const ipHash = createHash("sha256").update(clientIP(request)).digest("hex");
    const codeHash = createHash("sha256").update(code).digest("hex");
    const limits = await Promise.all([ipHash, codeHash].map(hash => client.rpc("hit_rate_limit", { p_key: `promo-spin:${hash}`, p_max: 5, p_window_seconds: 3600 })));
    if (limits.some(result => result.error || result.data !== true)) return Response.json({ ok: false, error: generic }, { status: 429, headers: { "Cache-Control": "no-store" } });
    const { data, error } = await client.rpc("redeem_promo_spin", { p_code: code, p_segments: segments });
    const result = data?.[0];
    if (error || !result) return Response.json({ ok: false, error: generic }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return Response.json({ ok: true, code, id: result.premio_id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: generic }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
