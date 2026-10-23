import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { siteConfig } from "@/lib/site-config";
import { isLocale, localizedPath } from "@/i18n/config";
import { TripChat } from "@/components/trip/trip-chat";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes | Mi viaje | viatour", robots: { index: false, follow: false } };

// The conversation screen of Mi viaje. Same session as the portal: without it, back to the access form.
// The reservation comes only from the signed cookie; the chat API re-checks it on every request.
export default async function TripMessagesPage() {
  const locale = await getLocale();
  const language = isLocale(locale) ? locale : "es";
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) redirect(localizedPath("/mi-reserva", language));
  const reservation = await createAdminClient().from("reservations").select("codigo,destino").eq("id", reservationId).maybeSingle();
  if (reservation.error || !reservation.data) redirect(localizedPath("/mi-reserva", language));
  const t = await getTranslations("trip.help");
  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(t("whatsappMessage", { destination: reservation.data.destino, code: reservation.data.codigo }))}`;
  return <main className="container-site"><div className="mx-auto max-w-3xl"><TripChat mode="customer" reference={reservation.data.codigo} whatsappHref={whatsappHref} backHref={localizedPath("/mi-reserva", language)} /></div></main>;
}
