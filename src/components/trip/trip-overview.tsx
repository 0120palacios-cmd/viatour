import Image from "next/image";
import { ArrowRight, ArrowUpRight, BedDouble, Car, CheckCircle2, Clock3, Compass, ExternalLink, Gift, Luggage, Mail, MessageCircle, MessagesSquare, Phone, Plane, PlaneTakeoff, ShieldCheck, Share2, Sparkles, Star, Ticket, Video, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CopyButton } from "@/components/trip/copy-button";
import { ServiceRequestButton } from "@/components/trip/service-request";
import { TripFeedback } from "@/components/trip/trip-feedback";
import { siteConfig } from "@/lib/site-config";
import { airlineAction, airlineFor } from "@/lib/airline-links";
import { formatAmount, formatClock, formatDateRange, formatTripDate } from "@/lib/trip-format";
import { nextStepFor, type TripEvent, type TripView } from "@/lib/trip-view";
import { tripChecklist, isLastTripDay, type ChecklistItem } from "@/lib/trip-checklist";
import { tripOffers, type OfferKey } from "@/lib/trip-offers";
import { pendingServices, type LoadedTrip } from "@/lib/trip-model";
import type { ChatSummary } from "@/lib/trip-chat";
import { Action, capitalized, panel, primary, quietButton, secondary, textLink, whatsapp, whatsappUrl, type T, type TripLinks, type TripMode } from "@/components/trip/trip-ui";

const dayNumber = (value: string) => Math.round(Date.parse(`${value}T00:00:00Z`) / 86400000);

// ---------------------------------------------------------------------------------------------------------
// The trip header: destination, dates, countdown, state, who travels, the reservation code and the one
// thing to do next. Full-bleed photo on phones, a framed panel from sm up.

export async function TripHero({ trip, mode, links, locale, t }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; locale: string; t: T }) {
  const { view } = trip;
  const outbound = view.journeys[0];
  const dates = capitalized(formatDateRange(view.start, view.end, locale));
  const countdown = view.stage === "cancelled" || view.stage === "completed" ? null
    : view.timing.kind === "upcoming" ? t("countdown", { days: view.timing.days })
    : view.timing.kind === "today" ? t("startsToday")
    : null; // during the trip the stage pill already says it
  const ready = ["ready", "in_progress", "completed"].includes(view.stage);
  const StatusIcon = view.stage === "cancelled" ? XCircle : ready ? CheckCircle2 : Clock3;
  const photo = trip.image;
  const guideAlt = trip.guide?.hero && photo?.src === trip.guide.hero.image ? trip.guide.hero.alt[locale === "en" ? "en" : "es"] : t("heroAlt", { destination: view.destination });
  const party = [view.party.adults ? t("party.adults", { count: view.party.adults }) : "", view.party.children ? t("party.children", { count: view.party.children }) : "", view.party.infants ? t("party.infants", { count: view.party.infants }) : ""].filter(Boolean).join(", ");

  // One primary action, from what matters most right now.
  const action = view.stage === "cancelled" ? { href: links.messages, label: t("hero.actionMessage"), external: false, customerOnly: false }
    : view.stage === "completed" ? { href: "#opinion", label: t("hero.actionFeedback"), external: false, customerOnly: false }
    : view.finance.balance > 0 && view.stage !== "in_progress" ? { href: whatsappUrl(t("help.paymentMessage", { code: view.reference, amount: formatAmount(view.finance.balance, view.finance.currency) })), label: t("actions.coordinatePayment"), external: true, customerOnly: true }
    : !view.travelersReviewed || !view.travelers.length ? { href: links.section("itinerario"), label: t("hero.actionItinerary"), external: false, customerOnly: false }
    : view.stage === "in_progress" ? { href: links.section("destino"), label: t("hero.actionDestination"), external: false, customerOnly: false }
    : { href: links.section("itinerario"), label: t("hero.actionItinerary"), external: false, customerOnly: false };

  return <section aria-labelledby="trip-destination" className={`relative isolate -mx-4 overflow-hidden bg-brand-deep text-white sm:mx-0 sm:rounded-panel ${view.stage === "cancelled" ? "grayscale-[60%]" : ""}`}>
    {photo ? <>
      <Image src={photo.src} alt={guideAlt} fill priority sizes="(min-width: 1200px) 1152px, 100vw" className="-z-20 object-cover" />
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/95 via-ink/55 to-ink/20" aria-hidden="true" />
    </> : outbound ? <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-4 -z-10 select-none text-[9rem] font-extrabold leading-none tracking-tight text-white/[0.07] sm:-bottom-16 sm:text-[16rem]">{outbound.to.code}</span> : null}
    <div className={`flex flex-col gap-6 px-4 pb-6 pt-5 sm:gap-8 sm:p-10 ${photo ? "min-h-[31rem] justify-between sm:min-h-[34rem]" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="t-small inline-flex items-center gap-2 rounded-full bg-ink/45 px-3 py-1 font-semibold backdrop-blur-sm"><StatusIcon size={16} strokeWidth={2} aria-hidden="true" />{t(`stage.${view.stage}`)}</p>
        {countdown ? <p className="t-small rounded-full bg-ink/30 px-3 py-1 font-semibold text-white backdrop-blur-sm">{countdown}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end lg:gap-12">
        <div className="min-w-0 space-y-5">
          <div>
            <p className="t-small font-semibold text-white/80">{view.stage === "completed" ? t("eyebrowPast") : t("eyebrow")}</p>
            <h1 id="trip-destination" className="t-display mt-1 break-words">{view.destination}</h1>
            <p className="t-body-lg mt-2 text-white/90">{dates || t("datesToConfirm")}{view.tripDays ? <span className="text-white/70"> · {t("days", { count: view.tripDays })}</span> : null}</p>
          </div>
          {outbound ? <div className="max-w-md">
            <p className="sr-only">{t("route", { from: outbound.from.city, to: outbound.to.city })}</p>
            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="min-w-0"><p className="text-2xl font-extrabold tracking-wide sm:text-3xl">{outbound.from.code}</p><p className="t-small truncate font-normal text-white/75">{outbound.from.city}</p></div>
              <div className="flex flex-1 items-center gap-2 pb-6 text-white/50"><span className="flex-1 border-t border-dashed border-white/40" /><Plane size={18} strokeWidth={1.75} className="rotate-45 text-white" /><span className="flex-1 border-t border-dashed border-white/40" /></div>
              <div className="min-w-0 text-right"><p className="text-2xl font-extrabold tracking-wide sm:text-3xl">{outbound.to.code}</p><p className="t-small truncate font-normal text-white/75">{outbound.to.city}</p></div>
            </div>
          </div> : null}
        </div>

        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/20 pt-4 lg:border-t-0 lg:pt-0">
            <div className="col-span-2">
              <dt className="t-small font-normal text-white/70">{t("referenceLabel")}{view.prereservation ? ` · ${t("prereservation")}` : ""}</dt>
              <dd className="-ml-3 flex flex-wrap items-center"><span className="px-3 text-lg font-bold tabular-nums tracking-wide">{view.reference}</span><CopyButton value={view.reference} label={t("copy")} copiedLabel={t("copied")} accessibleLabel={t("copyLabel", { value: view.reference })} tone="dark" /></dd>
            </div>
            {view.travelerCount ? <div className="col-span-2"><dt className="t-small font-normal text-white/70">{t("travelersLabel")}</dt><dd className="font-semibold">{party || t("travelerCount", { count: view.travelerCount })}</dd></div> : null}
          </dl>
          <Action href={action.href} mode={mode} customerOnly={action.customerOnly} external={action.external} className={`${action.customerOnly ? whatsapp : "inline-flex min-h-12 items-center justify-center gap-2 rounded-btn bg-white px-6 py-3 font-semibold text-ink transition-colors duration-(--duration-fast) hover:bg-brand-tint"} w-full`} label={t("preview.disabled")}>{action.customerOnly ? <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" /> : null}{action.label}{action.customerOnly ? null : <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />}</Action>
        </div>
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------------------------------------------------
// "Confirmación de su viaje": the airline's own booking code, the ticket state and how to check it on the
// airline's website. Every statement needs the data that proves it.

function AirlineBadge({ name }: { name: string }) {
  const airline = airlineFor(name);
  const code = airline?.iata ?? name.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(/\s+/).map(word => word[0]).join("").slice(0, 2).toUpperCase();
  return <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-extrabold tracking-wide text-ink" aria-hidden="true">{code || <Plane size={18} strokeWidth={1.75} />}</span>;
}

export function AirlineConfirmation({ view, links, t }: { view: TripView; links: TripLinks; t: T }) {
  if (!view.hasFlights || view.stage === "cancelled") return null;
  const issued = view.travelers.filter(traveler => traveler.ticket === "issued").length;
  const total = view.travelers.length;
  const airlines = view.journeys.flatMap(journey => journey.airlines);
  // Before the airline code exists: say where it will appear, without inventing a state.
  if (!view.confirmations.length) {
    const processing = view.ticketing === "processing";
    return <section aria-labelledby="confirmation-title" className={`${panel} flex items-start gap-4 p-5 sm:p-6`}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true">{processing ? <Ticket size={20} strokeWidth={1.75} /> : <Clock3 size={20} strokeWidth={1.75} />}</span>
      <div className="min-w-0 space-y-1">
        <h2 id="confirmation-title" className="font-bold text-ink">{t("confirmation.title")}</h2>
        <p className="t-small font-normal text-ink-soft">{processing ? t("confirmation.processing") : t("confirmation.pending", { airline: airlines[0] || t("confirmation.theAirline") })}</p>
      </div>
    </section>;
  }
  const recentStage = !["in_progress", "completed"].includes(view.stage);
  return <section aria-labelledby="confirmation-title" className={`${panel} overflow-hidden`}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
      <ShieldCheck size={22} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />
      <h2 id="confirmation-title" className="font-bold text-ink">{t("confirmation.title")}</h2>
      {total ? <p className={`t-small inline-flex items-center gap-1 font-semibold sm:ml-auto ${issued === total ? "text-success" : "text-brand-deep"}`}>{issued === total ? <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" /> : <Clock3 size={16} strokeWidth={2} aria-hidden="true" />}{issued ? t("confirmation.issued", { issued, total }) : view.ticketing === "processing" ? t("confirmation.ticketsProcessing") : t("confirmation.ticketsPending")}</p> : null}
    </div>
    <ul className="divide-y divide-line">{view.confirmations.map(item => {
      const airline = item.airline || airlines[0] || "";
      const action = airlineAction(airline);
      return <li key={`${item.airline}-${item.pnr}`} className="space-y-4 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <AirlineBadge name={airline} />
          <div className="min-w-0 flex-1">
            <p className="t-small font-normal text-ink-soft">{airline ? <span className="font-semibold text-ink">{airline} · </span> : null}{t("travelers.pnr")}</p>
            <div className="-mr-3 flex flex-wrap items-center justify-between gap-x-3">
              <p className="break-all text-[1.75rem] font-extrabold leading-10 tabular-nums tracking-[0.14em] text-ink sm:text-3xl">{item.pnr}</p>
              <CopyButton value={item.pnr} label={t("confirmation.copyPnr")} copiedLabel={t("copied")} accessibleLabel={t("copyLabel", { value: `${t("travelers.pnr")} ${item.pnr}` })} />
            </div>
            <p className="t-small font-normal text-ink-soft">{view.confirmations.length > 1 ? t("travelers.pnrFor", { count: item.travelerIds.length }) : t("confirmation.verify", { airline: action?.airline ?? (airline || t("confirmation.theAirline")) })}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {action ? <a href={action.url} target="_blank" rel="noopener noreferrer" className={`${secondary} w-full sm:w-auto`}>{action.kind === "manage" ? t("airline.manage", { airline: action.airline }) : t("airline.site", { airline: action.airline })}<ExternalLink size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" /><span className="sr-only">{t("opensNewWindow")}</span></a> : <p className="t-small font-normal text-ink-soft">{t("airline.neutral")}</p>}
          <a href={links.section("viajeros")} className={`${textLink} sm:ml-2`}>{t("confirmation.travelersLink")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></a>
        </div>
      </li>;
    })}</ul>
    {total && issued === total && recentStage ? <p className="t-small flex gap-3 border-t border-line bg-surface px-5 py-4 font-normal text-ink sm:px-6"><Clock3 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />{t("airline.sync")}</p> : null}
  </section>;
}

// ---------------------------------------------------------------------------------------------------------
// Where the trip stands (one sentence), the four milestones and "Próximos pasos" for this moment.

function checklistHref(item: ChecklistItem, view: TripView, links: TripLinks, t: T) {
  const airline = airlineAction(view.confirmations[0]?.airline || view.journeys[0]?.airlines[0]);
  switch (item.target) {
    case "travelers": return { href: links.section("viajeros") };
    case "itinerary": return { href: links.section("itinerario") };
    case "documents": return { href: links.section("documentos") };
    case "destination": return { href: links.section("destino") };
    case "services": return { href: `${links.section("destino")}#mejore` };
    case "messages": return { href: links.messages };
    case "requirements": return { href: "/requisitos", internal: true };
    case "airline": return airline ? { href: airline.url, external: true, label: airline.kind === "manage" ? t("airline.manage", { airline: airline.airline }) : t("airline.site", { airline: airline.airline }) } : null;
    case "review": return { href: "#opinion" };
    case "share": return { href: "/gira", internal: true };
    case "referral": return { href: `https://wa.me/?text=${encodeURIComponent(`${t("more.referralMessage")} ${siteConfig.url}`)}`, external: true, customerOnly: true };
    case "next": return { href: "/destinos", internal: true };
    default: return null;
  }
}

export async function TripStatus({ trip, mode, links, t }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; t: T }) {
  const { view } = trip;
  const headline = view.stage === "ready" && !view.hasFlights ? t("headline.readyNoFlights") : t(`headline.${view.stage}`);
  const stageStep = view.nextStep === "balance" ? nextStepFor({ stage: view.stage, balance: 0, travelersReviewed: view.travelersReviewed, hasFlights: view.hasFlights, timing: view.timing }) : view.nextStep;
  const done = ["ready", "in_progress", "completed"].includes(view.stage);
  const Icon = view.stage === "cancelled" ? XCircle : done ? CheckCircle2 : Clock3;
  const tone = view.stage === "cancelled" ? "bg-surface text-error" : done ? "bg-success/10 text-success" : "bg-brand-tint text-brand";
  const milestones = view.milestones;
  const currentIndex = Math.max(0, milestones.findIndex(milestone => milestone.state !== "done"));
  const position = milestones.every(milestone => milestone.state === "done") ? milestones.length - 1 : currentIndex;
  const checklist = tripChecklist(view, { today: trip.today, referral: siteConfig.referralProgram });

  return <section aria-labelledby="trip-status" className={`${panel} p-5 sm:p-6`}>
    <div className="flex items-start gap-4">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true"><Icon size={22} strokeWidth={2} /></span>
      <div className="min-w-0 space-y-1">
        <h2 id="trip-status" className="t-h3 text-ink">{headline}</h2>
        <p className="t-body text-ink-soft">{t(`next.${stageStep}`)}</p>
        {view.estimate ? <p className="t-small font-normal text-ink-soft">{t("next.ticketingEstimate", view.estimate)}</p> : null}
      </div>
    </div>

    {view.stage !== "cancelled" ? <div className="mt-5">
      <p className="t-small font-semibold text-ink sm:hidden" aria-hidden="true">{t("milestones.step", { current: position + 1, total: milestones.length, name: t(`milestones.${milestones[position].key}`) })}</p>
      <ol aria-label={t("milestones.label")} className="mt-2 grid grid-cols-4 gap-2 sm:mt-0">
        {milestones.map(milestone => <li key={milestone.key} className="min-w-0">
          <span aria-hidden="true" className={`block h-1.5 rounded-full ${milestone.state === "done" ? "bg-brand" : milestone.state === "current" ? "bg-brand/35" : "bg-line"}`} />
          <span className={`t-small mt-2 sr-only sm:not-sr-only sm:block ${milestone.state === "upcoming" ? "font-normal text-ink-soft" : "font-semibold text-ink"}`}>{t(`milestones.${milestone.key}`)}<span className="sr-only">: {t(`milestones.${milestone.state}`)}</span></span>
        </li>)}
      </ol>
    </div> : null}

    {checklist.items.length && checklist.phase !== "after" ? <div className="mt-6 border-t border-line pt-5">
      <h3 className="font-semibold text-ink">{t(`checklist.title.${checklist.phase}`)}</h3>
      <ul className="mt-2 divide-y divide-line">{checklist.items.map(item => {
        const target = checklistHref(item, view, links, t);
        const body = item.key === "balance" ? t("checklist.items.balance.body", { amount: formatAmount(view.finance.balance, view.finance.currency) }) : t(`checklist.items.${item.key}.body`);
        const label = target?.label ?? t(`checklist.items.${item.key}.action`);
        const content = <><span className="min-w-0 flex-1"><span className="block font-semibold leading-6 text-ink">{t(`checklist.items.${item.key}.title`)}</span><span className="t-small block font-normal text-ink-soft">{body}</span></span>{target ? <span className="t-small inline-flex shrink-0 items-center gap-1 font-semibold text-brand"><span className="hidden sm:inline">{label}</span>{target.external ? <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" /> : <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />}</span> : null}</>;
        const row = "flex min-h-14 items-center gap-4 py-3";
        return <li key={item.key}>{!target ? <div className={row}><CheckCircle2 size={20} strokeWidth={1.75} className="shrink-0 text-ink-soft/60" aria-hidden="true" />{content}</div>
          : target.internal ? <Link href={target.href} className={`${row} group`} aria-label={`${t(`checklist.items.${item.key}.title`)}: ${label}`}><CheckCircle2 size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{content}</Link>
          : <Action href={target.href} mode={mode} customerOnly={Boolean(target.customerOnly)} external={Boolean(target.external)} className={`${row} group`} label={t("preview.disabled")}><CheckCircle2 size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{content}</Action>}</li>;
      })}</ul>
    </div> : null}
  </section>;
}

// ---------------------------------------------------------------------------------------------------------
// "Lo próximo": the next two or three dated things of the trip, each one tap from the itinerary.

function eventSummary(event: TripEvent, locale: string, t: T) {
  if (event.kind === "flight") return { icon: PlaneTakeoff, title: `${event.journey.from.city} → ${event.journey.to.city}`, detail: [formatClock(event.journey.time, locale), event.journey.legs[0]?.airline && [event.journey.legs[0].airline, event.journey.legs[0].flight].filter(Boolean).join(" ")].filter(Boolean).join(" · ") };
  if (event.kind === "ferry") return { icon: Compass, title: `${event.ferry.fromPort} – ${event.ferry.toPort}`, detail: formatClock(event.ferry.time, locale) };
  if (event.kind === "service") return { icon: event.service.kind === "auto" ? Car : Sparkles, title: event.service.title, detail: [t(`service.${event.service.kind}`), formatClock(event.service.time, locale)].filter(Boolean).join(" · ") };
  return { icon: BedDouble, title: event.hotel.name, detail: event.kind === "checkin" ? t("hotel.checkin") : t("hotel.checkout") };
}

export function UpNext({ trip, links, locale, t }: { trip: LoadedTrip; links: TripLinks; locale: string; t: T }) {
  const { view } = trip;
  if (["cancelled", "completed"].includes(view.stage)) return null;
  const events = view.timeline.flatMap(entry => entry.type === "day" ? entry.events : []).filter(event => event.date >= trip.today && event.kind !== "checkout").slice(0, 3);
  if (!events.length) return null;
  return <section aria-labelledby="upnext-title" className="space-y-3">
    <div className="flex items-end justify-between gap-4"><h2 id="upnext-title" className="t-h3 text-ink">{t("upNext.title")}</h2><a href={links.section("itinerario")} className={textLink}>{t("upNext.all")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></a></div>
    <ol className={`${panel} divide-y divide-line`}>{events.map((event, index) => {
      const item = eventSummary(event, locale, t);
      const days = dayNumber(event.date) - dayNumber(trip.today);
      const when = days === 0 ? t("upNext.today") : days === 1 ? t("upNext.tomorrow") : capitalized(formatTripDate(event.date, locale, "weekday"));
      return <li key={`${event.kind}-${index}`}><a href={links.section("itinerario")} className="flex min-h-16 items-center gap-4 px-5 py-3 transition-colors duration-(--duration-fast) hover:bg-surface sm:px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true"><item.icon size={19} strokeWidth={1.75} /></span>
        <span className="min-w-0 flex-1"><span className="t-small block font-semibold text-brand-deep">{when}</span><span className="block truncate font-semibold text-ink">{item.title}</span>{item.detail ? <span className="t-small block truncate font-normal text-ink-soft">{item.detail}</span> : null}</span>
        <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden="true" />
      </a></li>;
    })}</ol>
  </section>;
}

// ---------------------------------------------------------------------------------------------------------
// Human support, worded for the moment: before the trip, on the travel day, during it, after it.

export function SupportCard({ trip, mode, links, chat, waText, locale, t }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; chat: ChatSummary; waText: string; locale: string; t: T }) {
  const { view } = trip;
  const moment = view.stage === "cancelled" ? "cancelled" : view.stage === "completed" ? "after" : view.stage === "in_progress" ? (view.timing.kind === "today" ? "today" : "during") : view.timing.kind === "today" ? "today" : "before";
  const last = chat.last;
  const when = last?.at ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-HN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Tegucigalpa" }).format(new Date(last.at)) : "";
  return <section aria-labelledby="support-title" className={`${panel} p-5 sm:p-6`}>
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white" aria-hidden="true">v</span>
      <div className="min-w-0">
        <h2 id="support-title" className="font-bold text-ink">{t(`support.${moment}.title`)}</h2>
        <p className="t-small font-normal text-ink-soft">{t(`support.${moment}.body`)}</p>
      </div>
    </div>
    {last ? <a href={links.messages} className="mt-4 block rounded-card bg-surface px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-brand-tint">
      <span className="t-small flex flex-wrap items-center gap-x-2 font-semibold text-ink">{last.from === "agency" ? t("chat.agency") : t("chat.you")}{when ? <span className="font-normal text-ink-soft">{when}</span> : null}{chat.unread ? <span className="rounded-btn bg-brand px-2 text-[12px] leading-5 text-white">{t("quick.unread", { count: chat.unread })}</span> : null}</span>
      <span className="t-small mt-0.5 line-clamp-2 block break-words font-normal text-ink">{last.body || t("chat.attachmentOnly")}</span>
    </a> : null}
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      <a href={links.messages} className={`${primary} w-full`}><MessagesSquare size={18} strokeWidth={1.75} aria-hidden="true" />{t("support.sendMessage")}</a>
      <Action href={whatsappUrl(waText)} mode={mode} customerOnly external className={`${whatsapp} w-full`} label={t("preview.disabled")}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />WhatsApp</Action>
    </div>
    <p className="t-small mt-3 font-normal text-ink-soft">{t("support.reassurance")}</p>
    <ul className="mt-2 flex flex-wrap gap-x-5">
      <li><Action href={`tel:+${siteConfig.whatsappNumber}`} mode={mode} customerOnly className="t-small inline-flex min-h-11 items-center gap-2 text-ink hover:text-brand" label=""><Phone size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><span className="sr-only">{t("help.phone")}: </span>+504 8866-8704</Action></li>
      <li><Action href={`mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(view.reference)}`} mode={mode} customerOnly className="t-small inline-flex min-h-11 items-center gap-2 break-all text-ink hover:text-brand" label=""><Mail size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><span className="sr-only">{t("help.email")}: </span>{siteConfig.supportEmail}</Action></li>
    </ul>
  </section>;
}

// ---------------------------------------------------------------------------------------------------------
// "Complete su viaje": at most three relevant services, never one already bought; the full list lives on
// the destination page.

export const offerIcons: Record<OfferKey, typeof Car> = { hotel: BedDouble, traslado: Car, auto: Car, tour: Compass, seguro: ShieldCheck, equipaje: Luggage, vuelo: Plane, a_medida: Sparkles };

export function offerWhatsapp(t: T, view: TripView, key: OfferKey) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(t("request.whatsappMessage", { service: t(`offers.items.${key}.short`), destination: view.destination, code: view.reference }))}`;
}

export function OffersStrip({ trip, links, t }: { trip: LoadedTrip; links: TripLinks; t: T }) {
  const { view } = trip;
  const offers = tripOffers(view, 3, pendingServices(trip));
  if (!offers.length || view.stage === "completed") return null;
  return <section aria-labelledby="offers-title" className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-x-4"><div><h2 id="offers-title" className="t-h3 text-ink">{view.stage === "in_progress" ? t("offers.titleDuring") : t("offers.title")}</h2><p className="t-small font-normal text-ink-soft">{t("offers.intro")}</p></div><a href={`${links.section("destino")}#mejore`} className={textLink}>{t("offers.all")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></a></div>
    <ul className="chip-row -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">{offers.map(key => {
      const Icon = offerIcons[key];
      return <li key={key} className="flex w-[17rem] shrink-0 snap-start sm:w-auto">
        <div className={`${panel} flex w-full flex-col justify-between gap-4 p-5`}>
          <div className="space-y-2"><Icon size={22} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><h3 className="font-bold leading-6 text-ink">{t(`offers.items.${key}.title`, { destination: view.destination })}</h3><p className="t-small font-normal text-ink-soft">{t(`offers.items.${key}.body`, { destination: view.destination })}</p></div>
          <ServiceRequestButton service={key} endpoint={links.services} title={t(`offers.items.${key}.title`, { destination: view.destination })} label={t(`offers.items.${key}.cta`)} className={`${quietButton} w-full justify-center`} whatsappHref={offerWhatsapp(t, view, key)} />
        </div>
      </li>;
    })}</ul>
  </section>;
}

// ---------------------------------------------------------------------------------------------------------
// After the trip: a private word about the service, then (to everyone, whatever they answered) the public
// review, the "Comparta su viaje y gane" program and referrals. On the last day of a trip, a lighter ask.

export function PostTrip({ trip, mode, links, t }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; t: T }) {
  const { view } = trip;
  const lastDay = isLastTripDay(view, trip.today);
  if (view.stage !== "completed" && !lastDay) return null;
  const card = "flex flex-col justify-between gap-4 rounded-card p-5 sm:p-6";
  const share = `${t("more.referralMessage")} ${siteConfig.url}`;
  return <section id="opinion" aria-labelledby="post-title" className="scroll-mt-28 space-y-4">
    <div className={`${panel} p-5 sm:p-6`}>
      <h2 id="post-title" className="t-h3 text-ink">{lastDay ? t("feedback.softTitle") : t("feedback.title")}</h2>
      <p className="t-small mb-4 font-normal text-ink-soft">{lastDay ? t("feedback.softIntro") : t("feedback.intro")}</p>
      <TripFeedback endpoint={links.feedback} initialRating={trip.feedback?.rating ?? null} soft={lastDay} />
    </div>
    {view.stage === "completed" ? <div className="grid gap-3 md:grid-cols-3">
      <div className={`${card} border border-line bg-canvas`}>
        <div className="space-y-2"><Star size={22} strokeWidth={1.75} className="text-amber" aria-hidden="true" /><h3 className="font-bold text-ink">{t("review.title")}</h3><p className="t-small font-normal text-ink-soft">{t("review.body")}</p></div>
        <div className="flex flex-col gap-1"><Link href={{ pathname: "/opiniones/nueva", query: { destino: view.destination } }} className={textLink}>{t("review.site")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link><Action href={siteConfig.googleReviewUrl} mode={mode} customerOnly external className={textLink} label={t("preview.disabled")}>{t("review.google")}<ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" /></Action></div>
      </div>
      <div className={`${card} bg-ink text-white`}>
        <div className="space-y-2"><Video size={22} strokeWidth={1.75} className="text-white/80" aria-hidden="true" /><h3 className="font-bold">{t("more.videoTitle")}</h3><p className="t-small font-normal text-white/80">{t("more.videoBodyAfter")}</p></div>
        <Link href="/gira" className="t-small inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-white underline-offset-4 hover:underline">{t("more.videoCta")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
      </div>
      {siteConfig.referralProgram ? <div className={`${card} border border-line bg-canvas`}>
        <div className="space-y-2"><Share2 size={22} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><h3 className="font-bold text-ink">{t("more.referralTitle")}</h3><p className="t-small font-normal text-ink-soft">{t("more.referralBody")}</p></div>
        <Action href={`https://wa.me/?text=${encodeURIComponent(share)}`} mode={mode} customerOnly external className={textLink} label={t("preview.disabled")}>{t("more.referralCta")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Action>
      </div> : null}
    </div> : null}
  </section>;
}

// During the trip, one quiet line about the video program; it never competes with the trip itself.
export function DuringTripNote({ trip, t }: { trip: LoadedTrip; t: T }) {
  if (trip.view.stage !== "in_progress") return null;
  return <p className="t-small flex items-start gap-3 rounded-card border border-line p-4 font-normal text-ink"><Gift size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>{t("more.duringNote")} <Link href="/gira" className="font-semibold text-brand underline-offset-4 hover:underline">{t("more.videoCta")}</Link></span></p>;
}

// Ideas for a next trip: featured destinations with their own photo, never the one being travelled to.
export function NextTripIdeas({ trip, t }: { trip: LoadedTrip; t: T }) {
  if (trip.view.stage !== "completed" || !trip.suggestions.length) return null;
  return <section aria-labelledby="next-title" className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-x-4"><h2 id="next-title" className="t-h3 text-ink">{t("more.nextTitle")}</h2><Link href="/destinos" className={textLink}>{t("more.allDestinations")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link></div>
    <ul className="chip-row -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">{trip.suggestions.map(item => <li key={item.slug} className="flex w-64 shrink-0 snap-start sm:w-auto">
      <Link href={`/destinos/${item.slug}`} className="group block w-full overflow-hidden rounded-card border border-line bg-canvas">
        <span className="relative block aspect-[4/3] bg-surface"><Image src={item.image} alt={t("heroAlt", { destination: item.name })} fill loading="lazy" sizes="(min-width: 640px) 360px, 256px" className="object-cover transition-transform duration-(--duration-reveal) group-hover:scale-[1.02] motion-reduce:transition-none" /></span>
        <span className="block p-4"><span className="block font-semibold leading-5 text-ink">{item.name}</span><span className="t-small mt-1 line-clamp-2 font-normal text-ink-soft">{item.intro}</span></span>
      </Link>
    </li>)}</ul>
  </section>;
}
