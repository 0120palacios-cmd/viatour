import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { CITY_SEO_PAGES, getCitySeoPage } from "@/lib/city-seo";
import { serviceLinks } from "@/lib/navigation";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ city: string }> };

export function generateStaticParams() {
  return CITY_SEO_PAGES.map(city => ({ city: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = getCitySeoPage((await params).city);
  if (!city) notFound();
  const locale = (await getLocale()) as Locale;
  return { ...pageMetadata(`/agencia-de-viajes/${city.slug}`, city[locale].title, city[locale].description, null, false, locale), robots: { index: false, follow: true } };
}

export default async function CityLandingPage({ params }: Props) {
  const city = getCitySeoPage((await params).city);
  if (!city) notFound();
  const locale = (await getLocale()) as Locale;
  const common = await getTranslations("common");
  const staticT = await getTranslations("static");
  const name = city.name;
  return <main className="container-site space-y-12 py-14 sm:py-24">
    <header className="max-w-3xl space-y-6">
      <p className="t-small text-brand">{locale === "en" ? "Travel planning from Honduras" : "Planificación de viajes desde Honduras"}</p>
      <h1 className="t-h1">{locale === "en" ? `Travel agency in ${name}` : `Agencia de viajes en ${name}`}</h1>
      <p className="t-body-lg text-ink-soft">{city[locale].description}</p>
    </header>
    <section className="rounded-panel border border-line bg-surface p-6 sm:p-8" aria-labelledby="city-copy-todo">
      <h2 id="city-copy-todo" className="t-h2">{locale === "en" ? "Editorial content pending approval" : "Contenido editorial pendiente de aprobación"}</h2>
      <p className="mt-4 t-body text-ink-soft">{locale === "en" ? `TODO: Add approved, original body copy for the ${name} landing page before publishing it.` : `TODO: Agregar el texto aprobado y original para la página de ${name} antes de publicarla.`}</p>
      <p className="mt-4 t-small text-ink-soft">{staticT("draft")}</p>
    </section>
    <nav aria-label={locale === "en" ? "Travel services" : "Servicios de viaje"} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...serviceLinks, { key: "packages", href: "/paquetes" }, { key: "destinations", href: "/destinos" }].map(link => <Link key={link.href} href={link.href} className="rounded-card border border-line bg-canvas p-6 text-brand underline underline-offset-4 shadow-sm">{common(link.key)}</Link>)}
    </nav>
  </main>;
}
