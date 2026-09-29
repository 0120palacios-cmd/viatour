import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Destination } from "@/lib/destinations";
import { canOptimizeImage } from "@/lib/image-optimization";
export { DestinationImage } from "@/components/destinations/destination-image";
export { DestinationSkeletons } from "@/components/destinations/destination-skeletons";

const tileSizes = "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px";
export const destinationGridClass = "grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3";

// One card for every destination listing: identical 4:3 image and a fixed-minimum title row,
// so cards align regardless of title length or whether a photo exists yet.
export function DestinationTile({ href, name, image }: { href: string; name: string; image: string | null }) {
  const t = useTranslations("home");
  return <Link href={href} className="media-card group flex h-full flex-col items-stretch overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
    <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface">
      {image ? <Image src={image} alt={t("photoAlt", { name })} fill unoptimized={!canOptimizeImage(image)} sizes={tileSizes} className="object-cover" /> : <div role="img" aria-label={t("photoPlaceholder", { name })} className="absolute inset-0" />}
    </div>
    <div className="flex min-h-24 flex-1 items-center justify-between gap-4 p-4 sm:p-6">
      <h3 className="t-h3 line-clamp-2 [overflow-wrap:normal] [word-break:normal]">{name}</h3>
      <ArrowUpRight size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />
    </div>
  </Link>;
}

export function DestinationCard({ item }: { item: Destination }) { return <DestinationTile href={"/destinos/" + item.slug} name={item.nombre} image={item.imagen_url} />; }
export function DestinationGrid({ items }: { items: Destination[] }) { const t = useTranslations("static"); if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>; return <div className={destinationGridClass}>{items.map(item => <DestinationCard key={item.id} item={item} />)}</div>; }
