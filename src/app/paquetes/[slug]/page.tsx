import { pageMetadata, detailDescription } from "@/lib/seo";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { getDestination } from "@/lib/destinations";
import { getPackage, type Package } from "@/lib/packages";
import { canOptimizeImage } from "@/lib/image-optimization";
import { siteConfig } from "@/lib/site-config";
import { PackageImage, PackageMeta, PackagePrice, PackageQuote } from "@/components/packages/package-card";

type Props = { params: Promise<{ slug: string }> };

function itineraryItems(itinerario: string | null) {
  return (itinerario ?? "")
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.replace(/^Día\s+\d+(?:\s+a\s+\d+)?\s*[—–-]\s*/i, ""));
}

function PackageGallery({ item }: { item: Package }) {
  const sources = (Array.isArray(item.galeria) ? item.galeria : []).filter(source => typeof source === "string" && source.trim());
  const images = sources.length ? sources : item.imagen_url ? [item.imagen_url] : [];
  const alt = `Fotografías de ${item.nombre} en ${item.destino}`;

  if (!images.length) return <PackageImage item={item} hero />;

  return <div className="grid grid-cols-2 gap-4">
    {images.map((source, index) => <div key={`${source}-${index}`} className={`${index === 0 ? "col-span-2 aspect-video" : "aspect-[4/3]"} relative overflow-hidden rounded-card bg-surface`}>
      <Image src={source} alt={alt} fill preload={index === 0} unoptimized={!canOptimizeImage(source)} sizes={index === 0 ? "(max-width: 1023px) calc(100vw - 32px), 747px" : "(max-width: 639px) calc((100vw - 48px) / 2), 360px"} className="object-cover" />
    </div>)}
  </div>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  return pageMetadata(`/paquetes/${item.slug}`, `viatour | ${item.nombre} a su medida desde Honduras`, detailDescription(item.nombre, item.resumen || item.descripcion), item.imagen_url, false);
}

export default async function Page({ params }: Props) {
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  const destination = item.destination_id ? await getDestination(item.destination_id, "id") : null;
  const url = `${siteConfig.url}/paquetes/${item.slug}`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Product", name: item.nombre, description: item.descripcion, url, ...(item.imagen_url ? { image: item.imagen_url } : {}) },
    { "@type": "BreadcrumbList", itemListElement: [ { "@type": "ListItem", position: 1, name: "Inicio", item: siteConfig.url }, { "@type": "ListItem", position: 2, name: "Paquetes", item: `${siteConfig.url}/paquetes` }, { "@type": "ListItem", position: 3, name: item.nombre, item: url } ] },
  ] };
  const itinerary = itineraryItems(item.itinerario);

  return <main className="container-site space-y-8 py-14 sm:py-24">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <Link href="/paquetes" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />Volver a paquetes</Link>
    <header className="space-y-4"><h1 className="t-h1">{item.nombre}</h1><PackageMeta item={item} /></header>
    <div className="grid items-start gap-8 lg:grid-cols-3"><div className="space-y-8 lg:col-span-2">
      <PackageGallery item={item} />
      <p className="t-body measure whitespace-pre-line">{item.descripcion}</p>
      {item.etiquetas?.length > 0 && <ul aria-label="Etiquetas del paquete" className="flex flex-wrap gap-2">{item.etiquetas.map(etiqueta => <li key={etiqueta} className="rounded-btn border border-line bg-surface px-3 py-1 t-small text-ink-soft">{etiqueta}</li>)}</ul>}
      {item.incluye?.length > 0 && <section className="space-y-6" aria-labelledby="includes-title"><h2 id="includes-title" className="t-h2">Qué incluye</h2><ul className="space-y-4">{item.incluye.map((inclusion, index) => <li key={index} className="t-body flex gap-3"><Check size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /><span>{inclusion}</span></li>)}</ul></section>}
      {itinerary.length > 0 && <section className="space-y-6" aria-labelledby="itinerary-title"><h2 id="itinerary-title" className="t-h2">Itinerario</h2><ol className="list-decimal space-y-4 pl-5">{itinerary.map((day, index) => <li key={`${day}-${index}`} className="t-body pl-2">{day}</li>)}</ol></section>}
    </div><aside className="space-y-6 rounded-panel border border-line bg-surface p-6"><PackagePrice item={item} /><PackageQuote item={item} /></aside></div>
    {destination && <section className="rounded-panel border border-line bg-surface p-8"><h2 className="t-h2"><Link href={`/destinos/${destination.slug}`} className="text-brand underline underline-offset-4">Conozca más sobre {destination.nombre}</Link></h2></section>}
  </main>;
}
