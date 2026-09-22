import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { CITY_SEO_PAGES, getCitySeoPage } from "@/lib/city-seo";
import { serviceLinks } from "@/lib/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import type { Locale } from "@/i18n/config";

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
  const common = await getTranslations("common");
  const copy = city[locale];
  const crossLinks = [...serviceLinks, { key: "destinations", href: "/destinos" }];
  return <main className="container-site space-y-12 py-14 sm:py-24">
    <Breadcrumbs items={[{ label: common("home"), href: "/" }, { label: city.name, href: `/agencia-de-viajes/${city.slug}` }]} />
    <header className="max-w-3xl space-y-6">
      <h1 className="t-h1">{copy.h1}</h1>
      <p className="t-body-lg text-ink-soft">{copy.description}</p>
    </header>
    <section className="max-w-3xl space-y-6" aria-labelledby="city-copy-title">
      <h2 id="city-copy-title" className="sr-only">{copy.h1}</h2>
      {copy.body.map((paragraph, index) => <p key={`${city.slug}-${locale}-${index}`} className="t-body-lg text-ink-soft">{paragraph}</p>)}
    </section>
    <nav aria-label={locale === "en" ? "Travel services" : "Servicios de viaje"} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {crossLinks.map(link => <Link key={link.href} href={link.href} className="rounded-card border border-line bg-canvas p-6 text-brand underline underline-offset-4 shadow-sm">{common(link.key)}</Link>)}
    </nav>
  </main>;
}
