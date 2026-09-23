import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, Clock3, Compass, Info, ListChecks, MapPin, Minus, X } from "lucide-react";
import { absoluteUrl, breadcrumbSchema, localizedContentMetadata, localizedUrl, detailDescription } from "@/lib/seo";
import { getPackage, getPackages } from "@/lib/packages";
import { getDestination, getDestinations } from "@/lib/destinations";
import { PackagePrice } from "@/components/packages/package-price";
import { PackageImage } from "@/components/packages/package-image";
import { PackageQuote } from "@/components/packages/package-quote";
import { PackageGrid } from "@/components/packages/package-card";
import { canOptimizeImage } from "@/lib/image-optimization";
import type { Package } from "@/lib/packages";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ slug: string }> };
function normalizeDestination(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function PackageGallery({ item }: { item: Package }) {
  const sources = (Array.isArray(item.galeria) ? item.galeria : []).filter(source => typeof source === "string" && source.trim());
  const images = sources.length ? sources : item.imagen_url ? [item.imagen_url] : [];
  if (!images.length) return <PackageImage item={item} hero />;
  return <div className="grid grid-cols-2 gap-4">{images.map((source, index) => <div key={source + "-" + index} className={(index === 0 ? "col-span-2 aspect-video" : "aspect-[4/3]") + " relative overflow-hidden rounded-card bg-surface"}><Image src={source} alt={`${item.nombre} — ${item.destino}`} fill preload={index === 0} unoptimized={!canOptimizeImage(source)} sizes={index === 0 ? "(max-width: 1023px) calc(100vw - 32px), 747px" : "(max-width: 639px) calc((100vw - 48px) / 2), 360px"} className="object-cover" /></div>)}</div>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  const locale = (await getLocale()) as Locale;
  const english = locale === "en";
  return localizedContentMetadata("/paquetes/" + item.slug, english ? `viatour | ${item.nombre} travel package from Honduras` : "viatour | " + item.nombre + " a su medida desde Honduras", english ? `Explore the ${item.nombre} travel package from Honduras with viatour and request guidance to adjust dates, services and details to your plans.` : detailDescription(item.nombre, item.resumen || item.descripcion), item.imagen_url);
}

export default async function Page({ params }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const packagePage = await getTranslations("packagePage");
  const locale = (await getLocale()) as Locale;
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  let destination = item.destination_id ? await getDestination(item.destination_id, "id") : null;
  if (!destination) {
    try { const target = normalizeDestination(item.destino); destination = (await getDestinations()).find(value => normalizeDestination(value.nombre) === target || normalizeDestination(value.slug) === target) ?? null; } catch { destination = null; }
  }
  let packages: Package[] = [];
  try { packages = (await getPackages()).filter(value => value.id !== item.id && ((item.categoria && value.categoria === item.categoria) || value.destino.trim().toLocaleLowerCase() === item.destino.trim().toLocaleLowerCase())).slice(0, 3); } catch { packages = []; }
  const url = localizedUrl(`/paquetes/${item.slug}`, locale);
  const itinerary = item.itinerario ? item.itinerario.split(/\r?\n/).map(value => value.trim()).filter(Boolean) : [];
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "TouristTrip", name: item.nombre, description: item.resumen || item.descripcion, url, touristType: item.categoria || undefined, itinerary: itinerary.length ? { "@type": "ItemList", itemListElement: itinerary.map((name, index) => ({ "@type": "ListItem", position: index + 1, name })) } : undefined, ...(item.imagen_url ? { image: absoluteUrl(item.imagen_url) } : {}) }, breadcrumbSchema([{ label: common("home"), href: "/" }, { label: common("packages"), href: "/paquetes" }, { label: item.nombre, href: `/paquetes/${item.slug}` }], locale)] };
  return <main className="container-site space-y-12 py-10 sm:space-y-16 sm:py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <Link href="/paquetes" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />{t("backToPackages")}</Link>
    <div className="grid items-start gap-10 lg:grid-cols-3"><div className="space-y-10 lg:col-span-2">
    <header className="space-y-5"><h1 className="t-h1 max-w-4xl">{item.nombre}</h1><ul className="flex flex-wrap gap-2" aria-label={common("packages")}>
      {item.categoria && <li className="inline-flex items-center gap-2 rounded-btn border border-line bg-canvas px-3 py-2 t-small text-ink-soft"><Compass size={16} className="text-brand" aria-hidden="true" />{item.categoria}</li>}
      <li className="inline-flex items-center gap-2 rounded-btn border border-line bg-canvas px-3 py-2 t-small text-ink-soft"><Clock3 size={16} className="text-brand" aria-hidden="true" />{item.duracion}</li>
      <li className="inline-flex items-center gap-2 rounded-btn border border-line bg-canvas px-3 py-2 t-small text-ink-soft"><MapPin size={16} className="text-brand" aria-hidden="true" />{item.destino}</li>
    </ul></header>
      <PackageGallery item={item} />
      {item.resumen && <p className="t-body-lg measure text-ink-soft">{item.resumen}</p>}
      <p className="t-body measure whitespace-pre-line">{item.descripcion}</p>
      {item.etiquetas?.length > 0 && <ul aria-label={common("packages")} className="flex flex-wrap gap-2">{item.etiquetas.map(etiqueta => <li key={etiqueta} className="rounded-btn border border-line bg-surface px-3 py-1 t-small text-ink-soft">{etiqueta}</li>)}</ul>}
      <section className="space-y-6" aria-labelledby="package-includes-title"><h2 id="package-includes-title" className="t-h2 inline-flex items-center gap-3"><ListChecks className="text-brand" aria-hidden="true" />{packagePage("includes")}</h2><div className="grid gap-5 md:grid-cols-2"><div className="rounded-card border border-line bg-canvas p-6 shadow-sm"><h3 className="t-h3 mb-5 inline-flex items-center gap-2"><Check className="text-success" aria-hidden="true" />{packagePage("included")}</h3>{item.incluye?.length ? <ul className="space-y-4">{item.incluye.map((value, index) => <li key={index} className="t-body flex gap-3"><Check size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-success" aria-hidden="true" /><span>{value}</span></li>)}</ul> : <p className="t-body text-ink-soft">{packagePage("detailsOnRequest")}</p>}</div><div className="rounded-card border border-line bg-canvas p-6 shadow-sm"><h3 className="t-h3 mb-5 inline-flex items-center gap-2"><X className="text-ink-soft" aria-hidden="true" />{packagePage("notIncluded")}</h3>{item.no_incluye?.length ? <ul className="space-y-4">{item.no_incluye.map((value, index) => <li key={index} className="t-body flex gap-3"><Minus size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-ink-soft" aria-hidden="true" /><span>{value}</span></li>)}</ul> : null}</div></div></section>
      {itinerary.length > 0 && <section className="space-y-6" aria-labelledby="itinerary-title"><h2 id="itinerary-title" className="t-h2 inline-flex items-center gap-3"><CalendarDays className="text-brand" aria-hidden="true" />{packagePage("itinerary")}</h2><ol>{itinerary.map((day, index) => { const [title, ...rest] = day.split(/:\s*/, 2); return <li key={`${index}-${day}`} className="relative flex gap-5 pb-7 last:pb-0"><span aria-hidden="true" className="absolute left-3 top-7 h-[calc(100%-1.25rem)] w-px bg-line"/><span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-brand bg-canvas t-small text-brand">{index + 1}</span><div className="min-w-0 space-y-1 pt-0.5"><h3 className="t-h3">{rest.length ? title : `${packagePage("day")} ${index + 1}`}</h3><p className="t-body whitespace-pre-line text-ink-soft">{rest.length ? rest.join(": ") : day}</p></div></li>; })}</ol></section>}
    </div><aside id="solicitar-cotizacion" className="space-y-5 rounded-panel border border-line bg-canvas p-6 shadow-sm lg:sticky lg:top-24"><div><h2 className="t-h3">{item.nombre}</h2><p className="mt-2 t-small text-ink-soft">{item.destino}</p></div><p className="t-small text-ink-soft">{packagePage("quoteMessage")}</p><PackagePrice item={item} /><PackageQuote item={item} /></aside></div>
    {destination && <section className="space-y-4 rounded-panel border border-line bg-surface p-6 shadow-sm sm:p-8"><h2 className="t-h2 inline-flex items-center gap-3"><Info className="text-brand" aria-hidden="true" />{packagePage("destinationInfo")}</h2><h3 className="t-h3">{destination.nombre}</h3>{destination.intro && <p className="t-body measure text-ink-soft">{destination.intro}</p>}{destination.mejor_epoca && <p className="t-body"><span className="font-semibold">{t("destinationSeason")}: </span>{destination.mejor_epoca}</p>}<Link href={`/destinos/${destination.slug}`} className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4">{packagePage("learnDestination", { name: destination.nombre })}</Link></section>}
    {packages.length > 0 && <section className="space-y-6" aria-labelledby="related-packages-title"><h2 id="related-packages-title" className="t-h2">{packagePage("relatedPackages")}</h2><PackageGrid items={packages} /></section>}
  </main>;
}
