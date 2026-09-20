"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieMaxAge, portalCookieName, signPortalReservationId } from "@/lib/portal";

export type PortalAccessState = { error?: string };

const genericAccessError = "No encontramos una reserva con esos datos. Revise la información e inténtelo nuevamente.";
const unavailableError = "No se pudo procesar su solicitud. Inténtelo nuevamente más adelante.";

function clientIp(requestHeaders: Headers) {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) || "unknown";
}

function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function accessReservation(_: PortalAccessState, form: FormData): Promise<PortalAccessState> {
  const codigo = String(form.get("codigo") ?? "").trim();
  const apellido = String(form.get("apellido") ?? "").trim();
  if (!codigo || !apellido || codigo.length > 100 || apellido.length > 120) return { error: genericAccessError };

  try {
    const requestHeaders = await headers();
    const client = createAdminClient();
    const limit = await client.rpc("hit_rate_limit", {
      p_key: `/mi-reserva:${clientIp(requestHeaders)}`,
      p_max: 10,
      p_window_seconds: 3600,
    });
    if (limit.error || limit.data !== true) return { error: unavailableError };

    const result = await client
      .from("reservations")
      .select("id")
      .eq("codigo", codigo)
      .ilike("cliente_apellido", escapeIlike(apellido))
      .maybeSingle();
    if (result.error || !result.data) return { error: genericAccessError };

    const cookieStore = await cookies();
    cookieStore.set({
      name: portalCookieName,
      value: signPortalReservationId(String(result.data.id)),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: portalCookieMaxAge,
    });
  } catch (error) {
    console.error("Portal access failed", { error: error instanceof Error ? error.message : "Unknown error" });
    return { error: unavailableError };
  }

  redirect("/mi-reserva");
}

export async function signOutReservation() {
  const cookieStore = await cookies();
  cookieStore.delete(portalCookieName);
  redirect("/mi-reserva");
}
