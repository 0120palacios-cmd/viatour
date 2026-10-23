import Image from "next/image";
import { ArrowRight, CalendarPlus, Car, CarFront, Compass, Download, Hotel, Luggage, LogOut, MapPin, ShieldCheck, Ship, Sparkles, Ticket } from "lucide-react";
import { FlightJourneyCard } from "@/components/trip/flight-journey";
import { formatClock, formatTripDate, googleMapsUrl } from "@/lib/trip-format";
import type { HotelView, ServiceView, TripEvent, TripView } from "@/lib/trip-view";
import type { LoadedTrip } from "@/lib/trip-model";
import { capitalized, itineraryReady, panel, primary, quietButton, textLink, type T, type TripLinks } from "@/components/trip/trip-ui";
import { PageTitle } from "@/components/trip/trip-shell";

const serviceIcons = { traslado: CarFront, tour: Compass, actividad: Compass, seguro: ShieldCheck, asistencia: ShieldCheck, auto: Car, otro: Sparkles };

export async function HotelCard({ hotel, photo, locale, t }: { hotel: HotelView; photo?: string; locale: string; t: T }) {
  const facts = [
    { label: t("hotel.checkin"), value: capitalized(formatTripDate(hotel.checkIn, locale, "weekday")) },
    { label: t("hotel.checkout"), value: capitalized(formatTripDate(hotel.checkOut, locale, "weekday")) },
    hotel.mealPlan ? { label: t("hotel.meals"), value: hotel.mealPlan } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact?.value));
  return <article className={`${panel} overflow-hidden`} aria-labelledby={`hotel-${hotel.id}`}>
    {photo ? <div className="relative aspect-[16/9] bg-surface sm:aspect-[21/9]"><Image src={photo} alt={t("hotel.photoAlt", { hotel: hotel.name })} fill unoptimized loading="lazy" sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" /></div> : null}
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <p className="t-small inline-flex items-center gap-2 font-semibold text-brand"><Hotel size={16} strokeWidth={1.75} aria-hidden="true" />{[t("stay.hotel"), hotel.nights ? t("nights", { count: hotel.nights }) : ""].filter(Boolean).join(" · ")}</p>
        <h3 id={`hotel-${hotel.id}`} className="mt-1 text-lg font-bold leading-7 text-ink sm:text-xl">{hotel.name}</h3>
        {hotel.city ? <p className="t-small font-normal text-ink-soft">{hotel.city}</p> : null}
      </div>
      {facts.length ? <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">{facts.map(fact => <div key={fact.label}><dt className="t-small font-normal text-ink-soft">{fact.label}</dt><dd className="t-small font-semibold text-ink">{fact.value}</dd></div>)}</dl> : null}
      {hotel.rooms.filter(room => room.category || room.adults).map((room, index) => <p key={index} className="t-small font-normal text-ink"><span className="font-semibold">{room.count > 1 ? `${room.count} × ` : ""}{room.category || t("hotel.room")}</span>{room.beds ? ` · ${room.beds}` : ""} · {t("hotel.guests", { adults: room.adults, children: room.children })}</p>)}
      {hotel.included.length ? <p className="t-small font-normal text-ink-soft"><span className="font-semibold text-ink">{t("hotel.included")}:</span> {hotel.included.join(" · ")}</p> : null}
      {hotel.address || hotel.mapQuery ? <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-line pt-3">
        {hotel.address ? <p className="t-small flex min-w-0 gap-2 font-normal text-ink-soft"><MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />{hotel.address}</p> : null}
        {hotel.mapQuery ? <a href={googleMapsUrl(hotel.mapQuery)} target="_blank" rel="noopener noreferrer" className={textLink}>{t("actions.map")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></a> : null}
      </div> : null}
    </div>
  </article>;
}

// A service (transfer, tour, insurance, car...) as a card; the car keeps its own wording.
export async function ServiceCard({ service, locale, t, headingLevel = 3 }: { service: ServiceView; locale: string; t: T; headingLevel?: 3 | 4 }) {
  const Icon = serviceIcons[service.kind];
  const Heading = `h${headingLevel}` as "h3" | "h4";
  const car = service.kind === "auto";
  const facts = [
    service.date ? { label: car ? t("car.pickup") : t("service.date"), value: [capitalized(formatTripDate(service.date, locale, "weekday")), formatClock(service.time, locale)].filter(Boolean).join(" · ") } : null,
    service.endDate && service.endDate !== service.date ? { label: car ? t("car.return") : t("service.untilLabel"), value: capitalized(formatTripDate(service.endDate, locale, "weekday")) } : null,
    service.place ? { label: car ? t("car.place") : t("service.place"), value: service.place } : null,
    service.duration ? { label: t("service.duration"), value: service.duration } : null,
    service.mode && !car ? { label: t("service.modeLabel"), value: t(`service.${service.mode as "compartido" | "privado"}`) } : null,
    service.operator ? { label: car ? t("car.company") : t("service.provider"), value: service.operator } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact?.value));
  return <article className={`${panel} space-y-3 p-4 sm:p-6`}>
    <p className="t-small inline-flex items-center gap-2 font-semibold text-brand"><Icon size={16} strokeWidth={1.75} aria-hidden="true" />{t(`service.${service.kind}`)}</p>
    <Heading className="break-words text-lg font-bold leading-7 text-ink">{service.title}</Heading>
    {service.description ? <p className="t-small break-words font-normal text-ink">{service.description}</p> : null}
    {facts.length ? <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{facts.map(fact => <div key={fact.label}><dt className="t-small font-normal text-ink-soft">{fact.label}</dt><dd className="t-small break-words font-semibold text-ink">{fact.value}</dd></div>)}</dl> : null}
    {service.included.length ? <p className="t-small font-normal text-ink-soft"><span className="font-semibold text-ink">{t("hotel.included")}:</span> {service.included.join(" · ")}</p> : null}
    {car ? <p className="t-small font-normal text-ink-soft">{t("car.documents")}</p> : null}
  </article>;
}

function FerryCard({ event, locale, t }: { event: Extract<TripEvent, { kind: "ferry" }>; locale: string; t: T }) {
  const ferry = event.ferry;
  return <article className={`${panel} space-y-1 p-4 sm:p-6`}>
    <p className="t-small inline-flex items-center gap-2 font-semibold text-brand"><Ship size={16} strokeWidth={1.75} aria-hidden="true" />{t("service.ferry")}</p>
    <h3 className="text-lg font-bold leading-7 text-ink">{ferry.fromPort} – {ferry.toPort}</h3>
    <p className="t-small font-normal text-ink-soft">{[formatClock(ferry.time, locale), ferry.arriveTime ? `→ ${formatClock(ferry.arriveTime, locale)}` : "", ferry.operator, ferry.vessel, ferry.className].filter(Boolean).join(" · ")}</p>
  </article>;
}

async function DayEvent({ event, trip, locale, t }: { event: TripEvent; trip: LoadedTrip; locale: string; t: T }) {
  if (event.kind === "flight") return <FlightJourneyCard journey={event.journey} locale={locale} />;
  if (event.kind === "checkin") return <HotelCard hotel={event.hotel} photo={trip.hotelPhotos[event.hotel.photoPath]} locale={locale} t={t} />;
  if (event.kind === "checkout") return <p className="t-small flex items-center gap-3 rounded-card bg-surface px-4 py-3 font-normal text-ink"><LogOut size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden="true" /><span><span className="font-semibold">{t("hotel.checkoutTitle")}</span> · {event.hotel.name}</span></p>;
  if (event.kind === "ferry") return <FerryCard event={event} locale={locale} t={t} />;
  if (event.kind === "service") return <ServiceCard service={event.service} locale={locale} t={t} />;
  return null;
}

function Baggage({ view, t }: { view: TripView; t: T }) {
  if (!view.baggage.length) return null;
  return <section id="equipaje" aria-labelledby="baggage-title" className="scroll-mt-28 rounded-panel bg-surface p-5 sm:p-6">
    <h2 id="baggage-title" className="flex items-center gap-2 font-bold text-ink"><Luggage size={20} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{t("baggage.title")}</h2>
    {view.baggage.map((bag, index) => <div key={index} className="mt-4">
      {view.baggage.length > 1 && bag.scope ? <p className="t-small mb-2 font-semibold text-ink-soft">{bag.scope}</p> : null}
      <dl className="grid gap-3 sm:grid-cols-3">{bag.pieces.map(piece => <div key={piece.kind} className="flex items-baseline justify-between gap-4 border-b border-line pb-3 sm:block sm:border-0 sm:pb-0">
        <dt className="t-small font-normal text-ink-soft">{t(`baggage.${piece.kind}`)}</dt>
        <dd className={`t-small text-right font-semibold sm:mt-1 sm:text-left ${piece.state === "incluido" ? "text-ink" : "text-ink-soft"}`}>{piece.state ? t(`baggage.${piece.state}`) : t("baggage.unknown")}{piece.state === "incluido" ? [piece.pieces ? t("baggage.pieces", { count: piece.pieces }) : "", piece.weight, piece.size].filter(Boolean).map(value => ` · ${value}`).join("") : ""}</dd>
      </div>)}</dl>
      {bag.notes ? <p className="t-small mt-3 font-normal text-ink-soft">{bag.notes}</p> : null}
    </div>)}
    <p className="t-small mt-4 font-normal text-ink-soft">{t("baggage.airlineRules")}</p>
  </section>;
}

export async function TripItinerary({ trip, links, locale, t }: { trip: LoadedTrip; links: TripLinks; locale: string; t: T }) {
  const { view } = trip;
  const cancelled = view.stage === "cancelled";
  const ready = itineraryReady(view);
  return <div className="space-y-8">
    <PageTitle id="section-title" title={t("sections.itinerarioTitle")}>
      {ready && !cancelled ? <div className="flex flex-wrap gap-2">
        <a href={links.itinerary} target="_blank" rel="noopener noreferrer" className={primary}><Download size={18} strokeWidth={1.75} aria-hidden="true" />{t("actions.itineraryPdf")}</a>
        {view.hasFlights ? <a href={links.calendar} className={quietButton}><CalendarPlus size={18} strokeWidth={1.75} aria-hidden="true" />{t("actions.addCalendar")}</a> : null}
      </div> : null}
    </PageTitle>
    {cancelled ? <p className="t-body rounded-card bg-surface p-5 text-ink-soft">{t("itinerary.cancelled")}</p>
      : !view.timeline.length && !view.undated.length ? <p className="t-body rounded-card bg-surface p-5 text-ink-soft">{t("itinerary.empty")}</p>
      : <>
        {view.hasFlights ? <p className="t-small -mt-4 font-normal text-ink-soft">{t("itinerary.localTimes")}</p> : null}
        <ol className="space-y-8" aria-label={t("itinerary.daysLabel")}>{view.timeline.map((entry, index) => entry.type === "free"
          ? <li key={`free-${index}`} className="flex items-center gap-4 pl-1">
            <span className="h-10 w-0.5 shrink-0 rounded-full bg-line" aria-hidden="true" />
            <p className="t-small font-normal text-ink-soft">{t("itinerary.freeDays", { count: entry.days, destination: view.destination })} <a href={links.section("destino")} className="font-semibold text-brand underline-offset-4 hover:underline">{t("itinerary.freeIdeas")}</a></p>
          </li>
          : <li key={entry.date} className="space-y-3" aria-labelledby={`day-${entry.date}`}>
            <h2 id={`day-${entry.date}`} className="flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2">
              <span className="t-small rounded-btn bg-brand-tint px-2 font-bold text-brand-deep">{t("itinerary.day", { number: entry.dayNumber })}</span>
              <span className="font-bold text-ink">{capitalized(formatTripDate(entry.date, locale, "weekday"))}</span>
            </h2>
            <div className="space-y-3">{entry.events.map((event, position) => <DayEvent key={`${event.kind}-${position}`} event={event} trip={trip} locale={locale} t={t} />)}</div>
          </li>)}
        </ol>
        {view.undated.length ? <section aria-labelledby="undated-title" className="space-y-3">
          <h2 id="undated-title" className="t-h3 text-ink">{t("itinerary.undated")}</h2>
          {view.undated.map((event, position) => <DayEvent key={`undated-${position}`} event={event} trip={trip} locale={locale} t={t} />)}
        </section> : null}
        {view.separateTickets ? <p className="t-small flex gap-3 rounded-card border border-line p-4 font-normal text-ink"><Ticket size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />{t("flight.separateTickets")}</p> : null}
        <Baggage view={view} t={t} />
      </>}
  </div>;
}
