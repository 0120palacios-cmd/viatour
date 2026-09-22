import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { localizedContentMetadata, detailDescription } from "@/lib/seo";
import { getDestination } from "@/lib/destinations";
import { getPackagesForDestination } from "@/lib/packages";
import { siteConfig } from "@/lib/site-config";
import { DestinationImage } from "@/components/destinations/destination-card";
import { PackageGrid } from "@/components/packages/package-card";
import { QuoteButton } from "@/components/home/quote-button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getDestination((await params).slug);
  if (!item) notFound();
  return localizedContentMetadata(
    `/destinos/${item.slug}`,
    item.titulo_seo?.trim() || `viatour | Viajes a ${item.nombre} personalizados desde Honduras`,
    item.meta_descripcion?.trim() || detailDescription(item.nombre, item.intro),
    item.imagen_url,
  );
}

export default async function Page({ params }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const item = await getDestination((await params).slug);
  if (!item) notFound();
  const packages = await getPackagesForDestination(item);
  const url = `${siteConfig.url}/destinos/${item.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: common("home"), item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: common("destinations"), item: `${siteConfig.url}/destinos` },
          { "@type": "ListItem", position: 3, name: item.nombre, item: url },
        ],
      },
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
          url: `${siteConfig.url}/paquetes/${pack.slug}`,
        })),
      }] : []),
    ],
  };
  const quote = <QuoteButton payload={{ service: "Destino", servicio: "destino", fields: { Destino: item.nombre }, formData: { slug: item.slug, nombre: item.nombre, destination_id: item.id } }}>{common("requestQuote")}</QuoteButton>;
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="container-site grid items-center gap-8 py-14 sm:py-24 lg:grid-cols-2">
        <div className="space-y-6">
          <h1 className="t-h1">{item.nombre}</h1>
          {item.intro && <p className="t-body-lg measure whitespace-pre-line text-ink-soft">{item.intro}</p>}
          {quote}
        </div>
        <div className="overflow-hidden rounded-card border border-line"><DestinationImage item={item} hero /></div>
      </header>
      {(item.cuerpo || item.mejor_epoca) && <div className="border-y border-line bg-surface py-14 sm:py-24"><div className="container-site grid items-start gap-12 lg:grid-cols-3">
        {item.cuerpo && <div className="space-y-6 lg:col-span-2">{item.cuerpo.split(/\r?\n\s*\r?\n/).filter(paragraph => paragraph.trim()).map((paragraph, index) => <p key={index} className="t-body measure whitespace-pre-line">{paragraph}</p>)}</div>}
        {item.mejor_epoca && <section aria-labelledby="season-title" className="space-y-4"><h2 id="season-title" className="t-h2">{t("destinationSeason")}</h2><p className="t-body measure whitespace-pre-line text-ink-soft">{item.mejor_epoca}</p></section>}
      </div></div>}
      <section className="container-site py-14 sm:py-24" aria-labelledby="destination-packages">
        <h2 id="destination-packages" className="t-h2 mb-8">{t("destinationPackages", { name: item.nombre })}</h2>
        {packages.length ? <PackageGrid items={packages} /> : <div className="space-y-6 rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noDestinationPackages")}</p>{quote}</div>}
      </section>
      {item.faqs.length > 0 && <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="destination-faq"><div className="container-site"><h2 id="destination-faq" className="t-h2 mb-8 text-center">{common("faq")}</h2><Accordion type="single" collapsible className="mx-auto max-w-3xl">{item.faqs.map((faq, index) => <AccordionItem key={index} value={String(index)}><AccordionTrigger>{faq.pregunta}</AccordionTrigger><AccordionContent>{faq.respuesta}</AccordionContent></AccordionItem>)}</Accordion></div></section>}
      <section className="container-site space-y-6 py-14 text-center sm:py-24" aria-labelledby="destination-quote">
        <h2 id="destination-quote" className="t-h2">{common("planTrip")}</h2>
        {quote}
        <Link href="/destinos" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />{t("backToDestinations")}</Link>
      </section>
    </main>
  );
}
