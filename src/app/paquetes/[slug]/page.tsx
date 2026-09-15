import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { getPackage } from "@/lib/packages";
import { siteConfig } from "@/lib/site-config";
import { PackageImage, PackageMeta, PackagePrice, PackageQuote } from "@/components/packages/package-card";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  const title = `viatour | ${item.nombre} desde Honduras`;
  // Metadatos pendientes de aprobación final; datos del paquete proceden de Supabase.
  const description = `${item.nombre} desde Honduras. Solicite su cotización con viatour y comparta sus fechas y pasajeros para ajustar el viaje a su presupuesto.`;
  const url = `/paquetes/${item.slug}`;
  return { title: { absolute: title }, description, alternates: { canonical: url }, openGraph: { title, description, url, locale: "es_HN", ...(item.imagen_url ? { images: [{ url: item.imagen_url, alt: `${item.nombre}, ${item.destino}` }] } : {}) }, twitter: { card: item.imagen_url ? "summary_large_image" : "summary", title, description, ...(item.imagen_url ? { images: [item.imagen_url] } : {}) } };
}
export default async function Page({ params }: Props) {
  const item = await getPackage((await params).slug);
  if (!item) notFound();
  const url = `${siteConfig.url}/paquetes/${item.slug}`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Product", name: item.nombre, description: item.descripcion, url, ...(item.imagen_url ? { image: item.imagen_url } : {}), offers: { "@type": "Offer", url, priceCurrency: item.moneda, ...(item.precio_desde === null ? {} : { price: item.precio_desde }), seller: { "@type": "TravelAgency", name: "viatour", url: siteConfig.url } } },
    { "@type": "BreadcrumbList", itemListElement: [ { "@type": "ListItem", position: 1, name: "Inicio", item: siteConfig.url }, { "@type": "ListItem", position: 2, name: "Paquetes", item: `${siteConfig.url}/paquetes` }, { "@type": "ListItem", position: 3, name: item.nombre, item: url } ] },
  ] };
  return <main className="container-site space-y-8 py-14 sm:py-24">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <Link href="/paquetes" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />Volver a paquetes</Link>
    <header className="space-y-4"><h1 className="t-h1">{item.nombre}</h1><PackageMeta item={item} /></header>
    <div className="grid items-start gap-8 lg:grid-cols-3"><div className="space-y-8 lg:col-span-2"><div className="overflow-hidden rounded-card"><PackageImage item={item} hero /></div><p className="t-body measure whitespace-pre-line">{item.descripcion}</p>{item.incluye?.length > 0 && <section className="space-y-6" aria-labelledby="includes-title"><h2 id="includes-title" className="t-h2">Qué incluye</h2><ul className="space-y-4">{item.incluye.map((inclusion, index) => <li key={index} className="t-body flex gap-3"><Check size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /><span>{inclusion}</span></li>)}</ul></section>}</div><aside className="space-y-6 rounded-panel border border-line bg-surface p-6"><PackagePrice item={item} /><PackageQuote item={item} /></aside></div>
  </main>;
}
