import { getLocale, getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { firstName, formatAmount } from "@/lib/trip-format";
import type { LoadedTrip } from "@/lib/trip-model";
import type { ChatSummary } from "@/lib/trip-chat";
import { TripBottomBar, TripStrip, TripTabs } from "@/components/trip/trip-shell";
import { AirlineConfirmation, DuringTripNote, NextTripIdeas, OffersStrip, PostTrip, SupportCard, TripHero, TripStatus, UpNext } from "@/components/trip/trip-overview";
import { TripItinerary } from "@/components/trip/trip-itinerary";
import { TripDocuments, TripTravelers } from "@/components/trip/trip-records";
import { TripDestinationPage } from "@/components/trip/trip-destination-page";
import type { TripLinks, TripMode, TripSection } from "@/components/trip/trip-ui";

export type { TripLinks, TripMode, TripSection } from "@/components/trip/trip-ui";

// The whole traveller experience, shared by /mi-reserva, the admin client preview and the local QA
// fixtures, so all three render the same thing. One page per section (resumen, itinerario, viajeros,
// documentos, destino); the conversation is its own screen (/mi-reserva/mensajes).
// `signOut` is the customer's sign-out form (absent in the preview).
export async function TripPortal({ trip, mode, links, section = "resumen", signOut, chat }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; section?: Exclude<TripSection, "mensajes">; signOut?: React.ReactNode; chat: ChatSummary }) {
  const t = await getTranslations("trip");
  const locale = await getLocale();
  const { view } = trip;
  const waText = t("help.whatsappMessage", { destination: view.destination, code: view.reference });
  const name = firstName(trip.customerName);
  const summary = section === "resumen";
  return <div data-trip-portal className="space-y-6 pb-4 sm:space-y-8">
    {mode === "preview" ? <div role="note" className="rounded-card border border-brand/40 bg-brand-tint p-4"><p className="font-semibold text-brand-deep">{t("preview.badge")}</p><p className="t-small mt-1 font-normal text-ink">{t("preview.body")}</p>{view.finance.adjusted ? <p className="t-small mt-2 font-semibold text-error">{t("preview.adjusted", { shown: formatAmount(view.finance.total, view.finance.currency), reservation: formatAmount(view.finance.reservationTotal, view.finance.currency) })}</p> : null}</div> : null}
    <div className="flex min-h-11 items-center justify-between gap-4">
      {summary ? <p className="t-small font-semibold text-ink">{name ? t("greeting", { name }) : t("title")}</p> : <TripStrip trip={trip} locale={locale} t={t} />}
      {signOut}
    </div>

    {summary ? <TripHero trip={trip} mode={mode} links={links} locale={locale} t={t} /> : null}
    <TripTabs section={section} links={links} chat={chat} t={t} />

    {summary ? <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <div className="min-w-0 space-y-6 sm:space-y-8">
        {/* After the trip, how it went comes first; before it, the proof that it is booked. */}
        {view.stage === "completed" ? <PostTrip trip={trip} mode={mode} links={links} t={t} /> : null}
        <AirlineConfirmation view={view} links={links} t={t} />
        <TripStatus trip={trip} mode={mode} links={links} t={t} />
        {view.stage !== "completed" ? <PostTrip trip={trip} mode={mode} links={links} t={t} /> : null}
        <UpNext trip={trip} links={links} locale={locale} t={t} />
        <OffersStrip trip={trip} links={links} t={t} />
        <DuringTripNote trip={trip} t={t} />
        <NextTripIdeas trip={trip} t={t} />
      </div>
      <aside className="space-y-6 lg:sticky lg:top-28" aria-label={t("support.label")}>
        <SupportCard trip={trip} mode={mode} links={links} chat={chat} waText={waText} locale={locale} t={t} />
      </aside>
    </div>
      : section === "itinerario" ? <TripItinerary trip={trip} links={links} locale={locale} t={t} />
      : section === "viajeros" ? <TripTravelers trip={trip} links={links} t={t} />
      : section === "documentos" ? <TripDocuments trip={trip} mode={mode} links={links} locale={locale} t={t} />
      : <TripDestinationPage trip={trip} links={links} locale={locale} t={t} />}

    <TripBottomBar section={section} links={links} chat={chat} t={t} />
  </div>;
}

export function SignOutButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return <form action={action}><button type="submit" className="t-small inline-flex min-h-11 items-center gap-2 rounded-btn border border-line px-4 font-semibold text-ink hover:bg-surface"><LogOut size={16} strokeWidth={1.75} aria-hidden="true" />{label}</button></form>;
}
