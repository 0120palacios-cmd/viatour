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

// Prices stay hidden in this phase, so the card's only price slot is the quote CTA.
export function PackageCard({ item }: { item: Package }) {
  const t = useTranslations("packageQuote");
  return <article className="package-carousel-item media-card flex h-full flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
    <Link href={`/paquetes/${item.slug}`} className="block">
      <PackageImage item={item} />
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        {item.categoria && <p className="t-small mb-3 inline-flex rounded-btn bg-brand-tint px-3 py-1 text-brand-deep">{item.categoria}</p>}
        <h3 className="t-h3 line-clamp-2 [overflow-wrap:normal] [word-break:normal]">{item.nombre}</h3>
      </div>
    </Link>
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <PackageMeta item={item} />
      <Link href={`/paquetes/${item.slug}#solicitar-cotizacion`} className="mt-auto inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-btn border border-brand px-4 py-3 t-button text-brand transition-colors duration-(--duration-fast) ease-out hover:bg-brand-tint">{t("open")}</Link>
    </div>
  </article>;
}

export function PackageGrid({ items, label }: { items: Package[]; label?: string }) {
  const t = useTranslations("static");
  const common = useTranslations("common");
  if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>;
  return <div role="region" aria-label={label ?? common("packages")} tabIndex={0} className="package-carousel">{items.map(item => <PackageCard key={item.id} item={item} />)}</div>;
}
