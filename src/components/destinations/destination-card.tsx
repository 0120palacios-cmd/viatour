import { canOptimizeImage } from "@/lib/image-optimization";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Destination } from "@/lib/destinations";

export function DestinationImage({ item, hero = false }: { item: Destination; hero?: boolean }) {
  const className = `${hero ? "aspect-video" : "aspect-[4/3]"} relative overflow-hidden bg-surface`;
  return item.imagen_url ? <div className={className}><Image src={item.imagen_url} alt={`Fotografía de ${item.nombre}`} fill priority={hero} unoptimized={!canOptimizeImage(item.imagen_url)} sizes={hero ? "(max-width: 1024px) 100vw, 600px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"} className="object-cover" /></div> : <div role="img" aria-label={`Espacio reservado para una fotografía de ${item.nombre}`} className={className} />;
}
export function DestinationCard({ item }: { item: Destination }) {
  return <Link href={`/destinos/${item.slug}`} className="group block overflow-hidden rounded-card border border-line bg-canvas shadow-sm transition-shadow duration-(--duration-fast) ease-out hover:shadow-md"><DestinationImage item={item} /><div className="flex items-center justify-between gap-4 p-6"><h3 className="t-h3">{item.nombre}</h3><ArrowUpRight size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /></div></Link>;
}
export function DestinationGrid({ items }: { items: Destination[] }) {
  // Copy pendiente de aprobación final
  return items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <DestinationCard key={item.id} item={item} />)}</div> : <p className="t-body rounded-panel border border-line bg-surface p-8 text-center text-ink-soft">Aún no hay destinos publicados.</p>;
}
export function DestinationSkeletons() {
  // Copy pendiente de aprobación final
  return <div role="status"><span className="sr-only">Cargando destinos</span><div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(key => <div key={key} className="overflow-hidden rounded-card border border-line motion-safe:animate-pulse"><div className="aspect-[4/3] bg-surface" /><div className="p-6"><div className="h-8 rounded-btn bg-surface" /></div></div>)}</div></div>;
}
