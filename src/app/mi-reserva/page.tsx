import type { Metadata } from "next";
import { cookies } from "next/headers";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { FileText, LifeBuoy, Map, MessageCircle, Receipt, ShieldCheck } from "lucide-react";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { localizedPageMetadata } from "@/lib/seo";
import { PortalAccessForm, PortalSignedIn } from "@/components/portal/access-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, portalPendingCookieName, verifyPortalCookie, verifyPortalPendingCookie } from "@/lib/portal";
import { loadTrip } from "@/lib/trip-data";
import { SignOutButton, TripPortal, type TripLinks } from "@/components/trip/trip-portal";
import { signOutReservation } from "./actions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { ...(await localizedPageMetadata("/mi-reserva", "reservation")), robots: { index: false, follow: false } }; }

// Every link is scoped by the session cookie on the server; none of them carries a reservation ID.
const customerLinks: TripLinks = {
  itinerary: "/api/mi-reserva/itinerario?inline=1",
  calendar: "/api/mi-reserva/itinerario?format=ics",
  confirmation: "/api/mi-reserva/pdf?inline=1",
  receipt: id => `/api/mi-reserva/recibos/${id}?inline=1`,
  document: path => `/api/mi-reserva/documentos?ruta=${encodeURIComponent(path)}`,
};

// A reservation code from an email link ("?ref=VT-1A2B3C4D") only prefills the first field; access still
// needs the surname and the one-time code sent to the registered email.
function prefilledReference(value: string | string[] | undefined) {
  const reference = Array.isArray(value) ? value[0] : value;
  return reference && /^[A-Z]{2,4}-[A-Z0-9]{4,12}$/i.test(reference) ? reference.toUpperCase() : "";
}

function AccessPanel({ showOtp = false, reference = "" }: { showOtp?: boolean; reference?: string }) {
  const t = useTranslations("portal");
  return <section className="mx-auto max-w-xl rounded-panel border bg-canvas p-6 shadow-sm sm:p-8" aria-labelledby="portal-access-title"><p className="t-small text-brand">{t("accessEyebrow")}</p><h1 id="portal-access-title" className="t-h1 mt-2">{t("accessTitle")}</h1><p className="mt-4 text-ink-soft">{t("accessBody")}</p><div className="mt-8"><PortalAccessForm showOtp={showOtp} reference={reference} /></div></section>;
}

// Signed-out view: the access card first (it holds the H1), and beside it what the portal shows and how to get help.
function AccessView({ showOtp, reference }: { showOtp: boolean; reference: string }) {
  const t = useTranslations("portal"); const v3 = useTranslations("v3"); const trip = useTranslations("trip.nav");
  const sections = [{ icon: Map, label: trip("itinerary") }, { icon: FileText, label: trip("documents") }, { icon: MessageCircle, label: trip("messages") }, { icon: Receipt, label: trip("payments") }, { icon: LifeBuoy, label: trip("help") }];
  return <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-12">
    <div className="lg:order-last"><AccessPanel showOtp={showOtp} reference={reference} /></div>
    <section aria-labelledby="portal-benefits-title" className="space-y-6 rounded-panel border border-line bg-surface p-6 sm:p-8">
      <div className="space-y-2"><h2 id="portal-benefits-title" className="t-h2">{v3("portalBenefitsTitle")}</h2><p className="t-body text-ink-soft">{t("headerMessage")}</p></div>
      <ul className="grid gap-3 sm:grid-cols-2">{sections.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-3 rounded-card border border-line bg-canvas p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="t-small font-semibold text-ink">{label}</span></li>)}</ul>
      <p className="t-small flex gap-3 font-normal text-ink-soft"><ShieldCheck size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{v3("portalSecurity")}</p>
      <div className="space-y-3 border-t border-line pt-6"><p className="t-body font-semibold text-ink">{v3("portalHelpTitle")}</p><p className="t-small font-normal text-ink-soft">{v3("portalHelpBody")}</p><WhatsAppLink placement="mi-reserva" /></div>
    </section>
  </div>;
}

async function SignedInPortal({ reservationId }: { reservationId: string }) {
  const t = await getTranslations("trip");
  const trip = await loadTrip(createAdminClient(), reservationId);
  if (!trip) return <AccessPanel />;
  return <>
    <PortalSignedIn />
    <TripPortal trip={trip} mode="customer" links={customerLinks} signOut={<SignOutButton action={signOutReservation} label={t("signOut")} />} />
  </>;
}

export default async function MiReservaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cookieStore = await cookies();
  const reservationId = verifyPortalCookie(cookieStore.get(portalCookieName)?.value);
  const pendingId = verifyPortalPendingCookie(cookieStore.get(portalPendingCookieName)?.value);
  const reference = prefilledReference((await searchParams).ref);
  return <main className="container-site pb-24 pt-6 sm:pt-10 lg:pb-32"><div className="mx-auto max-w-6xl">{reservationId ? <SignedInPortal reservationId={reservationId} /> : <div className="section-space !pt-0 sm:!pt-6"><AccessView showOtp={Boolean(pendingId)} reference={reference} /></div>}</div></main>;
}
