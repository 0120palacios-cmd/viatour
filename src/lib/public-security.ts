import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Nuevos mensajes funcionales: borrador pendiente de aprobación; sin cambios de copy comercial.
export const publicError = (status: number, error: string) => Response.json({ ok: false, error }, { status });
export function clientIP(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) || "unknown";
}
export async function rateLimit(request: Request, route: string, max: number) {
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", { p_key: `${route}:${clientIP(request)}`, p_max: max, p_window_seconds: 3600 });
    if (error || typeof data !== "boolean") throw new Error("Rate limit unavailable");
    return data ? null : publicError(429, "No se pudo procesar su solicitud. Inténtelo nuevamente más adelante.");
  } catch {
    console.error("Public rate limit unavailable", { route });
    return publicError(503, "No se pudo procesar su solicitud. Inténtelo nuevamente.");
  }
}
export async function verifyTurnstile(request: Request, token: unknown) {
  if (typeof token !== "string" || !token || token.length > 2048 || !process.env.TURNSTILE_SECRET_KEY) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: clientIP(request) }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok && (await response.json()).success === true;
  } catch { return false; }
}
export async function readBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("Body too large"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
