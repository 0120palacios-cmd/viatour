import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Compass, Search, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localizedPath, type Locale } from "@/i18n/config";
import { collectionSchema, localizedPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { PackageSkeletons } from "@/components/packages/package-skeletons";
import { PackageGrid } from "@/components/packages/package-card";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/components/home/sections";
import { getPackages } from "@/lib/packages";
import { findTravelStyle, matchesSearch, matchesTravelStyle, travelStyles } from "@/lib/travel-styles";

type Filters = { region?: string; estilo?: string; q?: string };
type Props = { searchParams: Promise<Filters> };
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/paquetes", "packages"); }

// Every filter is a plain query parameter (?region=, ?estilo=, ?q=): each view is shareable, works
// without JavaScript and canonicalises to /paquetes. Chips keep the other active filters.
function query(filters: Filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) as Record<string, string>;
}

function Chip({ label, count, href, current }: { label: string; count?: number; href: { pathname: "/paquetes"; query: Record<string, string> }; current: boolean }) {
  return <li><Link href={href} scroll={false} aria-current={current ? "page" : undefined} className={`t-small flex min-h-11 items-center gap-2 whitespace-nowrap rounded-btn border px-4 transition-colors duration-(--duration-fast) ease-out ${current ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line bg-canvas text-ink hover:border-ink-soft/40 hover:bg-surface"}`}>{label}{count !== undefined && <span className={current ? "text-brand-deep" : "text-ink-soft"}>{count}</span>}</Link></li>;
}

async function Packages({ filters }: { filters: Filters }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const items = await getPackages();
  const regionCounts = new Map<string, number>();
  for (const item of items) if (item.categoria) regionCounts.set(item.categoria, (regionCounts.get(item.categoria) ?? 0) + 1);
  const regions = [...regionCounts.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const region = filters.region && regionCounts.has(filters.region) ? filters.region : undefined;
  const style = findTravelStyle(filters.estilo);
  const search = filters.q?.trim().slice(0, 80) || undefined;
  const active = { region, estilo: style?.slug, q: search };
  const visible = items.filter(item => (!region || item.categoria === region) && (!style || matchesTravelStyle(item, style)) && (!search || matchesSearch(item, search)));
  const styles = travelStyles.map(value => ({ value, count: items.filter(item => matchesTravelStyle(item, value)).length })).filter(entry => entry.count > 0);
  const filtered = Boolean(region || style || search);
  return <div className="space-y-8">
    {/* The whole catalogue, whichever filter is active: filtered URLs canonicalise to /paquetes. */}
    <JsonLd data={collectionSchema("/paquetes", t("common.packages"), items.map(item => ({ name: item.nombre, path: `/paquetes/${item.slug}`, image: item.imagen_url })), locale)} />
    <div className="space-y-4">
      <form role="search" action={localizedPath("/paquetes", locale)} method="get" className="flex max-w-2xl gap-2">
        {region && <input type="hidden" name="region" value={region} />}
        {style && <input type="hidden" name="estilo" value={style.slug} />}
        <label htmlFor="package-search" className="sr-only">{t("v3.searchLabel")}</label>
        <div className="relative min-w-0 flex-1">
          <Search size={20} strokeWidth={1.75} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input id="package-search" name="q" type="search" defaultValue={search} maxLength={80} placeholder={t("v3.searchPlaceholder")} autoComplete="off" enterKeyHint="search" className="t-body h-12 w-full rounded-btn border border-line bg-canvas pl-12 pr-4 text-ink placeholder:text-ink-soft focus-visible:border-brand" />
        </div>
        <Button type="submit" className="shrink-0 max-sm:px-4"><Search size={18} strokeWidth={1.75} className="sm:hidden" aria-hidden="true" /><span className="max-sm:sr-only">{t("v3.searchSubmit")}</span></Button>
      </form>
      {styles.length > 1 && <div className="space-y-2"><p className="t-small text-ink-soft" id="filter-style">{t("v3.stylesLabel")}</p><nav aria-labelledby="filter-style" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="chip-row flex gap-2 sm:flex-wrap">
        {styles.map(({ value, count }) => <Chip key={value.slug} label={t(`v3.styles.${value.key}`)} count={count} current={style?.slug === value.slug} href={{ pathname: "/paquetes", query: query({ ...active, estilo: style?.slug === value.slug ? undefined : value.slug }) }} />)}
      </ul></nav></div>}
      {regions.length > 1 && <div className="space-y-2"><p className="t-small text-ink-soft" id="filter-region">{t("v3.regionLabel")}</p><nav aria-labelledby="filter-region" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="chip-row flex gap-2 sm:flex-wrap">
        <Chip label={t("ux.filterAll")} count={items.length} current={!region} href={{ pathname: "/paquetes", query: query({ ...active, region: undefined }) }} />
        {regions.map(value => <Chip key={value} label={value} count={regionCounts.get(value)} current={value === region} href={{ pathname: "/paquetes", query: query({ ...active, region: value }) }} />)}
      </ul></nav></div>}
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="t-small text-ink-soft" aria-live="polite">{search && <span className="text-ink">{t("v3.resultsFor", { query: search })} · </span>}{t("ux.packageCount", { count: visible.length })}</p>
      {filtered && <Link href="/paquetes" scroll={false} className="t-small inline-flex min-h-11 items-center gap-1 font-semibold text-brand underline underline-offset-4"><X size={16} strokeWidth={1.75} aria-hidden="true" />{t("v3.clearFilters")}</Link>}
    </div>
    {visible.length ? <>
      <PackageGrid items={visible} label={t("static.packagesAvailable")} layout="grid" preloadCount={2} />
      <CatalogueNote title={t("v3.catalogueNoteTitle")} body={t("v3.catalogueNoteBody")} cta={t("v3.catalogueNoteCta")} />
    </> : <div role="status" className="space-y-6 rounded-panel border border-line bg-surface p-6 text-center sm:p-12">
      <span className="mx-auto flex size-14 items-center justify-center rounded-btn bg-brand-tint text-brand"><Compass size={28} strokeWidth={1.75} aria-hidden="true" /></span>
      <div className="mx-auto max-w-xl space-y-3"><h3 className="t-h3">{t("v3.emptyTitle")}</h3><p className="t-body text-ink-soft">{t("v3.emptyBody")}</p></div>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild><Link href="/viaje-a-medida">{t("v3.emptyCta")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
        <Button asChild variant="ghost"><Link href="/paquetes" scroll={false}>{t("ux.allPackages")}</Link></Button>
      </div>
    </div>}
  </div>;
}

// After the grid: the catalogue is a set of ideas, not the limit of what an advisor can quote.
function CatalogueNote({ title, body, cta }: { title: string; body: string; cta: string }) {
  return <div className="flex flex-col gap-6 rounded-panel border border-line bg-brand-tint p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
    <div className="flex gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-btn bg-canvas text-brand"><Compass size={24} strokeWidth={1.75} aria-hidden="true" /></span><div className="space-y-1"><h3 className="t-h3">{title}</h3><p className="t-body measure text-ink-soft">{body}</p></div></div>
    <Button asChild className="shrink-0"><Link href="/viaje-a-medida">{cta}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
  </div>;
}

export default async function Page({ searchParams }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const { region, estilo, q } = await searchParams;
  const filters = { region: typeof region === "string" ? region : undefined, estilo: typeof estilo === "string" ? estilo : undefined, q: typeof q === "string" ? q : undefined };
  return <main>
    <div className="container-site">
      <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("packages"), href: "/paquetes" }]} title={common("packages")} intro={t("packagesIntro")} />
      <section aria-label={t("packagesAvailable")}><h2 className="sr-only">{t("packagesAvailable")}</h2><Suspense fallback={<PackageSkeletons layout="grid" count={6} />}><Packages filters={filters} /></Suspense></section>
    </div>
    <FinalCta />
  </main>;
}
