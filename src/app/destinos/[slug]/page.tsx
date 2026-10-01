import { JsonLd } from "@/components/seo/json-ld";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileCheck2 } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { absoluteUrl, breadcrumbSchema, localizedContentMetadata, localizedUrl, detailDescription, websiteId } from "@/lib/seo";
import { getDestination, getDestinations, type Destination } from "@/lib/destinations";
import { getBlogPosts, type BlogPost } from "@/lib/blog";
import { guideDestination } from "@/lib/guide-utils";
import { getPackagesForDestination } from "@/lib/packages";
import Image from "next/image";
import { DestinationTile, MoreDestinationsTile } from "@/components/destinations/destination-card";
import { canOptimizeImage } from "@/lib/image-optimization";
import { PackageGrid } from "@/components/packages/package-card";
import { BlogCard } from "@/components/blog/card";
import { RatingBadge } from "@/components/reviews/rating-badge";
import { QuoteButton } from "@/components/home/quote-button";
import { StickyQuoteBar } from "@/components/quote/sticky-quote-bar";
import { ShareButton } from "@/components/share-button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ slug: string }> };

function plain(value: string) { return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(); }

// Guides about this destination: those whose title is about it first, then those that mention it.
function destinationGuides(item: Destination, posts: BlogPost[]) {
  const name = plain(item.nombre);
  const about = posts.filter(post => guideDestination(post.titulo)?.slug === item.slug);
  const mentions = posts.filter(post => !about.includes(post) && plain(`${post.titulo} ${post.extracto}`).includes(name));
  return [...about, ...mentions].slice(0, 3);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getDestination((await params).slug);
  if (!item) notFound();
  const locale = (await getLocale()) as Locale;
  const english = locale === "en";
  return localizedContentMetadata(
    `/destinos/${item.slug}`,
    english ? `viatour | ${item.nombre} travel destination from Honduras` : item.titulo_seo?.trim() || `viatour | Viajes a ${item.nombre} personalizados desde Honduras`,
    english ? `Plan a trip to ${item.nombre} from Honduras with viatour. Explore destination information and request personal travel advice for your dates and plans.` : item.meta_descripcion?.trim() || detailDescription(item.nombre, item.intro),
    item.imagen_url,
  );
}

export default async function Page({ params }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const home = await getTranslations("home");
  const ux = await getTranslations("ux");
  const locale = (await getLocale()) as Locale;
  const item = await getDestination((await params).slug);
  if (!item) notFound();
  const [packages, destinations, posts] = await Promise.all([getPackagesForDestination(item), getDestinations().catch(() => []), getBlogPosts().catch(() => [])]);
  const guides = destinationGuides(item, posts);
  // Keeps the catalogue order and continues after this destination, so every page links onward.
  const position = destinations.findIndex(destination => destination.id === item.id);
  const others = [...destinations.slice(position + 1), ...destinations.slice(0, Math.max(position, 0))].filter(destination => destination.id !== item.id).slice(0, 3);
  const url = localizedUrl(`/destinos/${item.slug}`, locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristDestination",
        "@id": `${url}#destination`,
        name: item.nombre,
        description: item.intro || item.nombre,
        url,
        isPartOf: { "@id": websiteId },
        ...(item.imagen_url ? { image: absoluteUrl(item.imagen_url) } : {}),
        ...(guides.length ? { subjectOf: guides.map(post => ({ "@type": "BlogPosting", headline: post.titulo, url: localizedUrl(`/blog/${post.slug}`, locale) })) } : {}),
      },
      breadcrumbSchema([
        { label: common("home"), href: "/" },
        { label: common("destinations"), href: "/destinos" },
        { label: item.nombre, href: `/destinos/${item.slug}` },
      ], locale),
      ...(item.faqs.length ? [{
        "@type": "FAQPage",
        mainEntity: item.faqs.map(faq => ({
          "@type": "Question",
          name: faq.pregunta,
          acceptedAnswer: { "@type": "Answer", text: faq.respuesta },
        })),
      }] : []),
      ...(packages.length ? [{
        "@type": "ItemList",
        itemListElement: packages.map((pack, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: pack.nombre,
          url: localizedUrl(`/paquetes/${pack.slug}`, locale),
        })),
      }] : []),
    ],
  };
  const quotePayload = { service: "Destino", servicio: "destino", fields: { Destino: item.nombre }, formData: { slug: item.slug, nombre: item.nombre, destination_id: item.id } };
  const quote = <QuoteButton payload={quotePayload}>{common("requestQuote")}</QuoteButton>;
  const bottomQuote = <QuoteButton payload={quotePayload} align="center">{common("requestQuote")}</QuoteButton>;
  return (
    <main>
      <JsonLd data={structuredData} />
      <div className="container-site pb-4 pt-6 sm:pt-8"><Breadcrumbs schema={false} items={[{ label: common("home"), href: "/" }, { label: common("destinations"), href: "/destinos" }, { label: item.nombre, href: `/destinos/${item.slug}` }]} /></div>
      {/* The destination's own photo carries the first screen; the gradient sits only where the text is. */}
      <header className="container-site">
        <div className={`relative isolate flex min-h-[440px] items-end overflow-hidden rounded-panel sm:min-h-[520px] ${item.imagen_url ? "bg-ink" : "bg-brand-deep"}`}>
          {item.imagen_url && <Image src={item.imagen_url} alt={home("photoAlt", { name: item.nombre })} fill preload unoptimized={!canOptimizeImage(item.imagen_url)} sizes="(max-width: 1199px) calc(100vw - 32px), 1152px" className="hero-drift -z-10 object-cover" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/5 lg:bg-gradient-to-r lg:from-ink/80 lg:via-ink/40 lg:to-transparent" />
          <div className="w-full space-y-5 p-6 text-canvas sm:p-10 lg:max-w-2xl lg:p-12">
            <h1 className="t-display">{item.nombre}</h1>
            {item.intro && <p className="t-body-lg measure whitespace-pre-line text-canvas/90">{item.intro}</p>}
            <div className="flex items-start gap-3">{quote}<ShareButton title={item.nombre} tone="dark" /></div>
          </div>
        </div>
        <div className="py-4"><RatingBadge /></div>
      </header>
      <div className="mt-4 border-y border-line bg-surface py-12 sm:mt-8 sm:py-24"><div className="container-site grid items-start gap-12 lg:grid-cols-3">
        {item.cuerpo && <div className="space-y-6 lg:col-span-2">{item.cuerpo.split(/\r?\n\s*\r?\n/).filter(paragraph => paragraph.trim()).map((paragraph, index) => <p key={index} className="t-body measure whitespace-pre-line">{paragraph}</p>)}</div>}
        <div className="space-y-6">
          {item.mejor_epoca && <section aria-labelledby="season-title" className="space-y-4"><h2 id="season-title" className="t-h2">{t("destinationSeason")}</h2><p className="t-body measure whitespace-pre-line text-ink-soft">{item.mejor_epoca}</p></section>}
          {/* Documents are the first practical question after "when": answer it where it is asked. */}
          <section aria-labelledby="destination-requirements" className="space-y-4 rounded-card border border-line bg-canvas p-6 shadow-sm">
            <div className="flex items-center gap-3"><FileCheck2 size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /><h2 id="destination-requirements" className="t-h3">{ux("requirementsTitle", { name: item.nombre })}</h2></div>
            <p className="t-body text-ink-soft">{ux("requirementsBody")}</p>
            <Button asChild variant="ghost"><Link href={{ pathname: "/requisitos", query: { destino: item.nombre } }}>{ux("requirementsCta")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
          </section>
        </div>
      </div></div>
      <section className="container-site py-12 sm:py-24">
        <h2 id="destination-packages" className="t-h2 mb-8">{t("destinationPackages", { name: item.nombre })}</h2>
        {packages.length ? <PackageGrid layout={packages.length > 3 ? "grid" : "carousel"} items={packages} label={t("destinationPackages", { name: item.nombre })} /> : <div className="space-y-4 rounded-panel border border-line bg-surface p-6 sm:p-8"><p className="t-body text-ink-soft">{t("noDestinationPackages")}</p><Button asChild variant="ghost"><Link href="/paquetes">{ux("allPackages")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button></div>}
      </section>
      {guides.length > 0 && <section className="container-site pb-12 sm:pb-24" aria-labelledby="destination-guides">
        <h2 id="destination-guides" className="t-h2 mb-8">{ux("destinationGuides", { name: item.nombre })}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{guides.map(post => <BlogCard key={post.id} post={post} />)}</div>
      </section>}
      {item.faqs.length > 0 && <section className="border-y border-line bg-surface py-12 sm:py-24" aria-labelledby="destination-faq"><div className="container-site"><h2 id="destination-faq" className="t-h2 mb-8 text-center">{common("faq")}</h2><Accordion type="single" collapsible className="mx-auto max-w-3xl">{item.faqs.map((faq, index) => <AccordionItem key={index} value={String(index)}><AccordionTrigger>{faq.pregunta}</AccordionTrigger><AccordionContent>{faq.respuesta}</AccordionContent></AccordionItem>)}</Accordion></div></section>}
      <section id="solicitar-cotizacion" className="container-site scroll-mt-24 py-12 sm:py-24" aria-labelledby="destination-quote">
        <div className="space-y-6 rounded-panel border border-line bg-brand-tint px-6 py-10 text-center sm:px-12 sm:py-14">
          <h2 id="destination-quote" className="t-h2">{common("planTrip")}</h2>
          <p className="t-body-lg mx-auto max-w-2xl text-ink-soft">{home("finalBody")}</p>
          <div className="flex justify-center">{bottomQuote}</div>
        </div>
      </section>
      {others.length > 0 && <nav className="container-site pb-12 sm:pb-24" aria-labelledby="other-destinations">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><h2 id="other-destinations" className="t-h2">{ux("otherDestinations")}</h2><Link href="/destinos" className="t-small inline-flex min-h-11 items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />{t("backToDestinations")}</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{others.map(destination => <DestinationTile key={destination.id} href={`/destinos/${destination.slug}`} name={destination.nombre} image={destination.imagen_url} />)}<MoreDestinationsTile /></div>
      </nav>}
      <StickyQuoteBar targetId="solicitar-cotizacion" title={item.nombre} />
    </main>
  );
}
