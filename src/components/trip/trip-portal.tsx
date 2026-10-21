import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { XCircle, ArrowRight, BedDouble, CalendarDays, CalendarPlus, Check, CircleDot, Download, FileText, Hotel, LifeBuoy, LogOut, Luggage, Mail, MapPin, MessageCircle, Phone, Plane, Receipt, Ship, ShieldCheck, Sparkles, Ticket, Upload, Users, CarFront, Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { DocumentUploadForm } from "@/components/portal/document-upload-form";
import { FlightJourneyCard } from "@/components/trip/flight-journey";
import { MessagesPanel } from "@/components/trip/messages-panel";
import { siteConfig } from "@/lib/site-config";
import { firstName, formatAmount, formatClock, formatDateRange, formatTripDate, googleMapsUrl } from "@/lib/trip-format";
import type { LoadedTrip } from "@/lib/trip-data";
import type { MessageThread } from "@/lib/reservation-messages";
import type { HotelView, ServiceView, TripDocument, TripEvent, TripView } from "@/lib/trip-view";

export type TripMode = "customer" | "preview";
// Where each document opens. The customer portal points to /api/mi-reserva/* (session-scoped); the admin
// preview points to the admin routes of the same reservation, so every visible link works in both.
export type TripLinks = {
  itinerary: string; calendar: string; confirmation: string;
  receipt: (id: string) => string; document: (path: string) => string;
};

const card = "rounded-panel border border-line bg-canvas";
const sectionTitle = "t-h2 scroll-mt-36";
const primary = buttonVariants({ variant: "default" });
const whatsapp = buttonVariants({ variant: "whatsapp" });
const secondary = buttonVariants({ variant: "ghost" });
const textLink = "t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline";

function whatsappUrl(text: string) { return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`; }

// In the admin preview, actions that only make sense for the customer (WhatsApp from their phone, sending,
// uploading, signing out) are shown but inert, so the layout matches without acting on the customer's behalf.
function Action({ href, mode, customerOnly = false, external = false, className, children, label }: { href: string; mode: TripMode; customerOnly?: boolean; external?: boolean; className: string; children: React.ReactNode; label: string }) {
  if (mode === "preview" && customerOnly) return <span className={`${className} cursor-not-allowed opacity-60`} aria-disabled="true" title={label}>{children}</span>;
  return <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
}

function capitalized(text: string) { return text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text; }

async function Hero({ trip, locale }: { trip: LoadedTrip; locale: string }) {
  const t = await getTranslations("trip");
  const { view } = trip;
  const dates = formatDateRange(view.start, view.end, locale);
  // No countdown for a cancelled trip.
  const countdown = view.stage === "cancelled" ? null : view.timing.kind === "upcoming" ? t("countdown", { days: view.timing.days }) : view.timing.kind === "today" ? t("startsToday") : view.timing.kind === "ongoing" ? t("ongoing") : view.timing.kind === "ended" ? t("ended") : null;
  const facts = [
    view.travelerCount ? { icon: Users, text: t("travelerCount", { count: view.travelerCount }) } : null,
    view.tripDays ? { icon: CalendarDays, text: t("days", { count: view.tripDays }) } : null,
    view.origin ? { icon: Plane, text: t("from", { city: view.origin.city }) } : null,
  ].filter(Boolean) as { icon: typeof Users; text: string }[];
  return <section aria-labelledby="trip-destination" className="relative isolate overflow-hidden rounded-panel bg-brand-deep text-white">
    {trip.image ? <>
      <Image src={trip.image.src} alt={t("heroAlt", { destination: view.destination })} fill priority sizes="(min-width: 1200px) 1152px, 100vw" className="-z-20 object-cover" />
      <span className="absolute inset-0 -z-10 bg-ink/55" aria-hidden="true" />
    </> : null}
    <div className="flex min-h-[18rem] flex-col justify-end gap-5 p-6 sm:min-h-[20rem] sm:p-10">
      {countdown ? <p className="t-small inline-flex w-fit items-center gap-2 rounded-btn bg-white/15 px-3 py-1 font-semibold"><CircleDot size={14} strokeWidth={2} aria-hidden="true" />{countdown}</p> : null}
      <div className="min-w-0">
        <p className="t-small font-semibold text-white/80">{t("eyebrow")}</p>
        <h1 id="trip-destination" className="t-display mt-1 break-words">{view.destination}</h1>
        <p className="t-body-lg mt-2 text-white/90">{dates || t("datesToConfirm")}</p>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t("reference", { code: view.reference })}>
        {facts.map(({ icon: Icon, text }) => <li key={text} className="t-small inline-flex items-center gap-2 text-white/90"><Icon size={16} strokeWidth={1.75} aria-hidden="true" />{text}</li>)}
        <li className="t-small inline-flex items-center gap-2 font-semibold tabular-nums text-white"><Ticket size={16} strokeWidth={1.75} aria-hidden="true" />{t("reference", { code: view.reference })}{view.prereservation ? ` · ${t("prereservation")}` : ""}</li>
      </ul>
    </div>
  </section>;
}

async function StatusPanel({ view, mode, links, waText }: { view: TripView; mode: TripMode; links: TripLinks; waText: string }) {
  const t = await getTranslations("trip");
  const nextText = view.nextStep === "balance" ? t("next.balance", { amount: formatAmount(view.finance.balance, view.finance.currency) }) : t(`next.${view.nextStep}`);
  const itineraryReady = view.documents.some(document => document.key === "itinerary" && document.status === "available");
  const actions: React.ReactNode[] = [];
  const wa = (label: string) => <Action key="wa" href={whatsappUrl(waText)} mode={mode} customerOnly external className={whatsapp} label={t("preview.disabled")}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{label}</Action>;
  if (["balance", "cancelled", "inProgress"].includes(view.nextStep)) actions.push(wa(view.nextStep === "balance" ? t("actions.coordinatePayment") : t("actions.whatsapp")));
  if (["ready", "readySoon", "inProgress"].includes(view.nextStep) && itineraryReady) actions.push(<Action key="it" href={links.itinerary} mode={mode} className={view.nextStep === "inProgress" ? secondary : primary} label=""><Download size={18} strokeWidth={1.75} aria-hidden="true" />{t("actions.downloadItinerary")}</Action>);
  if (["ready", "readySoon"].includes(view.nextStep)) actions.push(<Link key="req" href="/requisitos" className={secondary}>{t("actions.requirements")}</Link>);
  if (["travelersReview", "awaitingConfirmation", "awaitingTickets", "ticketing", "awaitingDocuments"].includes(view.nextStep)) {
    if (view.timeline.length) actions.push(<a key="view" href="#itinerario" className={primary}>{t("actions.viewItinerary")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></a>);
    actions.push(<a key="msg" href="#mensajes" className={secondary}><MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />{t("actions.sendMessage")}</a>);
  }
  if (view.nextStep === "completed") actions.push(<Link key="review" href="/opiniones/nueva" className={primary}>{t("actions.leaveReview")}</Link>);

  return <section aria-labelledby="trip-status" className={`${card} p-5 sm:p-8`}>
    <div className="flex items-start gap-4">
      <span className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-full ${view.stage === "cancelled" ? "bg-surface text-error" : view.stage === "ready" || view.stage === "completed" ? "bg-success/10 text-success" : "bg-brand-tint text-brand"}`} aria-hidden="true">{view.stage === "ready" || view.stage === "completed" ? <Check size={22} strokeWidth={2} /> : view.stage === "cancelled" ? <XCircle size={22} strokeWidth={1.75} /> : <Sparkles size={20} strokeWidth={1.75} />}</span>
      <div className="min-w-0">
        <h2 id="trip-status" className="t-h2">{t(`stage.${view.stage}`)}</h2>
        <p className="t-body mt-1 text-ink-soft">{t(`stage.${view.stage}Body`)}</p>
      </div>
    </div>

    <ol aria-label={t("milestones.label")} className="mt-6 grid gap-3 sm:grid-cols-4 sm:gap-2">
      {view.milestones.map((milestone, index) => <li key={milestone.key} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
        <span className="flex w-full max-sm:w-auto items-center gap-2" aria-hidden="true">
          <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${milestone.state === "done" ? "border-success bg-success text-white" : milestone.state === "current" ? "border-brand bg-canvas text-brand" : "border-line bg-canvas text-line"}`}>{milestone.state === "done" ? <Check size={14} strokeWidth={3} /> : <span className={`size-2 rounded-full ${milestone.state === "current" ? "bg-brand" : "bg-line"}`} />}</span>
          {index < view.milestones.length - 1 ? <span className={`hidden h-0.5 flex-1 sm:block ${milestone.state === "done" ? "bg-success" : "bg-line"}`} /> : null}
        </span>
        <span className={`t-small ${milestone.state === "upcoming" ? "font-normal text-ink-soft" : "font-semibold text-ink"}`}>{t(`milestones.${milestone.key}`)}<span className="sr-only"> · {t(`milestones.${milestone.state}`)}</span></span>
      </li>)}
    </ol>

    <div className="mt-6 rounded-card bg-brand-tint p-4 sm:p-5">
      <h3 className="t-small font-semibold text-brand-deep">{t("next.title")}</h3>
      <p className="t-body mt-1 text-ink">{nextText}</p>
      {view.estimate ? <p className="t-small mt-1 font-normal text-ink-soft">{t("next.ticketingEstimate", view.estimate)}</p> : null}
      {actions.length ? <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
    </div>
  </section>;
}

async function SectionNav({ view, offsetClass }: { view: TripView; offsetClass: string }) {
  const t = await getTranslations("trip.nav");
  const items = [
    view.timeline.length || view.undated.length ? ["itinerario", t("itinerary")] : null,
    ["viajeros", t("travelers")],
    ["documentos", t("documents")],
    ["mensajes", t("messages")],
    ["pagos", t("payments")],
    ["ayuda", t("help")],
  ].filter(Boolean) as [string, string][];
  return <nav aria-label={t("label")} className={`sticky ${offsetClass} z-20 -mx-4 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-2`}>
    <ul className="chip-row flex gap-1 overflow-x-auto py-2">{items.map(([id, label]) => <li key={id}><a href={`#${id}`} className="t-small inline-flex min-h-11 items-center whitespace-nowrap rounded-btn px-3 font-semibold text-ink-soft hover:bg-surface hover:text-brand">{label}</a></li>)}</ul>
  </nav>;
}

async function HotelCard({ hotel, phase, photo, locale }: { hotel: HotelView; phase: "checkin" | "checkout"; photo?: string; locale: string }) {
  const t = await getTranslations("trip");
  if (phase === "checkout") return <article className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-surface text-ink-soft"><BedDouble size={20} strokeWidth={1.75} aria-hidden="true" /></span>
    <div className="min-w-0"><p className="t-small font-semibold text-ink-soft">{t("hotel.checkout")}</p><h4 className="font-semibold text-ink">{hotel.name}</h4></div>
  </article>;
  return <article className="overflow-hidden rounded-card border border-line bg-canvas">
    {photo ? <div className="relative aspect-[16/7] bg-surface"><Image src={photo} alt={hotel.name} fill unoptimized loading="lazy" sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" /></div> : null}
    <div className="space-y-3 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Hotel size={20} strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="min-w-0"><p className="t-small font-semibold text-brand">{t("hotel.checkin")}</p><h4 className="t-h3 break-words">{hotel.name}</h4>{hotel.city ? <p className="t-small font-normal text-ink-soft">{hotel.city}</p> : null}</div>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div><dt className="t-small text-ink-soft">{t("hotel.checkin")}</dt><dd className="font-semibold">{capitalized(formatTripDate(hotel.checkIn, locale, "weekday"))}</dd></div>
        <div><dt className="t-small text-ink-soft">{t("hotel.checkout")}</dt><dd className="font-semibold">{capitalized(formatTripDate(hotel.checkOut, locale, "weekday"))}</dd></div>
        {hotel.nights ? <div><dt className="t-small text-ink-soft">{t("nights", { count: hotel.nights })}</dt><dd className="font-semibold">{hotel.mealPlan || "—"}</dd></div> : null}
      </dl>
      {hotel.rooms.filter(room => room.category || room.adults).map((room, index) => <p key={index} className="t-small font-normal text-ink"><span className="font-semibold">{room.count > 1 ? `${room.count} × ` : ""}{room.category || t("hotel.room")}</span>{room.beds ? ` · ${room.beds}` : ""} · {t("hotel.guests", { adults: room.adults, children: room.children })}</p>)}
      {hotel.included.length ? <p className="t-small font-normal text-ink-soft"><span className="font-semibold text-ink">{t("hotel.included")}:</span> {hotel.included.join(" · ")}</p> : null}
      {hotel.address ? <p className="t-small flex gap-2 font-normal text-ink-soft"><MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />{hotel.address}</p> : null}
      {hotel.mapQuery ? <a href={googleMapsUrl(hotel.mapQuery)} target="_blank" rel="noopener noreferrer" className={textLink}><MapPin size={16} strokeWidth={1.75} aria-hidden="true" />{t("actions.map")}</a> : null}
    </div>
  </article>;
}

const serviceIcons = { traslado: CarFront, tour: Compass, actividad: Compass, seguro: ShieldCheck, asistencia: ShieldCheck, otro: Sparkles };

async function ServiceCard({ service, locale }: { service: ServiceView; locale: string }) {
  const t = await getTranslations("trip.service");
  const Icon = serviceIcons[service.kind];
  const facts = [
    service.time ? formatClock(service.time, locale) : "",
    service.place ? `${t("place")}: ${service.place}` : "",
    service.duration ? `${t("duration")}: ${service.duration}` : "",
    service.mode ? t(service.mode as "compartido" | "privado") : "",
    service.operator ? `${t("provider")}: ${service.operator}` : "",
    service.endDate && service.endDate !== service.date ? t("until", { date: formatTripDate(service.endDate, locale, "dayMonth") }) : "",
  ].filter(Boolean);
  return <article className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4 sm:p-5">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
    <div className="min-w-0 space-y-1">
      <p className="t-small font-semibold text-brand">{t(service.kind)}</p>
      <h4 className="break-words font-semibold text-ink">{service.title}</h4>
      {service.description ? <p className="t-small break-words font-normal text-ink">{service.description}</p> : null}
      {facts.length ? <p className="t-small font-normal text-ink-soft">{facts.join(" · ")}</p> : null}
      {service.included.length ? <ul className="t-small list-inside list-disc font-normal text-ink-soft">{service.included.map(item => <li key={item}>{item}</li>)}</ul> : null}
    </div>
  </article>;
}

async function EventCard({ event, trip, locale }: { event: TripEvent; trip: LoadedTrip; locale: string }) {
  const t = await getTranslations("trip");
  if (event.kind === "flight") return <FlightJourneyCard journey={event.journey} locale={locale} />;
  if (event.kind === "checkin" || event.kind === "checkout") return <HotelCard hotel={event.hotel} phase={event.kind} photo={trip.hotelPhotos[event.hotel.photoPath]} locale={locale} />;
  if (event.kind === "ferry") return <article className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4 sm:p-5">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Ship size={20} strokeWidth={1.75} aria-hidden="true" /></span>
    <div className="min-w-0"><h4 className="font-semibold">{t("ferry.title", { from: event.ferry.fromPort, to: event.ferry.toPort })}</h4><p className="t-small font-normal text-ink-soft">{[formatClock(event.ferry.time, locale), event.ferry.arriveTime ? `→ ${formatClock(event.ferry.arriveTime, locale)}` : "", event.ferry.operator, event.ferry.vessel, event.ferry.className].filter(Boolean).join(" · ")}</p></div>
  </article>;
  return event.kind === "service" ? <ServiceCard service={event.service} locale={locale} /> : null;
}

async function Itinerary({ trip, locale }: { trip: LoadedTrip; locale: string }) {
  const t = await getTranslations("trip");
  const { view } = trip;
  const before = [t("itinerary.beforeDocuments"), t("itinerary.beforeRequirements"), ...(view.hasFlights ? [t("itinerary.beforeCheckin"), t("itinerary.beforeAirport")] : [])];
  return <section id="itinerario" aria-labelledby="itinerary-title" className="space-y-6 scroll-mt-36">
    <div><h2 id="itinerary-title" className={sectionTitle}>{t("itinerary.title")}</h2>{view.hasFlights ? <p className="t-small mt-1 font-normal text-ink-soft">{t("itinerary.localTimes")}</p> : null}</div>

    {view.stage !== "completed" && view.stage !== "cancelled" ? <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h3 className="font-semibold">{t("itinerary.before")}</h3>
      <ul className="mt-3 space-y-2">{before.map((item, index) => <li key={item} className="t-small flex gap-3 font-normal text-ink"><Check size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span className="flex flex-col items-start"><span>{item}</span>{index === 1 ? <Link href="/requisitos" className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand underline-offset-4 hover:underline">{t("actions.requirements")}<ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" /></Link> : null}</span></li>)}</ul>
    </div> : null}

    {view.timeline.length ? <ol className="space-y-8">{view.timeline.map(entry => entry.type === "free"
      ? <li key={`free-${entry.from}`} className="flex items-center gap-3 rounded-card border border-dashed border-line px-4 py-3">
        <MapPin size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden="true" />
        <p className="t-small font-normal text-ink-soft"><span className="font-semibold text-ink">{t("itinerary.freeTime", { days: entry.days })}</span> · {formatDateRange(entry.from, entry.to, locale)}. {t("itinerary.freeTimeNote")}</p>
      </li>
      : <li key={entry.date} className="space-y-3">
        <h3 className="flex flex-wrap items-baseline gap-x-3"><span className="t-small rounded-btn bg-ink px-2 py-0.5 font-semibold text-white">{t("itinerary.day", { number: entry.dayNumber })}</span><span className="font-semibold text-ink">{capitalized(formatTripDate(entry.date, locale, "full"))}</span></h3>
        <div className="space-y-3">{entry.events.map((event, index) => <EventCard key={`${event.kind}-${index}`} event={event} trip={trip} locale={locale} />)}</div>
      </li>)}</ol> : <p className="t-body rounded-card border border-line p-5 text-ink-soft">{t("itinerary.empty")}</p>}

    {view.undated.length ? <div className="space-y-3"><h3 className="font-semibold">{t("itinerary.undated")}</h3>{view.undated.map((event, index) => <EventCard key={`undated-${index}`} event={event} trip={trip} locale={locale} />)}</div> : null}

    {view.baggage.length ? <div className={`${card} p-5 sm:p-6`}>
      <h3 className="t-h3 flex items-center gap-2"><Luggage size={22} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{t("baggage.title")}</h3>
      {view.baggage.map((bag, index) => <div key={index} className="mt-4">
        {view.baggage.length > 1 || bag.scope ? <p className="t-small font-semibold text-ink-soft">{bag.scope}</p> : null}
        <ul className="mt-2 divide-y divide-line border-y border-line">{bag.pieces.map(piece => <li key={piece.kind} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
          <span className="font-semibold text-ink">{t(`baggage.${piece.kind}`)}</span>
          <span className={`t-small ${piece.state === "incluido" ? "text-success" : piece.state === "no_incluido" ? "text-ink-soft" : "text-ink"}`}>{piece.state ? t(`baggage.${piece.state}`) : t("baggage.unknown")}{piece.state === "incluido" ? [piece.pieces ? t("baggage.pieces", { count: piece.pieces }) : "", piece.weight, piece.size].filter(Boolean).map(value => ` · ${value}`).join("") : ""}</span>
        </li>)}</ul>
        {bag.notes ? <p className="t-small mt-2 font-normal text-ink-soft">{bag.notes}</p> : null}
      </div>)}
      {view.separateTickets ? <p className="t-small mt-4 font-normal text-ink-soft">{t("flight.separateTickets")}</p> : null}
    </div> : null}
  </section>;
}

async function Travelers({ view }: { view: TripView }) {
  const t = await getTranslations("trip.travelers");
  return <section id="viajeros" aria-labelledby="travelers-title" className={`${card} scroll-mt-36 p-5 sm:p-8`}>
    <h2 id="travelers-title" className="t-h2">{t("title")}</h2>
    {view.travelers.length ? <>
      <p className="t-small mt-1 font-normal text-ink-soft">{t("intro")}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">{view.travelers.map(traveler => <li key={traveler.id} className="rounded-card border border-line p-4">
        <p className="break-words font-semibold uppercase tracking-wide text-ink">{traveler.name}</p>
        <p className="t-small font-normal text-ink-soft">{t(traveler.category)}</p>
        {traveler.pnr || traveler.ticketNumber ? <dl className="t-small mt-3 space-y-1">
          {traveler.pnr ? <div className="flex flex-wrap justify-between gap-2"><dt className="font-normal text-ink-soft">{t("pnr")}{traveler.airline ? ` · ${traveler.airline}` : ""}</dt><dd className="font-semibold tabular-nums">{traveler.pnr}</dd></div> : null}
          {traveler.ticketNumber ? <div className="flex flex-wrap justify-between gap-2"><dt className="font-normal text-ink-soft">{t("ticket")}</dt><dd className="break-all font-semibold tabular-nums">{traveler.ticketNumber}</dd></div> : null}
        </dl> : null}
      </li>)}</ul>
      <p className="t-small mt-4 flex gap-2 font-normal text-ink-soft"><ShieldCheck size={18} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{t("privacy")}</p>
    </> : <p className="t-body mt-3 text-ink-soft">{t("pendingReview")}</p>}
  </section>;
}

const documentIcons = { itinerary: Plane, confirmation: FileText, tickets: Ticket, hotelVoucher: Hotel, receipt: Receipt, agency: FileText, customer: FileText };

async function Documents({ trip, mode, links, locale }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; locale: string }) {
  const t = await getTranslations("trip");
  const { view } = trip;
  const detail = (document: TripDocument) => {
    if (document.key === "itinerary") return document.status === "available" ? t("documents.itineraryDetail") : t("documents.itineraryProcessing");
    if (document.key === "confirmation") return document.status === "available" ? t("documents.confirmationDetail") : t("documents.confirmationPending");
    if (document.key === "tickets") return document.status === "available" ? t("documents.ticketsIssued") : document.status === "processing" ? t("documents.ticketsProcessing") : t("documents.ticketsPending");
    if (document.key === "hotelVoucher") return t("documents.hotelPending");
    if (document.key === "receipt") return formatTripDate(document.date, locale, "medium");
    return [t("documents.agency"), document.date ? formatTripDate(document.date.slice(0, 10), locale, "medium") : ""].filter(Boolean).join(" · ");
  };
  // The reservation document is only called a "confirmation" once a supplier confirmed it.
  const title = (document: TripDocument) => document.key === "receipt" ? t("documents.receipt", { number: document.title }) : document.key === "agency" ? document.title : document.key === "confirmation" && !view.supplierConfirmed ? t("documents.summary") : t(`documents.${document.key}`);
  const href = (document: TripDocument) => document.status !== "available" ? null : document.key === "itinerary" ? links.itinerary : document.key === "confirmation" ? links.confirmation : document.key === "receipt" ? links.receipt(document.ref) : document.key === "agency" ? links.document(document.ref) : null;
  return <section id="documentos" aria-labelledby="documents-title" className={`${card} scroll-mt-36 p-5 sm:p-8`}>
    <h2 id="documents-title" className="t-h2">{t("documents.title")}</h2>
    <p className="t-small mt-1 font-normal text-ink-soft">{t("documents.intro")}</p>
    <ul className="mt-5 divide-y divide-line border-y border-line">{view.documents.map((document, index) => {
      const Icon = documentIcons[document.key];
      const target = href(document);
      return <li key={`${document.key}-${document.ref || index}`} className="flex items-center gap-3 py-4">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-btn ${document.status === "available" ? "bg-brand-tint text-brand" : "bg-surface text-ink-soft"}`}><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-ink">{title(document)}</p>
          <p className="t-small font-normal text-ink-soft">{detail(document)}</p>
        </div>
        {target ? <a href={target} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-11 shrink-0 items-center gap-1 rounded-btn border border-line px-3 font-semibold text-brand hover:border-brand"><Download size={16} strokeWidth={1.75} aria-hidden="true" />{t("documents.open")}</a>
          : <span className={`t-small shrink-0 rounded-btn px-2 py-1 font-semibold ${document.status === "processing" ? "bg-brand-tint text-brand-deep" : document.status === "available" ? "bg-success/10 text-success" : "bg-surface text-ink-soft"}`}>{t(`documents.${document.status}`)}</span>}
      </li>;
    })}</ul>
    {view.hasFlights && view.documents.some(document => document.key === "itinerary" && document.status === "available") ? <a href={links.calendar} className={`${textLink} mt-3`}><CalendarPlus size={16} strokeWidth={1.75} aria-hidden="true" />{t("actions.addCalendar")}</a> : null}

    <div className="mt-6 space-y-3 border-t border-line pt-6">
      <h3 className="font-semibold">{t("documents.fromYou")}</h3>
      {view.customerDocuments.length ? <ul className="space-y-2">{view.customerDocuments.map(document => <li key={document.path}><a href={links.document(document.path)} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline"><FileText size={16} strokeWidth={1.75} aria-hidden="true" />{t("documents.sentOn", { date: formatTripDate(document.createdAt?.slice(0, 10), locale, "medium") })}</a></li>)}</ul> : <p className="t-small font-normal text-ink-soft">{t("documents.noCustomerDocuments")}</p>}
      <details className="group rounded-card border border-line">
        <summary className="t-small flex min-h-12 cursor-pointer items-center gap-2 px-4 font-semibold text-brand"><Upload size={16} strokeWidth={1.75} aria-hidden="true" />{t("documents.uploadTitle")}</summary>
        <div className="px-4 pb-4"><p className="t-small font-normal text-ink-soft">{t("documents.uploadIntro")}</p>{mode === "customer" ? <DocumentUploadForm /> : <p className="t-small mt-4 font-semibold text-ink-soft">{t("preview.disabled")}</p>}</div>
      </details>
    </div>
  </section>;
}

async function Payments({ view, mode, links, locale }: { view: TripView; mode: TripMode; links: TripLinks; locale: string }) {
  const t = await getTranslations("trip.payments");
  const { finance } = view;
  return <section id="pagos" aria-labelledby="payments-title" className={`${card} scroll-mt-36 p-5 sm:p-8`}>
    <h2 id="payments-title" className="t-h2">{t("title")}</h2>
    {view.stage === "cancelled" ? <p className="t-body mt-3 text-ink-soft">{t("cancelled")}</p> : finance.state === "none" ? <p className="t-body mt-3 text-ink-soft">{t("none")}</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className={`rounded-card p-5 ${finance.state === "paid" ? "bg-success/10" : "bg-brand-tint"}`}>
        <p className="t-small font-semibold text-ink-soft">{finance.state === "paid" ? t("status") : t("due")}</p>
        <p className={`t-h2 mt-1 flex items-center gap-2 tabular-nums ${finance.state === "paid" ? "text-success" : "text-brand-deep"}`}>{finance.state === "paid" ? <><Check size={26} strokeWidth={2.25} aria-hidden="true" />{t("paid")}</> : formatAmount(finance.balance, finance.currency)}</p>
        {finance.state === "paid" ? <p className="t-small mt-1 font-normal text-ink-soft">{t("paidBody")}</p> : null}
      </div>
      <dl className="t-small space-y-2 self-center">
        <div className="flex justify-between gap-4"><dt className="font-normal text-ink-soft">{t("total")}</dt><dd className="font-semibold tabular-nums">{formatAmount(finance.total, finance.currency)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-normal text-ink-soft">{t("received")}</dt><dd className="font-semibold tabular-nums">{formatAmount(finance.paid, finance.currency)}</dd></div>
      </dl>
    </div>}
    {finance.otherCurrency ? <p className="t-small mt-3 font-normal text-ink-soft">{t("otherCurrency")}</p> : null}
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="font-semibold">{t("receipts")}</h3>
      {view.receipts.length ? <ul className="mt-2 divide-y divide-line">{view.receipts.map(receipt => <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-semibold tabular-nums">{receipt.number}</p><p className="t-small font-normal text-ink-soft">{formatTripDate(receipt.date, locale, "medium")} · {formatAmount(receipt.amount, receipt.currency)}</p></div>
        <Action href={links.receipt(receipt.id)} mode={mode} external className={textLink} label=""><Receipt size={16} strokeWidth={1.75} aria-hidden="true" />{t("viewReceipt")}</Action>
      </li>)}</ul> : <p className="t-small mt-2 font-normal text-ink-soft">{t("noReceipts")}</p>}
      <p className="t-small mt-3 font-normal text-ink-soft">{t("receiptNote")}</p>
    </div>
  </section>;
}

async function Discover({ view, mode, waCode }: { view: TripView; mode: TripMode; waCode: string }) {
  const t = await getTranslations("trip.discover");
  if (["completed", "cancelled", "in_progress"].includes(view.stage)) return null;
  const has = (kinds: string[]) => view.services.some(service => kinds.includes(service.kind));
  const offers = [
    !has(["traslado"]) ? { key: "transfer", icon: CarFront } : null,
    !has(["tour", "actividad"]) ? { key: "tours", icon: Compass } : null,
    !has(["seguro", "asistencia"]) ? { key: "assistance", icon: ShieldCheck } : null,
    !view.hotels.length ? { key: "hotel", icon: Hotel } : null,
  ].filter(Boolean) as { key: "transfer" | "tours" | "assistance" | "hotel"; icon: typeof Hotel }[];
  if (!offers.length) return null;
  return <section aria-labelledby="discover-title" className="rounded-panel bg-surface p-5 sm:p-8">
    <h2 id="discover-title" className="t-h3">{t("title", { destination: view.destination })}</h2>
    <p className="t-small mt-1 font-normal text-ink-soft">{t("intro")}</p>
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">{offers.map(({ key, icon: Icon }) => <li key={key} className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{t(key)}</h3>
        <p className="t-small font-normal text-ink-soft">{t(`${key}Body`)}</p>
        <Action href={whatsappUrl(t("askMessage", { service: t(key).toLocaleLowerCase("es"), destination: view.destination, code: waCode }))} mode={mode} customerOnly external className={textLink} label="">{t("ask")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Action>
      </div>
    </li>)}</ul>
  </section>;
}

async function Help({ view, mode, waText }: { view: TripView; mode: TripMode; waText: string }) {
  const t = await getTranslations("trip");
  return <section id="ayuda" aria-labelledby="help-title" className="scroll-mt-36 space-y-4">
    <div className="space-y-4 rounded-panel border border-line bg-canvas p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><LifeBuoy size={20} strokeWidth={1.75} aria-hidden="true" /></span><h2 id="help-title" className="t-h3">{t("help.title")}</h2></div>
      <p className="t-small font-normal text-ink-soft">{t("help.advisorBody", { code: view.reference })}</p>
      <Action href={whatsappUrl(waText)} mode={mode} customerOnly external className={`${whatsapp} w-full`} label={t("preview.disabled")}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{t("actions.whatsapp")}</Action>
      <a href="#mensajes" className={`${secondary} w-full`}><Mail size={18} strokeWidth={1.75} aria-hidden="true" />{t("actions.sendMessage")}</a>
      <ul className="space-y-1">
        <li className="t-small flex min-h-11 items-center gap-3 text-ink"><Phone size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><span className="sr-only">{t("help.phone")}: </span>+504 8866-8704</li>
        <li><Action href={`mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(view.reference)}`} mode={mode} customerOnly className="t-small inline-flex min-h-11 items-center gap-3 break-all text-brand underline-offset-4 hover:underline" label=""><Mail size={18} strokeWidth={1.75} aria-hidden="true" /><span className="sr-only">{t("help.email")}: </span>{siteConfig.supportEmail}</Action></li>
      </ul>
    </div>
    <div className="space-y-2 rounded-panel border border-line bg-surface p-5 sm:p-6">
      <h3 className="font-semibold">{t("help.duringTitle")}</h3>
      <p className="t-small font-normal text-ink-soft">{t("help.duringBody")}</p>
    </div>
    <div className="space-y-2 rounded-panel border border-line bg-canvas p-5 sm:p-6">
      <h3 className="font-semibold">{t("help.changesTitle")}</h3>
      <p className="t-small font-normal text-ink-soft">{t("help.changesBody")}</p>
      <Link href="/legales/cancelaciones" className={textLink}>{t("help.changesLink")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
    </div>
  </section>;
}

// The whole traveller experience, shared by /mi-reserva and the admin client preview so both render the
// same thing. `signOut` is the customer's sign-out form (absent in the preview).
export async function TripPortal({ trip, mode, links, signOut, thread, stickyOffset = "top-16 sm:top-20" }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; signOut?: React.ReactNode; thread?: MessageThread; stickyOffset?: string }) {
  const t = await getTranslations("trip");
  const locale = await getLocale();
  const { view } = trip;
  const waText = t("help.whatsappMessage", { destination: view.destination, code: view.reference });
  const name = firstName(trip.customerName);
  return <div className="space-y-6 sm:space-y-8">
    {mode === "preview" ? <div role="note" className="rounded-card border border-brand/40 bg-brand-tint p-4"><p className="font-semibold text-brand-deep">{t("preview.badge")}</p><p className="t-small mt-1 font-normal text-ink">{t("preview.body")}</p>{view.finance.adjusted ? <p className="t-small mt-2 font-semibold text-error">{t("preview.adjusted", { shown: formatAmount(view.finance.total, view.finance.currency), reservation: formatAmount(view.finance.reservationTotal, view.finance.currency) })}</p> : null}</div> : null}
    <div className="flex items-center justify-between gap-4">
      <p className="t-small font-semibold text-ink-soft">{t("title")}{name ? <span className="font-normal"> · {t("greeting", { name })}</span> : null}</p>
      {signOut}
    </div>
    <Hero trip={trip} locale={locale} />
    <StatusPanel view={view} mode={mode} links={links} waText={waText} />
    <SectionNav view={view} offsetClass={stickyOffset} />
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-8">
        {view.timeline.length || view.undated.length ? <Itinerary trip={trip} locale={locale} /> : null}
        <Travelers view={view} />
        <Documents trip={trip} mode={mode} links={links} locale={locale} />
        <section id="mensajes" aria-labelledby="messages-title" className={`${card} scroll-mt-36 p-5 sm:p-8`}>
          <h2 id="messages-title" className="t-h2">{t("messages.title")}</h2>
          <p className="t-small mb-5 mt-1 font-normal text-ink-soft">{t("messages.intro")}</p>
          <MessagesPanel mode={mode} initial={mode === "preview" ? thread ?? { available: false, messages: [] } : undefined} whatsappHref={whatsappUrl(waText)} />
        </section>
        <Payments view={view} mode={mode} links={links} locale={locale} />
        <Discover view={view} mode={mode} waCode={view.reference} />
      </div>
      <aside className="space-y-4 lg:sticky lg:top-40" aria-label={t("help.title")}>
        <Help view={view} mode={mode} waText={waText} />
      </aside>
    </div>
  </div>;
}

export function SignOutButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return <form action={action}><button type="submit" className="t-small inline-flex min-h-11 items-center gap-2 rounded-btn border border-line px-4 font-semibold text-ink hover:bg-surface"><LogOut size={16} strokeWidth={1.75} aria-hidden="true" />{label}</button></form>;
}

