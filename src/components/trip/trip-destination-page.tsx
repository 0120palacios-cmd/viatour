import Image from "next/image";
import { ArrowRight, ArrowUpRight, Camera, Car, Compass, Gift, Plug, Plane, ShieldCheck, Banknote, Languages, HandCoins, TramFront } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ServiceRequestButton } from "@/components/trip/service-request";
import { ServiceCard } from "@/components/trip/trip-itinerary";
import { offerIcons, offerWhatsapp, NextTripIdeas } from "@/components/trip/trip-overview";
import { guideView, type GuideFact } from "@/lib/destination-guides";
import { carRentals, isFamilyTrip, tripOffers } from "@/lib/trip-offers";
import { formatDateRange, formatTripDate } from "@/lib/trip-format";
import { pendingServices, type LoadedTrip } from "@/lib/trip-model";
import { capitalized, panel, primary, textLink, type T, type TripLinks } from "@/components/trip/trip-ui";

const factIcons: Record<GuideFact["key"], typeof Plane> = { airport: Plane, currency: Banknote, language: Languages, power: Plug, tips: HandCoins, transport: TramFront };

export async function TripDestinationPage({ trip, links, locale, t }: { trip: LoadedTrip; links: TripLinks; locale: string; t: T }) {
  const { view } = trip;
  const cancelled = view.stage === "cancelled";
  const family = isFamilyTrip(view);
  const guide = trip.guide ? guideView(trip.guide, locale, { family }) : null;
  const name = guide?.name ?? trip.destination?.name ?? view.destination;
  const intro = guide?.intro ?? trip.destination?.intro ?? "";
  const hero = guide?.hero ?? (trip.image ? { image: trip.image.src, alt: t("heroAlt", { destination: view.destination }) } : null);
  const cars = carRentals(view);
  const offers = cancelled ? [] : tripOffers(view, 6, pendingServices(trip));
  const carOffer = offers.includes("auto") && !cars.length;
  const otherOffers = offers.filter(key => key !== "auto");
  const dates = capitalized(formatDateRange(view.start, view.end, locale));

  return <div className="space-y-12">
    <section aria-labelledby="section-title" className="space-y-6">
      <div className={`relative isolate -mx-4 overflow-hidden bg-brand-deep text-white sm:mx-0 sm:rounded-panel`}>
        {hero ? <>
          <Image src={hero.image} alt={hero.alt} fill sizes="(min-width: 1200px) 1152px, 100vw" className="-z-20 object-cover" />
          <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden="true" />
        </> : null}
        <div className={`flex flex-col justify-end gap-1 px-4 pb-6 pt-16 sm:p-10 ${hero ? "min-h-[16rem] sm:min-h-[22rem]" : ""}`}>
          <p className="t-small font-semibold text-white/80">{t("guide.eyebrow")}</p>
          <h1 id="section-title" className="t-h1">{name}</h1>
          {dates ? <p className="t-small font-normal text-white/85">{dates}</p> : null}
        </div>
      </div>
      {intro ? <p className="t-body-lg measure text-ink">{intro}</p> : null}
      {guide?.facts.length ? <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{guide.facts.map(fact => {
        const Icon = factIcons[fact.key];
        return <div key={fact.key} className="flex gap-3 bg-canvas p-4"><Icon size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><div className="min-w-0"><dt className="t-small font-normal text-ink-soft">{t(`guide.facts.${fact.key}`)}</dt><dd className="t-small font-semibold text-ink">{fact.value}</dd></div></div>;
      })}</dl> : null}
      <ul className="flex flex-wrap gap-x-6">
        <li><Link href={{ pathname: "/requisitos", query: { destino: view.destination } }} className={textLink}><ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />{t("destination.requirements")}</Link></li>
        {trip.destination ? <li><Link href={`/destinos/${trip.destination.slug}`} className={textLink}><Compass size={16} strokeWidth={1.75} aria-hidden="true" />{t("destination.more", { destination: trip.destination.name })}</Link></li> : null}
        {guide?.tourism ? <li><a href={guide.tourism.url} target="_blank" rel="noopener noreferrer" className={textLink}>{t("guide.tourism", { site: guide.tourism.label })}<ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" /><span className="sr-only">{t("opensNewWindow")}</span></a></li> : null}
      </ul>
    </section>

    {guide?.highlights.length && !cancelled ? <section aria-labelledby="todo-title" className="space-y-4">
      <div><h2 id="todo-title" className="t-h2">{t("guide.todoTitle", { destination: name })}</h2><p className="t-small font-normal text-ink-soft">{family ? t("guide.todoFamily") : t("guide.todoIntro")}</p></div>
      {/* A swipeable row on phones (one card and the edge of the next), a grid from sm up. */}
      <ul className="chip-row -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">{guide.highlights.map(item => <li key={item.id} className="flex w-[82%] max-w-[22rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
        <article className="flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-canvas" aria-labelledby={`todo-${item.id}`}>
          <div className="relative aspect-[3/2] bg-surface"><Image src={item.image} alt={item.alt} fill loading="lazy" sizes="(min-width: 1024px) 368px, (min-width: 640px) 50vw, 82vw" className="object-cover" /></div>
          <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <p className="t-small font-semibold text-brand">{item.categories.slice(0, 2).map(category => t(`guide.categories.${category}`)).join(" · ")}</p>
            <h3 id={`todo-${item.id}`} className="text-lg font-bold leading-7 text-ink">{item.name}</h3>
            <p className="t-small flex-1 font-normal text-ink-soft">{item.description}</p>
            {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className={`${textLink} -mb-2`}>{t("guide.officialSite")}<ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" /><span className="sr-only">{`: ${item.name}. ${t("opensNewWindow")}`}</span></a> : null}
          </div>
        </article>
      </li>)}</ul>
      <p className="t-small font-normal text-ink-soft">{t("guide.disclaimer")}</p>
    </section> : null}

    {cars.length ? <section aria-labelledby="car-title" className="space-y-4">
      <h2 id="car-title" className="t-h2">{t("car.yoursTitle")}</h2>
      {cars.map(service => <ServiceCard key={service.id} service={service} locale={locale} t={t} />)}
    </section> : carOffer ? <section aria-labelledby="car-title" className={`${panel} grid gap-5 overflow-hidden p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6`}>
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true"><Car size={28} strokeWidth={1.75} /></span>
      <div className="min-w-0 space-y-1">
        <h2 id="car-title" className="t-h3 text-ink">{t("car.offerTitle", { destination: name })}</h2>
        <p className="t-small font-normal text-ink-soft">{t("car.offerBody")}</p>
        {view.start ? <p className="t-small font-semibold text-ink">{t("car.offerDates", { from: formatTripDate(view.start, locale, "dayMonth"), to: formatTripDate(view.end ?? view.start, locale, "dayMonth") })}</p> : null}
      </div>
      <ServiceRequestButton service="auto" endpoint={links.services} title={t("offers.items.auto.title", { destination: name })} label={t("offers.items.auto.cta")} className={`${primary} w-full sm:w-auto`} whatsappHref={offerWhatsapp(t, view, "auto")} />
    </section> : null}

    {otherOffers.length ? <section id="mejore" aria-labelledby="improve-title" className="scroll-mt-28 space-y-4">
      <div><h2 id="improve-title" className="t-h2">{view.stage === "completed" ? t("offers.titleAfter") : t("offers.improveTitle")}</h2><p className="t-small font-normal text-ink-soft">{t("offers.intro")}</p></div>
      {/* One tappable row per service: the whole row opens the request. */}
      <ul className={`${panel} divide-y divide-line overflow-hidden lg:grid lg:grid-cols-2 lg:divide-y-0`}>{otherOffers.map(key => {
        const Icon = offerIcons[key];
        return <li key={key} className="lg:border-b lg:border-line lg:odd:border-r">
          <ServiceRequestButton service={key} endpoint={links.services} title={t(`offers.items.${key}.title`, { destination: name })} label={t(`offers.items.${key}.cta`)} className="group flex h-full w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-(--duration-fast) hover:bg-surface sm:px-6" whatsappHref={offerWhatsapp(t, view, key)}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true"><Icon size={19} strokeWidth={1.75} /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold leading-6 text-ink">{t(`offers.items.${key}.title`, { destination: name })}</span><span className="t-small block font-normal text-ink-soft">{t(`offers.items.${key}.body`, { destination: name })}</span><span className="t-small mt-1 inline-flex items-center gap-1 font-semibold text-brand">{t(`offers.items.${key}.cta`)}<ArrowRight size={14} strokeWidth={2} aria-hidden="true" /></span></span>
          </ServiceRequestButton>
        </li>;
      })}</ul>
    </section> : null}

    {trip.requests.length ? <section aria-labelledby="requests-title" className="space-y-3">
      <h2 id="requests-title" className="t-h3 text-ink">{t("requests.title")}</h2>
      <ul className={`${panel} divide-y divide-line`}>{trip.requests.map(request => <li key={request.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 sm:px-6">
        <div className="min-w-0"><p className="font-semibold text-ink">{t(`offers.items.${request.service}.label`)}</p><p className="t-small font-normal text-ink-soft">{t("requests.sentOn", { date: formatTripDate(request.createdAt.slice(0, 10), locale, "medium") })}</p></div>
        <span className={`t-small rounded-btn px-2 py-0.5 font-semibold ${request.status === "cerrada" ? "bg-surface text-ink-soft" : request.status === "confirmada" ? "bg-success/10 text-success" : "bg-brand-tint text-brand-deep"}`}>{t(`requests.status.${request.status}`)}</span>
      </li>)}</ul>
      <p className="t-small font-normal text-ink-soft">{t("requests.note")} <a href={links.messages} className="font-semibold text-brand underline-offset-4 hover:underline">{t("support.sendMessage")}</a></p>
    </section> : null}

    {!cancelled && view.stage !== "completed" && view.stage !== "in_progress" ? <p className="t-small flex items-start gap-3 rounded-card border border-line p-4 font-normal text-ink"><Gift size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>{t("more.beforeNote")} <Link href="/gira" className="font-semibold text-brand underline-offset-4 hover:underline">{t("more.videoCta")}</Link></span></p> : null}

    <NextTripIdeas trip={trip} t={t} />

    {trip.credits.length ? <details className="group rounded-card border border-line bg-canvas p-5">
      <summary className="t-small flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-ink [&::-webkit-details-marker]:hidden"><Camera size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{t("guide.credits")}<ArrowRight size={14} strokeWidth={1.75} className="text-ink-soft transition-transform duration-(--duration-fast) group-open:rotate-90" aria-hidden="true" /></summary>
      <ol className="t-small mt-3 list-decimal space-y-2 pl-5 font-normal text-ink-soft">{trip.credits.map(credit => <li key={credit.archivo}>{credit.alt}: <a href={credit.fuente} className="text-brand underline underline-offset-4" rel="noopener noreferrer" target="_blank">{credit.autor}</a>, {credit.licencia_url ? <a href={credit.licencia_url} className="text-brand underline underline-offset-4" rel="noopener noreferrer license" target="_blank">{credit.licencia}</a> : credit.licencia}</li>)}</ol>
    </details> : null}
  </div>;
}
