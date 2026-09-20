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
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return false;
  if (await humanSessionExpires(request)) return true;
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

const humanCookie = "viatour-human";
const humanLifetime = 30 * 60 * 1000;
async function humanKey() {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;
  return crypto.subtle.importKey("raw", Buffer.from(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function humanSessionExpires(request: Request): Promise<number> {
  try {
    const value = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${humanCookie}=`))?.slice(humanCookie.length + 1);
    if (!value || value.length > 256) return 0;
    const [expires, nonce, signature, extra] = value.split(".");
    const expiry = Number(expires);
    if (extra || !nonce || !signature || !Number.isSafeInteger(expiry) || expiry <= Date.now() || expiry > Date.now() + humanLifetime) return 0;
    const key = await humanKey();
    return key && await crypto.subtle.verify("HMAC", key, Buffer.from(signature, "base64url"), Buffer.from(`human:${expires}.${nonce}`)) ? expiry : 0;
  } catch { return 0; }
}
export async function humanSessionResponse() {
  const key = await humanKey();
  if (!key) return publicError(503, "No se pudo verificar su solicitud. Inténtelo nuevamente.");
  const expires = Date.now() + humanLifetime;
  const value = `${expires}.${crypto.randomUUID()}`;
  const signature = Buffer.from(await crypto.subtle.sign("HMAC", key, Buffer.from(`human:${value}`))).toString("base64url");
  return Response.json({ ok: true, expires }, { headers: {
    "Cache-Control": "no-store",
    "Set-Cookie": `${humanCookie}=${value}.${signature}; Path=/; Max-Age=1800; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  } });
}
