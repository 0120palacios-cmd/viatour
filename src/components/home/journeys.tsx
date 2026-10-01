import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Flag, Gem, Gift, Heart, Landmark, MessageCircle, Mountain, Play, Send, Ship, TicketCheck, TreePalm, Users, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TrackedNavLink } from "@/components/tracked-link";
import { socialLinks } from "@/components/social-glyphs";
import { QuoteButton } from "@/components/home/quote-button";
import { getPackages, type Package } from "@/lib/packages";
import { extraDestinations, matchesTravelStyle, travelStyles } from "@/lib/travel-styles";
import { homeDestinations } from "@/lib/home-destinations";

const styleIcons: Record<string, LucideIcon> = { beach: TreePalm, honeymoon: Gem, couples: Heart, family: Users, groups: Flag, culture: Landmark, adventure: Mountain, cruises: Ship };

async function publishedPackages(): Promise<Package[]> {
  try { return await getPackages(); } catch { return []; }
}

// "What kind of trip?": the first discovery moment after the hero, for visitors who know how they
// want to travel but not where. Every tile opens the catalogue filtered by that style; the counts are real.
export async function TripStyles() {
  const [t, items] = await Promise.all([getTranslations("v3"), publishedPackages()]);
  return <section className="pt-12 sm:pt-24" aria-labelledby="styles-title"><div className="container-site">
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-3"><h2 id="styles-title" className="t-h2">{t("stylesTitle")}</h2><p className="t-body-lg text-ink-soft">{t("stylesIntro")}</p></div>
    </div>
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{travelStyles.map(style => {
      const Icon = styleIcons[style.key] ?? Heart;
      const count = items.filter(item => matchesTravelStyle(item, style)).length;
      return <li key={style.slug}><TrackedNavLink event="trip_style_click" placement={`home-${style.slug}`} href={count ? `/paquetes?estilo=${style.slug}` : "/viaje-a-medida"} className="group flex h-full min-h-20 items-center gap-3 rounded-card border border-line bg-canvas p-3 transition-[border-color,background-color,box-shadow] duration-(--duration-fast) ease-out hover:border-brand hover:bg-brand-tint/40 hover:shadow-sm sm:gap-4 sm:p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand transition-colors duration-(--duration-fast) group-hover:bg-brand group-hover:text-canvas sm:size-12"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>
        <span className="min-w-0"><span className="t-small block font-semibold text-ink sm:text-base">{t(`styles.${style.key}`)}</span><span className="t-small block font-normal text-ink-soft">{t("styleCount", { count })}</span></span>
      </TrackedNavLink></li>;
    })}</ul>
    <p className="t-body mt-6 text-ink-soft">{t("stylesOther")} <TrackedNavLink event="custom_trip_click" placement="home-styles" href="/viaje-a-medida" className="font-semibold text-brand underline underline-offset-4 hover:text-brand-deep">{t("stylesOtherCta")}</TrackedNavLink></p>
  </div></section>;
}

// Under the destination tiles: the other places the published packages already cover, so the eleven
// tiles read as a selection rather than the whole offer. Only real package destinations are listed.
export async function MoreDestinations() {
  const [t, items] = await Promise.all([getTranslations("v3"), publishedPackages()]);
  const extra = extraDestinations(items.filter(item => item.categoria !== "Cruceros"), homeDestinations.map(item => item.nombre));
  if (!extra.length) return null;
  return <div className="mt-8 rounded-panel border border-line bg-surface p-6 sm:mt-10 sm:p-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-12">
      <div className="shrink-0 space-y-1 lg:w-64"><h3 className="t-h3">{t("moreDestinationsTitle")}</h3><p className="t-small font-normal text-ink-soft">{t("moreDestinationsIntro")}</p></div>
      <ul className="flex flex-wrap gap-2">{extra.map(item => <li key={item.slug}><Link href={`/paquetes/${item.slug}`} className="t-small inline-flex min-h-11 items-center rounded-btn border border-line bg-canvas px-4 text-ink transition-colors duration-(--duration-fast) ease-out hover:border-brand hover:text-brand">{item.name}</Link></li>)}</ul>
    </div>
  </div>;
}

// "Viaje. Comparta. Gane.": the existing /gira promotion, surfaced on the home page. The visual is an
// illustrative phone frame around a real destination photo, with no counts or invented engagement.
export async function SharePromo() {
  const t = await getTranslations("v3");
  const steps = ["1", "2", "3", "4"] as const;
  return <section className="section-space" aria-labelledby="promo-title"><div className="container-site">
    <div className="grid overflow-hidden rounded-panel bg-ink text-canvas lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-8 p-6 sm:p-10 lg:p-12">
        <div className="space-y-4">
          <span className="t-small inline-flex items-center gap-2 rounded-btn border border-canvas/25 px-3 py-1 text-canvas/90"><Gift size={16} strokeWidth={1.75} aria-hidden="true" />{t("promoBadge")}</span>
          <h2 id="promo-title" className="t-h1">{t("promoTitle")}</h2>
          <p className="t-body-lg max-w-xl text-canvas/85">{t("promoIntro")}</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">{steps.map(step => <li key={step} className="flex gap-4 rounded-card border border-canvas/15 bg-canvas/5 p-4">
          <span className="t-small flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-canvas" aria-hidden="true">{step}</span>
          <span className="t-body text-canvas/90">{t(`promoSteps.${step}`)}</span>
        </li>)}</ol>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild className="w-full sm:w-auto"><TrackedNavLink event="promo_click" placement="home-promo" href="/gira">{t("promoCta")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></TrackedNavLink></Button>
          {socialLinks.length > 0 && <div className="flex items-center gap-3"><span className="t-small text-canvas/80">{t("promoFollow")}</span><ul className="flex gap-2">{socialLinks.map(({ Icon, key, href }) => <li key={key}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${key} de viatour`} className="flex size-11 items-center justify-center rounded-btn border border-canvas/25 text-canvas transition-colors duration-(--duration-fast) ease-out hover:bg-canvas hover:text-ink"><Icon /></a></li>)}</ul></div>}
        </div>
        <p className="t-small font-normal text-canvas/70">{t("promoTerms")}</p>
      </div>
      <PromoVisual alt={t("promoVisualAlt")} caption={t("promoVisualCaption")} />
    </div>
  </div></section>;
}

export function PromoVisual({ alt, caption }: { alt: string; caption: string }) {
  return <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-brand-deep py-8 max-lg:order-first sm:min-h-80 lg:min-h-[520px] lg:py-0">
    <Image src="/destinos/salinitas.jpg" alt="" fill sizes="(max-width: 1023px) 100vw, 480px" className="object-cover opacity-35" aria-hidden="true" />
    <figure className="promo-phone relative w-[136px] overflow-hidden rounded-[24px] border-[5px] border-ink bg-ink shadow-md sm:w-[176px] lg:w-[248px] lg:rounded-[32px] lg:border-[6px]">
      <div className="relative aspect-[9/16]">
        <Image src="/destinos/cancun.jpg" alt={alt} fill sizes="(max-width: 639px) 136px, (max-width: 1023px) 176px, 248px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/70" />
        <span className="absolute left-1/2 top-1/2 flex size-10 lg:size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/90 text-ink"><Play size={24} strokeWidth={1.75} className="translate-x-0.5" aria-hidden="true" /></span>
        <div className="absolute inset-y-0 right-2 flex flex-col justify-end gap-3 pb-16 text-canvas lg:right-3 lg:gap-4 lg:pb-24" aria-hidden="true"><Heart size={20} strokeWidth={1.75} /><MessageCircle size={20} strokeWidth={1.75} /><Send size={20} strokeWidth={1.75} /></div>
        <figcaption className="absolute inset-x-0 bottom-0 space-y-1 p-3 text-canvas max-lg:text-xs lg:p-4"><span className="block font-semibold lg:text-sm">@miviatour</span><span className="block font-normal text-canvas/90 lg:text-sm">{caption} <span className="font-semibold">@miviatour</span></span></figcaption>
      </div>
    </figure>
  </div>;
}

// The home page closes by splitting the two visitors it serves: people planning a trip and
// travellers who already booked, so "Mi reserva" is found without competing with the quote.
export async function HomeClosing() {
  const t = await getTranslations("v3");
  return <section className="section-space" aria-label={`${t("closingQuoteTitle")} ${t("closingBookedTitle")}`}><div className="container-site grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
    <div className="space-y-6 rounded-panel border border-line bg-brand-tint p-6 sm:p-10">
      <div className="space-y-3"><h2 className="t-h2">{t("closingQuoteTitle")}</h2><p className="t-body-lg max-w-xl text-ink-soft">{t("closingQuoteBody")}</p></div>
      <QuoteButton payload={{ service: "Viaje a medida", fields: {} }}>{(await getTranslations("common"))("whatsapp")}</QuoteButton>
    </div>
    <div className="flex flex-col justify-between gap-6 rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-10">
      <div className="space-y-3"><span className="flex size-12 items-center justify-center rounded-btn bg-surface text-brand"><TicketCheck size={24} strokeWidth={1.75} aria-hidden="true" /></span><h2 className="t-h3">{t("closingBookedTitle")}</h2><p className="t-body text-ink-soft">{t("closingBookedBody")}</p></div>
      <Button asChild variant="ghost" className="self-start"><TrackedNavLink event="reservation_click" placement="home-closing" href="/mi-reserva">{t("closingBookedCta")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></TrackedNavLink></Button>
    </div>
  </div></section>;
}
