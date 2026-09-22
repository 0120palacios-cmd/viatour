import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Package } from "@/lib/packages";
import { PackageImage } from "@/components/packages/package-image";
import { PackageMeta } from "@/components/packages/package-meta";
import { PackagePrice } from "@/components/packages/package-price";
import { PackageQuote } from "@/components/packages/package-quote";
export { PackageImage } from "@/components/packages/package-image";
export { PackageMeta } from "@/components/packages/package-meta";
export { PackagePrice } from "@/components/packages/package-price";
export { PackageQuote } from "@/components/packages/package-quote";
export { PackageSkeletons } from "@/components/packages/package-skeletons";

export function PackageCard({ item }: { item: Package }) { return <article className="media-card flex h-full flex-col rounded-card border border-line bg-canvas p-6 shadow-sm"><Link href={`/paquetes/${item.slug}`} className="block"><PackageImage item={item} />{item.categoria && <p className="t-small mt-4 text-ink-soft">{item.categoria}</p>}<h3 className="t-h3 mt-6">{item.nombre}</h3></Link><div className="flex flex-1 flex-col gap-4 pt-6"><PackageMeta item={item} /><div className="mt-auto space-y-4"><PackagePrice item={item} /><PackageQuote item={item} /></div></div></article>; }
export function PackageGrid({ items }: { items: Package[] }) { const t = useTranslations("static"); if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>; return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <PackageCard key={item.id} item={item} />)}</div>; }
