import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedPageMetadata } from "@/lib/seo";
import { PackageSkeletons } from "@/components/packages/package-skeletons";
import { PackageGrid } from "@/components/packages/package-card";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/components/home/sections";
import { getPackages } from "@/lib/packages";

type Props = { searchParams: Promise<{ region?: string }> };
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/paquetes", "packages"); }

// Region chips are links (?region=), so every filtered view is shareable and works without JavaScript.
async function Packages({ region }: { region?: string }) {
  const t = await getTranslations();
  const items = await getPackages();
  const counts = new Map<string, number>();
  for (const item of items) if (item.categoria) counts.set(item.categoria, (counts.get(item.categoria) ?? 0) + 1);
  const regions = [...counts.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const active = region && counts.has(region) ? region : undefined;
  const visible = active ? items.filter(item => item.categoria === active) : items;
  const chip = (label: string, count: number, value?: string) => { const current = value === active; return <li key={label}><Link href={value ? `/paquetes?region=${encodeURIComponent(value)}` : "/paquetes"} scroll={false} aria-current={current ? "page" : undefined} className={`t-small flex min-h-11 items-center gap-2 whitespace-nowrap rounded-btn border px-4 transition-colors duration-(--duration-fast) ease-out ${current ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line bg-canvas text-ink hover:border-ink-soft/40 hover:bg-surface"}`}>{label}<span className={current ? "text-brand-deep" : "text-ink-soft"}>{count}</span></Link></li>; };
  return <div className="space-y-8">
    {regions.length > 1 && <nav aria-label={t("ux.filterLabel")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="flex gap-2 sm:flex-wrap">{chip(t("ux.filterAll"), items.length)}{regions.map(value => chip(value, counts.get(value) ?? 0, value))}</ul></nav>}
    <p className="t-small text-ink-soft" aria-live="polite">{t("ux.packageCount", { count: visible.length })}</p>
    <PackageGrid items={visible} label={t("static.packagesAvailable")} layout="grid" />
  </div>;
}

export default async function Page({ searchParams }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const { region } = await searchParams;
  return <main>
    <div className="container-site">
      <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("packages"), href: "/paquetes" }]} title={common("packages")} intro={t("packagesIntro")} />
      <section aria-label={t("packagesAvailable")}><h2 className="sr-only">{t("packagesAvailable")}</h2><Suspense fallback={<PackageSkeletons layout="grid" count={6} />}><Packages region={region} /></Suspense></section>
    </div>
    <FinalCta />
  </main>;
}
