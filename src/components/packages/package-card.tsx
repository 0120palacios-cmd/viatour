import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Package } from "@/lib/packages";
import { PackageImage } from "@/components/packages/package-image";
import { PackageMeta } from "@/components/packages/package-meta";
export { PackageImage } from "@/components/packages/package-image";
export { PackageMeta } from "@/components/packages/package-meta";
export { PackagePrice } from "@/components/packages/package-price";
export { PackageQuote } from "@/components/packages/package-quote";
export { PackageSkeletons } from "@/components/packages/package-skeletons";

export const packageGridClass = "grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3";

// Prices stay hidden in this phase, so the card's only price slot is the quote CTA.
// The photo and title open the package; the CTA jumps straight to its quote form.
export function PackageCard({ item }: { item: Package }) {
  const t = useTranslations("packageQuote");
  return <article className="package-carousel-item media-card group flex h-full flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
    <Link href={`/paquetes/${item.slug}`} className="block">
      <div className="relative">
        <PackageImage item={item} />
        {item.categoria && <span className="t-small absolute left-3 top-3 rounded-btn bg-canvas/95 px-3 py-1 text-ink shadow-sm">{item.categoria}</span>}
      </div>
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <h3 className="t-h3 line-clamp-2 [overflow-wrap:normal] [word-break:normal] group-hover:text-brand">{item.nombre}</h3>
      </div>
    </Link>
    <div className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:p-6 sm:pt-3">
      <PackageMeta item={item} />
      <Link href={`/paquetes/${item.slug}#solicitar-cotizacion`} className="t-button mt-auto flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-btn border border-brand px-4 py-3 text-brand transition-colors duration-(--duration-fast) ease-out hover:bg-brand hover:text-canvas">{t("open")}</Link>
    </div>
  </article>;
}

// "carousel" swipes on phones (short featured/related rows); "grid" stacks for full listings.
export function PackageGrid({ items, label, layout = "carousel" }: { items: Package[]; label?: string; layout?: "carousel" | "grid" }) {
  const t = useTranslations("static");
  const common = useTranslations("common");
  if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>;
  if (layout === "grid") return <ul aria-label={label ?? common("packages")} className={packageGridClass}>{items.map(item => <li key={item.id} className="min-w-0"><PackageCard item={item} /></li>)}</ul>;
  return <div role="region" aria-label={label ?? common("packages")} tabIndex={0} className="package-carousel">{items.map(item => <PackageCard key={item.id} item={item} />)}</div>;
}
