import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDestination } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { siteConfig } from "@/lib/site-config";
import { DestinationImage } from "@/components/destinations/destination-card";
import { PackageGrid } from "@/components/packages/package-card";
import { QuoteButton } from "@/components/home/quote-button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getDestination((await params).slug);
  if (!item) notFound();
  const title = item.titulo_seo?.trim() || `viatour | ${item.nombre} desde Honduras`;
  const description = item.meta_descripcion || undefined;
  const url = `/destinos/${item.slug}`;
  return { title: { absolute: title }, description, alternates: { canonical: url },
    openGraph: { title, description, url, locale: "es_HN", ...(item.imagen_url ? { images: [{ url: item.imagen_url, alt: `Fotografía de ${item.nombre}` }] } : {}) },
    twitter: { card: item.imagen_url ? "summary_large_image" : "summary", title, description, ...(item.imagen_url ? { images: [item.imagen_url] } : {}) },
  };
}
export default async function Page({ params }: Props) {
  const item = await getDestination((await params).slug);
  if (!item) notFound();
  const packages = await getPackages(false, item.id);
  const url = `${siteConfig.url}/destinos/${item.slug}`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Destinos", item: `${siteConfig.url}/destinos` },
      { "@type": "ListItem", position: 3, name: item.nombre, item: url },
    ] },
    ...(item.faqs.length ? [{ "@type": "FAQPage", mainEntity: item.faqs.map(faq => ({ "@type": "Question", name: faq.pregunta, acceptedAnswer: { "@type": "Answer", text: faq.respuesta } })) }] : []),
    ...(packages.length ? [{ "@type": "ItemList", itemListElement: packages.map((pack, index) => ({ "@type": "ListItem", position: index + 1, name: pack.nombre, url: `${siteConfig.url}/paquetes/${pack.slug}` })) }] : []),
  ] };
  const quote = <QuoteButton payload={{ service: "Destino", servicio: "destino", fields: { Destino: item.nombre }, formData: { slug: item.slug, nombre: item.nombre, destination_id: item.id } }}>Solicitar cotización</QuoteButton>;
  // Copy pendiente de aprobación final: títulos funcionales y estado vacío.
  // El contenido editorial, incluidos sus avisos de ejemplo, procede de Supabase.
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <header className="container-site grid items-center gap-8 py-14 sm:py-24 lg:grid-cols-2">
      <div className="space-y-6"><h1 className="t-h1">{item.nombre}</h1>{item.intro && <p className="t-body-lg measure whitespace-pre-line text-ink-soft">{item.intro}</p>}{quote}</div>
      <div className="overflow-hidden rounded-card border border-line"><DestinationImage item={item} hero /></div>
    </header>
    {(item.cuerpo || item.mejor_epoca) && <div className="border-y border-line bg-surface py-14 sm:py-24"><div className="container-site grid items-start gap-12 lg:grid-cols-3">
      {item.cuerpo && <div className="space-y-6 lg:col-span-2">{item.cuerpo.split(/\r?\n\s*\r?\n/).filter(paragraph => paragraph.trim()).map((paragraph, index) => <p key={index} className="t-body measure whitespace-pre-line">{paragraph}</p>)}</div>}
      {item.mejor_epoca && <section aria-labelledby="season-title" className="space-y-4"><h2 id="season-title" className="t-h2">Mejor época para viajar</h2><p className="t-body measure whitespace-pre-line text-ink-soft">{item.mejor_epoca}</p></section>}
    </div></div>}
    <section className="container-site py-14 sm:py-24" aria-labelledby="destination-packages"><h2 id="destination-packages" className="t-h2 mb-8">Paquetes en {item.nombre}</h2>
      {packages.length ? <PackageGrid items={packages} /> : <div className="space-y-6 rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">Aún no hay paquetes publicados para este destino. Pídanos su cotización.</p>{quote}</div>}
    </section>
    {item.faqs.length > 0 && <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="destination-faq"><div className="container-site"><h2 id="destination-faq" className="t-h2 mb-8 text-center">Preguntas frecuentes</h2><Accordion type="single" collapsible className="mx-auto max-w-3xl">{item.faqs.map((faq, index) => <AccordionItem key={index} value={String(index)}><AccordionTrigger>{faq.pregunta}</AccordionTrigger><AccordionContent>{faq.respuesta}</AccordionContent></AccordionItem>)}</Accordion></div></section>}
    <section className="container-site space-y-6 py-14 text-center sm:py-24" aria-labelledby="destination-quote"><h2 id="destination-quote" className="t-h2">Planifiquemos su viaje</h2>{quote}<Link href="/destinos" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />Volver a destinos</Link></section>
  </main>;
}
