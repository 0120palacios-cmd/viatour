import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BadgeCheck, CalendarCheck, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { CITY_SEO_PAGES, getCitySeoPage } from "@/lib/city-seo";
import { serviceLinks } from "@/lib/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { agencyRef, breadcrumbSchema, localizedUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { getPackages, type Package } from "@/lib/packages";
import { PackageGrid } from "@/components/packages/package-card";
import { QuoteButton } from "@/components/home/quote-button";
import { HowItWorks, ReviewsTeaser } from "@/components/home/sections";
import { RatingBadge } from "@/components/reviews/rating-badge";

type Props = { params: Promise<{ city: string }> };

export function generateStaticParams() {
  return CITY_SEO_PAGES.map(city => ({ city: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCitySeoPage((await params).city);
  if (!city) notFound();
  const locale = (await getLocale()) as Locale;
  const copy = city[locale];
  const metadata = pageMetadata(`/agencia-de-viajes/${city.slug}`, copy.title, copy.description, null, false, locale);
  return {
    ...metadata,
    description: copy.description,
    openGraph: metadata.openGraph ? { ...metadata.openGraph, description: copy.description } : undefined,
    twitter: metadata.twitter ? { ...metadata.twitter, description: copy.description } : undefined,
    robots: { index: city.published, follow: true },
  };
}

export default async function CityLandingPage({ params }: Props) {
  const city = getCitySeoPage((await params).city);
  if (!city) notFound();
  const locale = (await getLocale()) as Locale;
  const cityT = await getTranslations("cityPage");
  let packages: Package[] = [];
  try { packages = await getPackages(true); } catch { packages = []; }
  const common = await getTranslations("common");
  const home = await getTranslations("home");
  const ux = await getTranslations("ux");
  const copy = city[locale];
  // The city page describes a service area of the one agency, not a second agency (same @id with a
  // different url and areaServed would contradict the site-wide TravelAgency node).
  const cityUrl = localizedUrl(`/agencia-de-viajes/${city.slug}`, locale);
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "Service", "@id": `${cityUrl}#service`, name: copy.h1, description: copy.description, serviceType: "Agencia de viajes", url: cityUrl, provider: agencyRef, areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: "Honduras" } } }, breadcrumbSchema([{ label: common("home"), href: "/" }, { label: city.name, href: `/agencia-de-viajes/${city.slug}` }], locale)] };
  const crossLinks = [...serviceLinks, { key: "destinations", href: "/destinos" }];
  // A local landing page (search results, the Google Business Profile) answers "can they help me
  // here, and can I trust them" in the first screen: the action, the real rating and how it works.
  const quote = <QuoteButton payload={{ service: "Viaje a medida", fields: {} }}>{common("requestQuote")}</QuoteButton>;
  const proof = [{ icon: UserRound, label: home("why1Title") }, { icon: BadgeCheck, label: ux("proofFree") }, { icon: CalendarCheck, label: home("why6Title") }];
  return <main>
    {city.published && <JsonLd data={structuredData} />}
    <div className="container-site space-y-12 pb-12 pt-8 sm:pb-16 sm:pt-12">
      <Breadcrumbs schema={false} items={[{ label: common("home"), href: "/" }, { label: city.name, href: `/agencia-de-viajes/${city.slug}` }]} />
      <header className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="max-w-3xl space-y-6">
          <h1 className="t-h1">{copy.h1}</h1>
          <p className="t-body-lg text-ink-soft">{copy.description}</p>
          <div className="flex flex-col items-start gap-3">{quote}<RatingBadge /></div>
        </div>
        <aside aria-label={cityT("ctaTitle", { city: city.name })} className="rounded-panel border border-line bg-surface p-6">
          <ul className="t-body space-y-1 font-medium text-ink">{proof.map(({ icon: Icon, label }) => <li key={label} className="flex min-h-11 items-center gap-3"><Icon size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{label}</li>)}</ul>
        </aside>
      </header>
      <section className="max-w-3xl space-y-6" aria-label={copy.h1}>
        {copy.body.map((paragraph, index) => <p key={`${city.slug}-${locale}-${index}`} className="t-body-lg text-ink-soft">{paragraph}</p>)}
      </section>
      <nav aria-label={locale === "en" ? "Travel services" : "Servicios de viaje"}><ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {crossLinks.map(link => <li key={link.href}><Link href={link.href} className="media-card t-body flex min-h-14 items-center justify-between gap-2 rounded-card border border-line bg-canvas px-4 py-3 font-semibold text-ink shadow-sm hover:text-brand">{common(link.key)}<ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /></Link></li>)}
      </ul></nav>
    </div>
    <HowItWorks />
    <ReviewsTeaser />
    <div className="container-site space-y-12 py-12 sm:py-24">
      {packages.length > 0 && <section className="space-y-6" aria-labelledby="city-packages-title"><h2 id="city-packages-title" className="t-h2">{cityT("packagesTitle", { city: city.name })}</h2><PackageGrid items={packages} label={cityT("packagesTitle", { city: city.name })} /></section>}
      <section className="space-y-6 rounded-panel border border-line bg-surface p-6 sm:p-8" aria-labelledby="city-cta-title">
        <div className="max-w-3xl space-y-3"><h2 id="city-cta-title" className="t-h2">{cityT("ctaTitle", { city: city.name })}</h2><p className="t-body-lg text-ink-soft">{cityT("ctaBody")}</p></div>
        {quote}
        <Link href="/requisitos" className="t-small inline-flex min-h-12 items-center text-brand underline underline-offset-4">{cityT("requirementsLink")}</Link>
      </section>
    </div>
  </main>;
}
