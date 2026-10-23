import type { Metadata } from "next";
import { cookies } from "next/headers";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { FileText, MapPin, MessageCircle, Plane, Receipt, ShieldCheck, Ticket } from "lucide-react";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { localizedPageMetadata } from "@/lib/seo";
import { PortalAccessForm, PortalSignedIn } from "@/components/portal/access-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, portalPendingCookieName, verifyPortalCookie, verifyPortalPendingCookie } from "@/lib/portal";
import { loadChatSummary, loadTrip } from "@/lib/trip-data";
import { isLocale } from "@/i18n/config";
import { SignOutButton, TripPortal } from "@/components/trip/trip-portal";
import { customerLinks } from "@/components/trip/customer-links";
import { signOutReservation } from "../actions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { ...(await localizedPageMetadata("/mi-reserva", "reservation")), robots: { index: false, follow: false } }; }

// A reservation code from an email link ("?ref=VT-1A2B3C4D") only prefills the first field; access still
// needs the surname and the one-time code sent to the registered email.
function prefilledReference(value: string | string[] | undefined) {
  const reference = Array.isArray(value) ? value[0] : value;
  return reference && /^[A-Z]{2,4}-[A-Z0-9]{4,12}$/i.test(reference) ? reference.toUpperCase() : "";
}

function AccessPanel({ showOtp = false, reference = "", notice = "" }: { showOtp?: boolean; reference?: string; notice?: string }) {
  const t = useTranslations("portal");
  return <section className="rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8" aria-labelledby="portal-access-title">
    <h1 id="portal-access-title" className="t-h1">{t("accessTitle")}</h1>
    <p className="t-body mt-3 text-ink-soft">{t("accessBody")}</p>
    {notice ? <p className="t-small mt-4 rounded-card bg-surface p-4 font-normal text-ink" role="status">{notice}</p> : null}
    <div className="mt-8"><PortalAccessForm showOtp={showOtp} reference={reference} /></div>
  </section>;
}

// Signed-out view: the access card first (it holds the H1), and beside it what Mi viaje holds and how to get help.
function AccessView({ showOtp, reference }: { showOtp: boolean; reference: string }) {
  const t = useTranslations("portal"); const v3 = useTranslations("v3"); const trip = useTranslations("trip.sections");
  const sections = [{ icon: Plane, label: trip("itinerario") }, { icon: Ticket, label: trip("viajeros") }, { icon: FileText, label: trip("documentos") }, { icon: Receipt, label: trip("pagos") }, { icon: MapPin, label: trip("destino") }, { icon: MessageCircle, label: trip("mensajes") }];
  return <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
    <div className="lg:order-last"><AccessPanel showOtp={showOtp} reference={reference} /></div>
    <section aria-labelledby="portal-benefits-title" className="space-y-8 lg:pt-8">
      <div className="space-y-2"><h2 id="portal-benefits-title" className="t-h2">{v3("portalBenefitsTitle")}</h2><p className="t-body text-ink-soft">{t("headerMessage")}</p></div>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">{sections.map(({ icon: Icon, label }) => <li key={label} className="t-small inline-flex items-center gap-2 font-semibold text-ink"><Icon size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{label}</li>)}</ul>
      <p className="t-small flex gap-3 font-normal text-ink-soft"><ShieldCheck size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{v3("portalSecurity")}</p>
      <div className="space-y-3 border-t border-line pt-6"><p className="t-body font-semibold text-ink">{v3("portalHelpTitle")}</p><p className="t-small font-normal text-ink-soft">{v3("portalHelpBody")}</p><WhatsAppLink placement="mi-reserva" /></div>
    </section>
  </div>;
}

async function SignedInPortal({ reservationId }: { reservationId: string }) {
  const t = await getTranslations("trip");
  const locale = await getLocale();
  const client = createAdminClient();
  const [trip, chat] = await Promise.all([loadTrip(client, reservationId), loadChatSummary(client, reservationId)]);
  if (!trip) return <div className="mx-auto max-w-xl"><AccessPanel notice={t("states.notFound")} /></div>;
  return <>
    <PortalSignedIn />
    <TripPortal trip={trip} mode="customer" links={customerLinks(isLocale(locale) ? locale : "es")} chat={chat} signOut={<SignOutButton action={signOutReservation} label={t("signOut")} />} />
  </>;
}

export default async function MiReservaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cookieStore = await cookies();
  const reservationId = verifyPortalCookie(cookieStore.get(portalCookieName)?.value);
  const pendingId = verifyPortalPendingCookie(cookieStore.get(portalPendingCookieName)?.value);
  const reference = prefilledReference((await searchParams).ref);
  return <main className="container-site pb-24 pt-4 sm:pt-8 lg:pb-32"><div className="mx-auto max-w-6xl">{reservationId ? <SignedInPortal reservationId={reservationId} /> : <div className="section-space !pt-0 sm:!pt-6"><AccessView showOtp={Boolean(pendingId)} reference={reference} /></div>}</div></main>;
}
