import { JsonLd } from "@/components/seo/json-ld";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowDown, CalendarDays, Check, Clock3, Compass, Info, ListChecks, MapPin, Minus, X } from "lucide-react";
import { absoluteUrl, agencyRef, breadcrumbSchema, localizedContentMetadata, localizedUrl, detailDescription, pickMetaTitle, websiteId } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog";
import { guideDestination } from "@/lib/guide-utils";
import { BlogCard } from "@/components/blog/card";
import { RatingBadge } from "@/components/reviews/rating-badge";
import { getPackage, getPackages } from "@/lib/packages";
import { getDestination, getDestinations } from "@/lib/destinations";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PackageImage } from "@/components/packages/package-image";
import { PackageQuote } from "@/components/packages/package-quote";
import { PackageGrid } from "@/components/packages/package-card";
import { PackageGallery } from "@/components/packages/package-gallery";
import { StickyQuoteBar } from "@/components/quote/sticky-quote-bar";
import { ShareButton } from "@/components/share-button";
import { canOptimizeImage } from "@/lib/image-optimization";
import type { Package } from "@/lib/packages";
import { matchesTravelStyle, travelStyles } from "@/lib/travel-styles";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ slug: string }> };
function normalizeDestination(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function Gallery({ item }: { item: Package }) {
  const sources = (Array.isArray(item.galeria) ? item.galeria : []).filter(source => typeof source === "string" && source.trim());
  const images = sources.length ? sources : item.imagen_url ? [item.imagen_url] : [];
  if (!images.length) return <PackageImage item={item} hero />;
  return <PackageGallery images={images.map(src => ({ src, unoptimized: !canOptimizeImage(src) }))} name={item.nombre} destination={item.destino} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  const locale = (await getLocale()) as Locale;
  const english = locale === "en";
  return localizedContentMetadata("/paquetes/" + item.slug, english ? pickMetaTitle(`viatour | ${item.nombre} travel package from Honduras`, `viatour | ${item.nombre} from Honduras`, `viatour | ${item.nombre}`) : pickMetaTitle(`viatour | ${item.nombre} a su medida desde Honduras`, `viatour | ${item.nombre} desde Honduras`, `viatour | ${item.nombre}`), english ? `Explore the ${item.nombre} travel package from Honduras with viatour and request guidance to adjust dates, services and details to your plans.` : detailDescription(item.nombre, item.resumen || item.descripcion), item.imagen_url);
}

export default async function Page({ params }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const packagePage = await getTranslations("packagePage");
  const ux = await getTranslations("ux");
  const v3 = await getTranslations("v3");
  const locale = (await getLocale()) as Locale;
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  let destination = item.destination_id ? await getDestination(item.destination_id, "id") : null;
  if (!destination) {
    try { const target = normalizeDestination(item.destino); destination = (await getDestinations()).find(value => normalizeDestination(value.nombre) === target || normalizeDestination(value.slug) === target) ?? null; } catch { destination = null; }
  }
  let packages: Package[] = [];
  try { packages = (await getPackages()).filter(value => value.id !== item.id && ((item.categoria && value.categoria === item.categoria) || value.destino.trim().toLocaleLowerCase() === item.destino.trim().toLocaleLowerCase())).slice(0, 3); } catch { packages = []; }
  // Guides for the same place: those about the destination first, then any that mention it.
  const plain = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  const place = plain(destination?.nombre ?? item.destino);
  const posts = await getBlogPosts().catch(() => []);
  const guides = [...posts.filter(post => destination && guideDestination(post.titulo)?.slug === destination.slug), ...posts.filter(post => plain(`${post.titulo} ${post.extracto}`).includes(place))].filter((post, index, list) => list.indexOf(post) === index).slice(0, 3);
  const url = localizedUrl(`/paquetes/${item.slug}`, locale);
  const itinerary = item.itinerario ? item.itinerario.split(/\r?\n/).map(value => value.trim()).filter(Boolean) : [];
  const gallery = (Array.isArray(item.galeria) ? item.galeria : []).filter(source => typeof source === "string" && source.trim());
  const images = (gallery.length ? gallery : item.imagen_url ? [item.imagen_url] : []).map(source => absoluteUrl(source));
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "TouristTrip", "@id": `${url}#trip`, name: item.nombre, description: item.resumen || item.descripcion, url, provider: agencyRef, isPartOf: { "@id": websiteId }, inLanguage: "es-HN", touristType: item.categoria || undefined, ...(destination ? { touristDestination: { "@type": "TouristDestination", name: destination.nombre, url: localizedUrl(`/destinos/${destination.slug}`, locale) } } : {}), itinerary: itinerary.length ? { "@type": "ItemList", itemListElement: itinerary.map((name, index) => ({ "@type": "ListItem", position: index + 1, name })) } : undefined, ...(images.length ? { image: images } : {}) }, breadcrumbSchema([{ label: common("home"), href: "/" }, { label: common("packages"), href: "/paquetes" }, { label: item.nombre, href: `/paquetes/${item.slug}` }], locale)] };
  // Facts, not controls: filled and borderless so they never read as buttons beside "Compartir".
  const chipClass = "inline-flex min-h-9 items-center gap-2 rounded-btn bg-surface px-3 t-small text-ink";
  return <main className="container-site space-y-12 pb-12 sm:space-y-16 sm:pb-24">
    <JsonLd data={structuredData} />
    <div className="grid items-start gap-10 pt-8 sm:pt-12 lg:grid-cols-3 lg:gap-12"><div className="min-w-0 space-y-10 lg:col-span-2">
    <header className="space-y-5">
      <Breadcrumbs schema={false} items={[{ label: common("home"), href: "/" }, { label: common("packages"), href: "/paquetes" }, { label: item.nombre, href: `/paquetes/${item.slug}` }]} />
      <h1 className="t-h1 max-w-4xl">{item.nombre}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-2" aria-label={ux("quickFacts")}>
          <li className={chipClass}><MapPin size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{item.destino}</li>
          {item.duracion && <li className={chipClass}><Clock3 size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{item.duracion}</li>}
          {item.categoria && <li className={chipClass}><Compass size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{item.categoria}</li>}
        </ul>
        {/* Below 1024px the quote panel follows the content; this puts the next step in the first screen, beside sharing. */}
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none lg:hidden"><a href="#solicitar-cotizacion"><ArrowDown size={18} strokeWidth={1.75} aria-hidden="true" />{common("requestQuote")}</a></Button>
          <ShareButton title={item.nombre} />
        </div>
      </div>
      <RatingBadge />
    </header>
      <Gallery item={item} />
      {item.resumen && <p className="t-body-lg measure text-ink-soft">{item.resumen}</p>}
      <p className="t-body measure whitespace-pre-line">{item.descripcion}</p>
      {/* Raw tags become the same travel styles used on /paquetes, each one opening the similar trips. */}
      {(() => { const styles = travelStyles.filter(style => style.tags && matchesTravelStyle({ etiquetas: item.etiquetas ?? [], categoria: null }, style)); return styles.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="t-small text-ink-soft">{v3("packageFor")}:</span><ul className="flex flex-wrap gap-2">{styles.map(style => <li key={style.slug}><Link href={`/paquetes?estilo=${style.slug}`} className="t-small inline-flex min-h-11 items-center rounded-btn border border-line bg-surface px-3 text-ink transition-colors duration-(--duration-fast) ease-out hover:border-brand hover:text-brand">{v3(`styles.${style.key}`)}</Link></li>)}</ul></div>; })()}
      <section className="space-y-6" aria-labelledby="package-includes-title"><h2 id="package-includes-title" className="t-h2 inline-flex items-center gap-3"><ListChecks className="text-brand" aria-hidden="true" />{packagePage("includes")}</h2><div className="grid gap-5 md:grid-cols-2"><div className="rounded-card border border-line bg-canvas p-6 shadow-sm"><h3 className="t-h3 mb-5 inline-flex items-center gap-2"><Check className="text-success" aria-hidden="true" />{packagePage("included")}</h3>{item.incluye?.length ? <ul className="space-y-4">{item.incluye.map((value, index) => <li key={index} className="t-body flex gap-3"><Check size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-success" aria-hidden="true" /><span>{value}</span></li>)}</ul> : <p className="t-body text-ink-soft">{packagePage("detailsOnRequest")}</p>}</div><div className="rounded-card border border-line bg-canvas p-6 shadow-sm"><h3 className="t-h3 mb-5 inline-flex items-center gap-2"><X className="text-ink-soft" aria-hidden="true" />{packagePage("notIncluded")}</h3>{item.no_incluye?.length ? <ul className="space-y-4">{item.no_incluye.map((value, index) => <li key={index} className="t-body flex gap-3"><Minus size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-ink-soft" aria-hidden="true" /><span>{value}</span></li>)}</ul> : null}</div></div></section>
      {itinerary.length > 0 && <section className="space-y-6" aria-labelledby="itinerary-title"><h2 id="itinerary-title" className="t-h2 inline-flex items-center gap-3"><CalendarDays className="text-brand" aria-hidden="true" />{packagePage("itinerary")}</h2><ol>{itinerary.map((day, index) => { const [, title, body] = day.match(/^(.{1,40}?)(?::|\s[—–-])\s+([\s\S]+)$/) ?? []; return <li key={`${index}-${day}`} className="relative flex gap-5 pb-7 last:pb-0"><span aria-hidden="true" className="absolute left-3 top-7 h-[calc(100%-1.25rem)] w-px bg-line"/><span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-brand bg-canvas t-small text-brand">{index + 1}</span><div className="min-w-0 space-y-1 pt-0.5"><h3 className="t-h3">{body ? title : `${packagePage("day")} ${index + 1}`}</h3><p className="t-body whitespace-pre-line text-ink-soft">{body ?? day}</p></div></li>; })}</ol></section>}
    </div><aside id="solicitar-cotizacion" aria-labelledby={`package-quote-title-${item.id}`} className="scroll-mt-24 rounded-panel border border-line bg-canvas p-5 shadow-md sm:p-6"><PackageQuote item={item} intro={packagePage("quoteMessage")} /></aside></div>
    {destination && <section className="space-y-4 rounded-panel border border-line bg-surface p-6 shadow-sm sm:p-8"><h2 className="t-h2 inline-flex items-center gap-3"><Info className="text-brand" aria-hidden="true" />{packagePage("destinationInfo")}</h2><h3 className="t-h3">{destination.nombre}</h3>{destination.intro && <p className="t-body measure text-ink-soft">{destination.intro}</p>}{destination.mejor_epoca && <p className="t-body"><span className="font-semibold">{t("destinationSeason")}: </span>{destination.mejor_epoca}</p>}<div className="flex flex-wrap gap-x-6 gap-y-1"><Link href={`/destinos/${destination.slug}`} className="t-small inline-flex min-h-11 items-center gap-2 text-brand underline underline-offset-4">{packagePage("learnDestination", { name: destination.nombre })}</Link><Link href={{ pathname: "/requisitos", query: { destino: destination.nombre } }} className="t-small inline-flex min-h-11 items-center gap-2 text-brand underline underline-offset-4">{ux("requirementsTitle", { name: destination.nombre })}</Link></div></section>}
    {packages.length > 0 && <section className="space-y-6"><h2 id="related-packages-title" className="t-h2">{packagePage("relatedPackages")}</h2><PackageGrid items={packages} label={packagePage("relatedPackages")} /></section>}
    {guides.length > 0 && <section className="space-y-6" aria-labelledby="package-guides-title"><h2 id="package-guides-title" className="t-h2">{ux("relatedGuides")}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{guides.map(post => <BlogCard key={post.id} post={post} />)}</div></section>}
    <StickyQuoteBar targetId="solicitar-cotizacion" title={item.nombre} />
  </main>;
}
