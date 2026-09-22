"use server";

import { createHash, randomInt } from "node:crypto";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/notifications";
import {
  hashPortalOtp,
  matchesPortalOtp,
  portalCookieMaxAge,
  portalCookieName,
  portalOtpLifetimeSeconds,
  portalOtpMaxAttempts,
  portalPendingCookieName,
  signPortalPendingReservationId,
  signPortalReservationId,
  verifyPortalPendingCookie,
} from "@/lib/portal";
import { siteConfig } from "@/lib/site-config";

export type PortalAccessState = { error?: string; notice?: string; step?: "otp" };

const genericOtpError = "No se pudo verificar el código. Revise la información e inténtelo nuevamente.";
const unavailableError = "No se pudo procesar su solicitud. Inténtelo nuevamente más adelante.";
const accessNotice = "Si los datos coinciden con una reserva, recibirá un código en el correo registrado.";

function clientIp(requestHeaders: Headers) {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) || "unknown";
}

function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function keyHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function hitPortalLimit(client: ReturnType<typeof createAdminClient>, keys: string[], max: number) {
  const results = await Promise.all(keys.map(key => client.rpc("hit_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: 3600,
  })));
  if (results.some(result => result.error || typeof result.data !== "boolean")) throw new Error("Rate limit unavailable");
  return results.every(result => result.data === true);
}

async function registeredEmail(client: ReturnType<typeof createAdminClient>, email: string | null, customerId: string | null) {
  const direct = email?.trim().toLowerCase();
  if (direct && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direct)) return direct;
  if (!customerId) return null;
  const customer = await client.from("customers").select("email").eq("id", customerId).maybeSingle();
  const fallback = typeof customer.data?.email === "string" ? customer.data.email.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallback) ? fallback : null;
}

function cookieOptions(maxAge: number, path: string) {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path, maxAge };
}

export async function accessReservation(_: PortalAccessState, form: FormData): Promise<PortalAccessState> {
  const codigo = String(form.get("codigo") ?? "").trim();
  const apellido = String(form.get("apellido") ?? "").trim();
  if (!codigo || !apellido || codigo.length > 100 || apellido.length > 120) return { notice: accessNotice, step: "otp" };

  try {
    const requestHeaders = await headers();
    const client = createAdminClient();
    const ip = clientIp(requestHeaders);
    const limited = await hitPortalLimit(client, [
      `/mi-reserva:step1:ip:${keyHash(ip)}`,
      `/mi-reserva:step1:codigo:${keyHash(codigo.toLowerCase())}`,
    ], 10);
    if (!limited) return { notice: accessNotice, step: "otp" };

    const result = await client
      .from("reservations")
      .select("id,cliente_email,customer_id")
      .eq("codigo", codigo)
      .ilike("cliente_apellido", escapeIlike(apellido))
      .maybeSingle();
    if (result.error || !result.data) return { notice: accessNotice, step: "otp" };

    const email = await registeredEmail(client, result.data.cliente_email, result.data.customer_id);
    if (!email) return { notice: accessNotice, step: "otp" };

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + portalOtpLifetimeSeconds * 1000).toISOString();
    const reservationId = String(result.data.id);
    await client.from("portal_otps").delete().eq("reservation_id", reservationId);
    const inserted = await client.from("portal_otps").insert({
      reservation_id: reservationId,
      code_hash: hashPortalOtp(reservationId, otp),
      expires_at: expiresAt,
      attempts: 0,
    }).select("id").single();
    if (inserted.error) return { error: unavailableError, step: "otp" };

    try {
      await sendResendEmail({
        idempotencyKey: `portal-otp/${inserted.data.id}`,
        from: siteConfig.portalOtpFrom,
        to: [email],
        replyTo: siteConfig.supportEmail,
        subject: "Código de acceso a su reserva | viatour",
        text: `Estimado cliente:\n\nSu código de acceso a la reserva es: ${otp}\n\nEste código es válido por 10 minutos y solo puede utilizarse una vez. Si usted no solicitó este acceso, puede ignorar este correo.\n\nSaludos,\nviatour | asesores de viaje`,
      });
    } catch {
      await client.from("portal_otps").delete().eq("id", inserted.data.id);
      return { error: unavailableError, step: "otp" };
    }

    const cookieStore = await cookies();
    cookieStore.delete(portalCookieName);
    cookieStore.set({ name: portalPendingCookieName, value: signPortalPendingReservationId(reservationId), ...cookieOptions(portalOtpLifetimeSeconds, "/mi-reserva") });
    return { notice: accessNotice, step: "otp" };
  } catch {
    return { error: unavailableError, step: "otp" };
  }
}

export async function verifyPortalOtp(_: PortalAccessState, form: FormData): Promise<PortalAccessState> {
  const otp = String(form.get("otp") ?? "").trim();
  if (!/^\d{6}$/.test(otp)) return { error: genericOtpError, step: "otp" };

  try {
    const requestHeaders = await headers();
    const pendingId = verifyPortalPendingCookie((await cookies()).get(portalPendingCookieName)?.value);
    const client = createAdminClient();
    const ip = clientIp(requestHeaders);
    const limited = await hitPortalLimit(client, [
      `/mi-reserva:step2:ip:${keyHash(ip)}`,
      `/mi-reserva:step2:codigo:${keyHash(otp)}`,
    ], 10);
    if (!limited || !pendingId) return { error: genericOtpError, step: "otp" };

    const current = await client.from("portal_otps")
      .select("id,reservation_id,code_hash,expires_at,attempts")
      .eq("reservation_id", pendingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (current.error || !current.data) return { error: genericOtpError, step: "otp" };

    const row = current.data;
    const attempts = Number(row.attempts);
    const expired = Date.parse(String(row.expires_at)) <= Date.now();
    if (expired || attempts >= portalOtpMaxAttempts) return { error: genericOtpError, step: "otp" };

    const matches = matchesPortalOtp(pendingId, otp, String(row.code_hash));
    if (!matches) {
      await client.from("portal_otps").update({ attempts: attempts + 1 }).eq("id", row.id).eq("attempts", attempts);
      return { error: genericOtpError, step: "otp" };
    }

    const consumed = await client.from("portal_otps").delete().eq("id", row.id).eq("attempts", attempts).select("id").maybeSingle();
    if (consumed.error || !consumed.data) return { error: genericOtpError, step: "otp" };

    const cookieStore = await cookies();
    cookieStore.delete(portalPendingCookieName);
    cookieStore.set({ name: portalCookieName, value: signPortalReservationId(pendingId), ...cookieOptions(portalCookieMaxAge, "/") });
  } catch {
    return { error: genericOtpError, step: "otp" };
  }

  redirect("/mi-reserva");
}

export async function signOutReservation() {
  const cookieStore = await cookies();
  cookieStore.delete(portalCookieName);
  cookieStore.delete(portalPendingCookieName);
  redirect("/mi-reserva");
}
