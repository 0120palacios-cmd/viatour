import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { CITY_SEO_PAGES, getCitySeoPage } from "@/lib/city-seo";
import { serviceLinks } from "@/lib/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { absoluteUrl, breadcrumbSchema, localizedUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { getPackages, type Package } from "@/lib/packages";
import { PackageGrid } from "@/components/packages/package-card";
import { QuoteButton } from "@/components/home/quote-button";

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
  const copy = city[locale];
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "TravelAgency", "@id": absoluteUrl("/#agency"), name: "viatour", url: localizedUrl(`/agencia-de-viajes/${city.slug}`, locale), areaServed: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: "Honduras" } }, parentOrganization: { "@id": absoluteUrl("/#agency") } }, breadcrumbSchema([{ label: common("home"), href: "/" }, { label: city.name, href: `/agencia-de-viajes/${city.slug}` }], locale)] };
  const crossLinks = [...serviceLinks, { key: "destinations", href: "/destinos" }];
  return <main className="container-site space-y-12 pb-12 pt-8 sm:pb-24 sm:pt-12">
    {city.published && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
    <Breadcrumbs schema={false} items={[{ label: common("home"), href: "/" }, { label: city.name, href: `/agencia-de-viajes/${city.slug}` }]} />
    <header className="max-w-3xl space-y-6">
      <h1 className="t-h1">{copy.h1}</h1>
      <p className="t-body-lg text-ink-soft">{copy.description}</p>
    </header>
    <section className="max-w-3xl space-y-6" aria-labelledby="city-copy-title">
      <h2 id="city-copy-title" className="sr-only">{copy.h1}</h2>
      {copy.body.map((paragraph, index) => <p key={`${city.slug}-${locale}-${index}`} className="t-body-lg text-ink-soft">{paragraph}</p>)}
    </section>
    <nav aria-label={locale === "en" ? "Travel services" : "Servicios de viaje"}><ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {crossLinks.map(link => <li key={link.href}><Link href={link.href} className="media-card t-body flex min-h-14 items-center justify-between gap-2 rounded-card border border-line bg-canvas px-4 py-3 font-semibold text-ink shadow-sm hover:text-brand">{common(link.key)}<ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /></Link></li>)}
    </ul></nav>
    {packages.length > 0 && <section className="space-y-6" aria-labelledby="city-packages-title"><h2 id="city-packages-title" className="t-h2">{cityT("packagesTitle", { city: city.name })}</h2><PackageGrid items={packages} label={cityT("packagesTitle", { city: city.name })} /></section>}
    <section className="space-y-6 rounded-panel border border-line bg-surface p-6 sm:p-8" aria-labelledby="city-cta-title">
      <div className="max-w-3xl space-y-3"><h2 id="city-cta-title" className="t-h2">{cityT("ctaTitle", { city: city.name })}</h2><p className="t-body-lg text-ink-soft">{cityT("ctaBody")}</p></div>
      <QuoteButton payload={{ service: "Viaje a medida", fields: {} }}>{common("requestQuote")}</QuoteButton>
      <Link href="/requisitos" className="t-small inline-flex min-h-12 items-center text-brand underline underline-offset-4">{cityT("requirementsLink")}</Link>
    </section>
  </main>;
}
