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

// Phones get two columns: a full listing of 34 packages in one column was ~16,000px of scrolling.
export const packageGridClass = "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3";

// Prices stay hidden in this phase, so the card's only price slot is the quote CTA.
// The photo and title open the package; the CTA jumps straight to its quote form.
// `dense` (grid listings): below 640px the card is a compact tile, the whole tile opens the
// package and the CTA waits on the package page, where the form is.
export function PackageCard({ item, dense = false, preload = false }: { item: Package; dense?: boolean; preload?: boolean }) {
  const t = useTranslations("packageQuote");
  return <article className="package-carousel-item media-card group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
    <Link href={`/paquetes/${item.slug}`} className={`block ${dense ? "max-sm:after:absolute max-sm:after:inset-0 max-sm:after:content-['']" : ""}`}>
      <div className="relative">
        <PackageImage item={item} preload={preload} dense={dense} />
        {item.categoria && <span className={`t-small absolute left-3 top-3 rounded-btn bg-canvas/95 px-3 py-1 text-ink shadow-sm ${dense ? "max-sm:left-2 max-sm:top-2 max-sm:px-2 max-sm:text-xs" : ""}`}>{item.categoria}</span>}
      </div>
      <div className={`px-4 pt-4 sm:px-6 sm:pt-6 ${dense ? "max-sm:px-3 max-sm:pt-3" : ""}`}>
        <h3 className={`t-h3 line-clamp-2 [overflow-wrap:normal] [word-break:normal] group-hover:text-brand ${dense ? "max-sm:line-clamp-3 max-sm:text-base! max-sm:leading-snug!" : ""}`}>{item.nombre}</h3>
      </div>
    </Link>
    <div className={`flex flex-1 flex-col gap-4 p-4 pt-3 sm:p-6 sm:pt-3 ${dense ? "max-sm:gap-0 max-sm:p-3 max-sm:pt-2" : ""}`}>
      <PackageMeta item={item} />
      <Link href={`/paquetes/${item.slug}#solicitar-cotizacion`} className={`t-button relative z-10 mt-auto min-h-12 w-full items-center justify-center whitespace-nowrap rounded-btn border border-brand px-4 py-3 text-brand transition-colors duration-(--duration-fast) ease-out hover:bg-brand hover:text-canvas ${dense ? "hidden sm:flex" : "flex"}`}>{t("open")}</Link>
    </div>
  </article>;
}

// "carousel" swipes on phones (short featured/related rows); "grid" stacks for full listings.
// `preloadCount` fetches the first photos eagerly when they sit in the first screen.
export function PackageGrid({ items, label, layout = "carousel", preloadCount = 0 }: { items: Package[]; label?: string; layout?: "carousel" | "grid"; preloadCount?: number }) {
  const t = useTranslations("static");
  const common = useTranslations("common");
  if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>;
  if (layout === "grid") return <ul aria-label={label ?? common("packages")} className={packageGridClass}>{items.map((item, index) => <li key={item.id} className="min-w-0"><PackageCard item={item} dense preload={index < preloadCount} /></li>)}</ul>;
  return <div role="region" aria-label={label ?? common("packages")} tabIndex={0} className="package-carousel">{items.map((item, index) => <PackageCard key={item.id} item={item} preload={index < preloadCount} />)}</div>;
}
