import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Destination } from "@/lib/destinations";
import { canOptimizeImage } from "@/lib/image-optimization";
export { DestinationImage } from "@/components/destinations/destination-image";
export { DestinationSkeletons } from "@/components/destinations/destination-skeletons";

const tileSizes = "(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px";
// An odd last tile spans the row on two-column layouts instead of sitting alone beside a gap.
export const destinationGridClass = "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 max-lg:[&>:last-child:nth-child(odd)]:col-span-2 max-lg:[&>:last-child:nth-child(odd)]:aspect-[2/1]";
// Three columns from 1024px: with 3n+2 tiles (11 today) the last row held two tiles beside a gap.
// The first tile spans two columns instead, so every row is full.
export const wideFirstTile = (count: number) => count % 3 === 2;
const wideSizes = "(max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) * 2 / 3 + 24px), 760px";

// One tile for every destination listing: a 4:3 photo with the name set on a subtle gradient
// (the only place text sits on a photo), so a grid of 11 destinations stays scannable on a phone.
export function DestinationTile({ href, name, image, wide = false }: { href: string; name: string; image: string | null; wide?: boolean }) {
  const t = useTranslations("home");
  return <Link href={href} className={`media-card group relative block aspect-[4/3] overflow-hidden rounded-card border border-line bg-surface shadow-sm ${wide ? "lg:col-span-2 lg:aspect-auto" : ""}`}>
    {image ? <Image src={image} alt={t("photoAlt", { name })} fill unoptimized={!canOptimizeImage(image)} sizes={wide ? wideSizes : tileSizes} className="object-cover" /> : <div role="img" aria-label={t("photoPlaceholder", { name })} className="absolute inset-0 flex items-center justify-center bg-brand-tint text-brand"><MapPin size={32} strokeWidth={1.5} aria-hidden="true" /></div>}
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/80 via-ink/40 to-transparent p-3 pt-12 sm:p-5 sm:pt-16">
      <h3 className="t-h3 text-canvas [overflow-wrap:normal] [word-break:normal]">{name}</h3>
      <ArrowUpRight size={20} strokeWidth={1.75} className="mb-0.5 shrink-0 text-canvas transition-transform duration-(--duration-fast) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
    </div>
  </Link>;
}

export function DestinationCard({ item, wide = false }: { item: Destination; wide?: boolean }) { return <DestinationTile href={"/destinos/" + item.slug} name={item.nombre} image={item.imagen_url} wide={wide} />; }
export function DestinationGrid({ items }: { items: Destination[] }) { const t = useTranslations("static"); if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>; return <div className={destinationGridClass}>{items.map((item, index) => <DestinationCard key={item.id} item={item} wide={index === 0 && wideFirstTile(items.length)} />)}</div>; }
