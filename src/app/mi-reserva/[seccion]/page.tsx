import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PortalSignedIn } from "@/components/portal/access-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { loadChatSummary, loadTrip } from "@/lib/trip-data";
import { isLocale, localizedPath } from "@/i18n/config";
import { SignOutButton, TripPortal } from "@/components/trip/trip-portal";
import { customerLinks } from "@/components/trip/customer-links";
import { tripSubpages, type TripSubpage } from "@/components/trip/trip-ui";
import { signOutReservation } from "../actions";

export const dynamic = "force-dynamic";

const isSubpage = (value: string): value is TripSubpage => (tripSubpages as readonly string[]).includes(value);

export async function generateMetadata({ params }: { params: Promise<{ seccion: string }> }): Promise<Metadata> {
  const { seccion } = await params;
  const t = await getTranslations("trip.sections");
  return { title: `${isSubpage(seccion) ? t(seccion) : t("resumen")} | Mi viaje | viatour`, robots: { index: false, follow: false } };
}

// One section of Mi viaje (itinerario, viajeros, documentos, destino). Same session as the summary: without
// it, back to the access form. The reservation comes only from the signed cookie.
export default async function TripSectionPage({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  if (!isSubpage(seccion)) notFound();
  const locale = await getLocale();
  const language = isLocale(locale) ? locale : "es";
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) redirect(localizedPath("/mi-reserva", language));
  const t = await getTranslations("trip");
  const client = createAdminClient();
  const [trip, chat] = await Promise.all([loadTrip(client, reservationId), loadChatSummary(client, reservationId)]);
  if (!trip) redirect(localizedPath("/mi-reserva", language));
  return <main className="container-site pb-24 pt-4 sm:pt-8 lg:pb-32"><div className="mx-auto max-w-6xl">
    <PortalSignedIn />
    <TripPortal trip={trip} mode="customer" section={seccion} links={customerLinks(language)} chat={chat} signOut={<SignOutButton action={signOutReservation} label={t("signOut")} />} />
  </div></main>;
}
