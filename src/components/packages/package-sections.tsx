import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, BedDouble, CalendarDays, Check, ChevronDown, Clock3, Compass, Info, Layers, MapPin, Plus, Ticket, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HotelPhotos } from "@/components/packages/hotel-photos";
import { hotelHash, optionHash, type PackageDay, type PackageExperience, type PackageHotel, type PackageOption, type PackageSection, type PackageStay } from "@/lib/package-sheet";

// Sections of a package page built from packages.ficha (src/lib/package-sheet.ts). Each one renders only
// when its data exists, so packages without a ficha keep their original page.

const chip = "t-small inline-flex min-h-9 items-center gap-2 rounded-btn bg-surface px-3 text-ink";
const halfSizes = "(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), 360px";

export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const t = useTranslations("packagePage");
  return <nav aria-label={t("navLabel")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <ul className="flex gap-2">{items.map(item => <li key={item.id} className="shrink-0"><a href={`#${item.id}`} className="t-small inline-flex min-h-11 items-center rounded-btn border border-line bg-canvas px-4 text-ink transition-colors duration-(--duration-fast) ease-out hover:border-brand hover:text-brand">{item.label}</a></li>)}</ul>
  </nav>;
}

// Two stays in one trip (the resort and the city): side by side so the difference reads at a glance.
export function StayOverview({ stays }: { stays: PackageStay[] }) {
  const t = useTranslations("packagePage");
  return <section className="space-y-6" aria-labelledby="package-stays-title">
    <h2 id="package-stays-title" className="t-h2 inline-flex items-center gap-3"><Layers className="text-brand" aria-hidden="true" />{t("tripPartsTitle")}</h2>
    <ol className="grid gap-5 md:grid-cols-2">{stays.map((stay, index) => <li key={stay.id} className="overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
      {stay.portada && <div className="relative aspect-[3/2] bg-surface"><Image src={stay.portada.archivo} alt={stay.portada.alt} fill sizes={halfSizes} className="object-cover" /></div>}
      <div className="space-y-3 p-6">
        <p className="t-small font-semibold text-brand">{t("tripPart", { number: index + 1 })}</p>
        <h3 className="t-h3">{stay.titulo}</h3>
        <ul className="flex flex-wrap gap-2"><li className={chip}><BedDouble size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{stay.noches}</li><li className={chip}><Utensils size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{stay.plan}</li></ul>
        {stay.descripcion && <p className="t-body text-ink-soft">{stay.descripcion}</p>}
      </div>
    </li>)}</ol>
  </section>;
}

export function OptionCards({ title, options }: { title: string; options: PackageOption[] }) {
  const t = useTranslations("packagePage");
  return <section className="space-y-6" aria-labelledby="package-options-title">
    <h2 id="package-options-title" className="t-h2 inline-flex items-center gap-3"><Layers className="text-brand" aria-hidden="true" />{title}</h2>
    <div className="grid gap-5 md:grid-cols-2">{options.map(option => <article key={option.id} className={`flex flex-col overflow-hidden rounded-card border bg-canvas shadow-sm ${option.costo_adicional ? "border-brand" : "border-line"}`}>
      {option.foto && <div className="relative aspect-[3/2] bg-surface"><Image src={option.foto.archivo} alt={option.foto.alt} fill sizes={halfSizes} className="object-cover" /></div>}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <span className={`t-small inline-flex w-fit items-center gap-2 rounded-btn px-3 py-1 font-semibold ${option.costo_adicional ? "bg-brand-tint text-brand-deep" : "bg-surface text-ink"}`}>{option.costo_adicional ? <><Plus size={16} strokeWidth={1.75} aria-hidden="true" />{t("optionExtraCost")}</> : t("optionBase")}</span>
        <h3 className="t-h3">{option.titulo}</h3>
        <p className="t-body text-ink-soft">{option.descripcion}</p>
        {option.cambios.length > 0 && <div className="space-y-3"><h4 className="t-small font-semibold text-ink">{t("optionChanges")}</h4><ul className="space-y-3">{option.cambios.map((value, index) => <li key={index} className="t-small flex gap-3 text-ink"><ArrowRight size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><span>{value}</span></li>)}</ul></div>}
        <Button asChild variant="ghost" className="mt-auto w-full sm:w-fit"><a href={`#${optionHash(option.id)}`}>{t("quoteOption")}</a></Button>
      </div>
    </article>)}</div>
  </section>;
}

function HotelCard({ hotel }: { hotel: PackageHotel }) {
  const t = useTranslations("packagePage");
  return <article className="flex flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
    <HotelPhotos name={hotel.nombre} photos={hotel.fotos} />
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><span className="t-small font-semibold text-brand">{hotel.categoria}</span>{hotel.recomendado && <span className="t-small inline-flex items-center gap-1 rounded-btn bg-brand-tint px-2 py-1 font-semibold text-brand-deep"><Check size={14} strokeWidth={2} aria-hidden="true" />{t("recommended")}</span>}</div>
        <h4 className="t-h3">{hotel.nombre}</h4>
        <p className="t-small flex gap-2 text-ink-soft"><MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />{hotel.zona}</p>
      </div>
      <p className="t-body text-ink-soft">{hotel.descripcion}</p>
      <p className="t-small flex gap-2 text-ink"><Utensils size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span><span className="sr-only">{t("hotelPlan")}: </span>{hotel.plan}</span></p>
      {/* Room, amenities and conditions fold away so six hotels stay scannable on a phone. */}
      <details className="group rounded-btn bg-surface px-4">
        <summary className="t-small flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-ink">{t("hotelDetails")}<ChevronDown size={16} strokeWidth={1.75} className="shrink-0 text-ink-soft transition-transform duration-(--duration-fast) group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="t-small space-y-4 pb-4 text-ink-soft">
          <div><p className="font-semibold text-ink">{t("hotelRoom")}</p><p>{hotel.habitacion}</p></div>
          {hotel.amenidades.length > 0 && <ul className="space-y-2">{hotel.amenidades.map((value, index) => <li key={index} className="flex gap-2 text-ink"><Check size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>{value}</span></li>)}</ul>}
          {hotel.ideal && <p><span className="font-semibold text-ink">{t("hotelIdeal")}: </span>{hotel.ideal}</p>}
          {hotel.condiciones.length > 0 && <div><p className="font-semibold text-ink">{t("hotelConditions")}</p><ul className="mt-1 list-disc space-y-1 pl-5">{hotel.condiciones.map((value, index) => <li key={index}>{value}</li>)}</ul></div>}
          {hotel.mejoras.length > 0 && <div><p className="font-semibold text-ink">{t("hotelUpgrades")}</p><ul className="mt-1 list-disc space-y-1 pl-5">{hotel.mejoras.map((value, index) => <li key={index}>{value}</li>)}</ul></div>}
        </div>
      </details>
      <Button asChild variant="ghost" className="mt-auto w-full"><a href={`#${hotelHash(hotel.id)}`}>{t("hotelChoose")}</a></Button>
    </div>
  </article>;
}

export function HotelsSection({ stays, id }: { stays: PackageStay[]; id: string }) {
  const t = useTranslations("packagePage");
  return <section id={id} className="scroll-mt-24 space-y-8" aria-labelledby="package-hotels-title">
    <div className="space-y-2"><h2 id="package-hotels-title" className="t-h2 inline-flex items-center gap-3"><BedDouble className="text-brand" aria-hidden="true" />{t("hotelsTitle")}</h2><p className="t-body measure text-ink-soft">{t("hotelsIntro")}</p></div>
    {stays.map(stay => <section key={stay.id} className="space-y-5" aria-labelledby={`package-stay-${stay.id}`}>
      <div className="space-y-3">
        <h3 id={`package-stay-${stay.id}`} className="t-h3">{stay.titulo}</h3>
        <ul className="flex flex-wrap gap-2"><li className={chip}><BedDouble size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{stay.noches}</li><li className={chip}><Utensils size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{stay.plan}</li>{stay.opcion && <li className="t-small inline-flex min-h-9 items-center gap-2 rounded-btn bg-brand-tint px-3 font-semibold text-brand-deep"><Plus size={16} strokeWidth={1.75} aria-hidden="true" />{t("optionExtraCost")}</li>}</ul>
        {stay.descripcion && <p className="t-body measure text-ink-soft">{stay.descripcion}</p>}
      </div>
      <div className="grid gap-5 md:grid-cols-2">{stay.hoteles.map(hotel => <HotelCard key={hotel.id} hotel={hotel} />)}</div>
    </section>)}
  </section>;
}

export function ItineraryDays({ days, id }: { days: PackageDay[]; id: string }) {
  const t = useTranslations("packagePage");
  return <section id={id} className="scroll-mt-24 space-y-6" aria-labelledby="itinerary-title">
    <h2 id="itinerary-title" className="t-h2 inline-flex items-center gap-3"><CalendarDays className="text-brand" aria-hidden="true" />{t("itinerary")}</h2>
    <ol>{days.map((day, index) => <li key={index} className="relative flex gap-5 pb-8 last:pb-0">
      <span aria-hidden="true" className="absolute left-3 top-7 h-[calc(100%-1.25rem)] w-px bg-line" />
      <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-brand bg-canvas t-small text-brand">{index + 1}</span>
      <div className="min-w-0 space-y-2 pt-0.5">
        <p className="t-small font-semibold text-brand">{t("dayLabel", { number: index + 1 })}</p>
        <h3 className="t-h3">{day.titulo}</h3>
        <p className="t-body text-ink-soft">{day.descripcion}</p>
        {(day.comidas || day.alojamiento) && <ul className="flex flex-wrap gap-2 pt-1">
          {day.comidas && <li className={chip}><Utensils size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><span className="sr-only">{t("dayMeals")}: </span>{day.comidas}</li>}
          {day.alojamiento && <li className={chip}><BedDouble size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><span className="sr-only">{t("dayStay")}: </span>{day.alojamiento}</li>}
        </ul>}
      </div>
    </li>)}</ol>
  </section>;
}

const modeStyles = { incluido: "bg-brand-tint text-brand-deep", libre: "bg-surface text-ink", opcional: "border border-line bg-canvas text-ink-soft" } as const;

export function ExperiencesSection({ experiences, id }: { experiences: PackageExperience[]; id: string }) {
  const t = useTranslations("packagePage");
  const modeLabel = { incluido: t("modeIncluded"), libre: t("modeFree"), opcional: t("modeOptional") };
  return <section id={id} className="scroll-mt-24 space-y-6" aria-labelledby="package-experiences-title">
    <div className="space-y-2"><h2 id="package-experiences-title" className="t-h2 inline-flex items-center gap-3"><Compass className="text-brand" aria-hidden="true" />{t("experiencesTitle")}</h2><p className="t-body measure text-ink-soft">{t("experiencesIntro")}</p></div>
    <div className="grid gap-5 md:grid-cols-2">{experiences.map(experience => <article key={experience.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
      {experience.foto && <div className="relative aspect-[3/2] bg-surface"><Image src={experience.foto.archivo} alt={experience.foto.alt} fill sizes={halfSizes} className="object-cover" /></div>}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <span className={`t-small inline-flex w-fit items-center gap-2 rounded-btn px-3 py-1 font-semibold ${modeStyles[experience.modalidad]}`}>{experience.modalidad === "incluido" ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : experience.modalidad === "opcional" ? <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> : null}{modeLabel[experience.modalidad]}</span>
        <h3 className="t-h3">{experience.titulo}</h3>
        <dl className="t-small space-y-2 text-ink-soft">
          {experience.duracion && <div className="flex gap-2"><dt className="shrink-0"><Clock3 size={16} strokeWidth={1.75} className="mt-0.5 text-brand" aria-hidden="true" /><span className="sr-only">{t("expDuration")}</span></dt><dd>{experience.duracion}</dd></div>}
          {experience.lugar && <div className="flex gap-2"><dt className="shrink-0"><MapPin size={16} strokeWidth={1.75} className="mt-0.5 text-brand" aria-hidden="true" /><span className="sr-only">{t("expPlace")}</span></dt><dd>{experience.lugar}</dd></div>}
          {experience.entradas && <div className="flex gap-2"><dt className="shrink-0"><Ticket size={16} strokeWidth={1.75} className="mt-0.5 text-brand" aria-hidden="true" /><span className="sr-only">{t("expTickets")}</span></dt><dd>{experience.entradas}</dd></div>}
        </dl>
        <p className="t-body text-ink-soft">{experience.descripcion}</p>
        {(experience.destacados.length > 0 || experience.preparacion || experience.notas.length > 0) && <details className="group mt-auto rounded-btn bg-surface px-4">
          <summary className="t-small flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-ink">{t("experienceDetails")}<ChevronDown size={16} strokeWidth={1.75} className="shrink-0 text-ink-soft transition-transform duration-(--duration-fast) group-open:rotate-180" aria-hidden="true" /></summary>
          <div className="t-small space-y-3 pb-4 text-ink-soft">
            {experience.destacados.length > 0 && <ul className="space-y-2">{experience.destacados.map((value, index) => <li key={index} className="flex gap-2 text-ink"><Check size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>{value}</span></li>)}</ul>}
            {(experience.preparacion || experience.notas.length > 0) && <div className="space-y-2"><p className="font-semibold text-ink">{t("beforeYouGo")}</p>{experience.preparacion && <p>{experience.preparacion}</p>}{experience.notas.map((value, index) => <p key={index}>{value}</p>)}</div>}
          </div>
        </details>}
      </div>
    </article>)}</div>
  </section>;
}

// Reference information (transfers, meal plans, conditions) folded so the page stays scannable.
export function InfoAccordion({ sections, id }: { sections: PackageSection[]; id: string }) {
  const t = useTranslations("packagePage");
  return <section id={id} className="scroll-mt-24 space-y-5" aria-labelledby="package-info-title">
    <h2 id="package-info-title" className="t-h2 inline-flex items-center gap-3"><Info className="text-brand" aria-hidden="true" />{t("infoTitle")}</h2>
    <div className="divide-y divide-line rounded-card border border-line bg-canvas shadow-sm">{sections.map((section, index) => <details key={index} open={index === 0} className="group px-6">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4"><h3 className="t-h3">{section.titulo}</h3><ChevronDown size={20} strokeWidth={1.75} className="shrink-0 text-ink-soft transition-transform duration-(--duration-fast) group-open:rotate-180" aria-hidden="true" /></summary>
      <div className="space-y-4 pb-6">
        {section.parrafos.map((value, line) => <p key={line} className="t-body text-ink-soft">{value}</p>)}
        {section.items.length > 0 && <ul className="space-y-3">{section.items.map((value, line) => <li key={line} className="t-body flex gap-3"><Check size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><span>{value}</span></li>)}</ul>}
      </div>
    </details>)}</div>
  </section>;
}
