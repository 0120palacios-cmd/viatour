import { canOptimizeImage } from "@/lib/image-optimization";
import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { QuoteButton } from "@/components/home/quote-button";
import type { Package } from "@/lib/packages";

export function PackageImage({ item, hero = false }: { item: Package; hero?: boolean }) {
  const className = `${hero ? "aspect-video" : "aspect-[4/3]"} relative overflow-hidden rounded-card bg-surface`;
  return item.imagen_url ? <div className={className}><Image src={item.imagen_url} alt={`${item.nombre}, ${item.destino}`} fill preload={hero} unoptimized={!canOptimizeImage(item.imagen_url)} sizes={hero ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1199px) calc((100vw - 80px) * 2 / 3), 747px" : "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px"} className="object-cover" /></div>
    : <div role="img" aria-label={`Espacio reservado para una fotografía de ${item.destino}`} className={className} />;
}
export function PackageMeta({ item }: { item: Package }) {
  return <div className="t-small flex flex-wrap gap-4 text-ink-soft"><span className="inline-flex items-center gap-2"><MapPin size={16} strokeWidth={1.75} aria-hidden="true" />{item.destino}</span><span className="inline-flex items-center gap-2"><Clock size={16} strokeWidth={1.75} aria-hidden="true" />{item.duracion}</span></div>;
}
export function PackagePrice({ item }: { item: Package }) {
  // One stored currency: never fabricate a conversion to the preferred currency.
  const amount = item.precio_desde === null ? null : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(item.precio_desde);
  return <p className="t-small text-ink-soft">{amount === null ? "Precio referencial — pídanos su cotización" : `desde ${item.moneda === "USD" ? "$" : item.moneda === "HNL" ? "L " : ""}${amount} ${item.moneda}`}</p>;
}
export function PackageQuote({ item }: { item: Package }) {
  // Copy funcional pendiente de aprobación final.
  return <QuoteButton payload={{ service: "Paquete", servicio: "paquetes", fields: { Destino: item.destino, Paquete: item.nombre, Notas: "Por favor, comparta sus fechas y el número de pasajeros." }, formData: { slug: item.slug, nombre: item.nombre, destino: item.destino } }}>Solicitar cotización</QuoteButton>;
}
export function PackageCard({ item }: { item: Package }) {
  return <article className="media-card flex h-full flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm transition-shadow duration-(--duration-fast) ease-out hover:shadow-md"><Link href={`/paquetes/${item.slug}`} className="block"><PackageImage item={item} /><h3 className="t-h3 px-6 pt-6">{item.nombre}</h3></Link><div className="flex flex-1 flex-col gap-4 p-6"><PackageMeta item={item} /><div className="mt-auto space-y-4"><PackagePrice item={item} /><PackageQuote item={item} /></div></div></article>;
}
export function PackageGrid({ items }: { items: Package[] }) {
  return items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <PackageCard key={item.id} item={item} />)}</div> : <p className="t-body rounded-panel border border-line bg-surface p-8 text-center text-ink-soft">Aún no hay paquetes disponibles.</p>;
}
export function PackageSkeletons() {
  // Copy funcional pendiente de aprobación final.
  return <div role="status" aria-label="Cargando paquetes"><span className="sr-only">Cargando paquetes</span><div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(key => <div key={key} className="overflow-hidden rounded-card border border-line bg-canvas motion-safe:animate-pulse"><div className="aspect-[4/3] bg-surface" /><div className="space-y-4 p-6"><div className="h-8 w-3/4 rounded-btn bg-surface" /><div className="h-4 rounded-btn bg-surface" /><div className="h-12 rounded-btn bg-surface" /></div></div>)}</div></div>;
}
