import type { Metadata } from "next";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { collectionSchema, localizedPageMetadata } from "@/lib/seo";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import type { Locale } from "@/i18n/config";
import { DestinationGrid, DestinationSkeletons } from "@/components/destinations/destination-card";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/components/home/sections";
import { getDestinations } from "@/lib/destinations";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/destinos", "destinations"); }
async function Destinations() {
  const [items, common, locale] = await Promise.all([getDestinations(), getTranslations("common"), getLocale()]);
  return <><JsonLd data={collectionSchema("/destinos", common("destinations"), items.map(item => ({ name: item.nombre, path: `/destinos/${item.slug}`, image: item.imagen_url })), locale as Locale)} /><DestinationGrid items={items} /></>;
}
export default function Page() { const t = useTranslations("static"); const common = useTranslations("common"); return <main><div className="container-site"><PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("destinations"), href: "/destinos" }]} title={common("destinations")} intro={t("destinationsIntro")} /><section aria-labelledby="available-destinations"><h2 id="available-destinations" className="sr-only">{t("destinationsAvailable")}</h2><Suspense fallback={<DestinationSkeletons />}><Destinations /></Suspense></section></div><FinalCta /></main>; }
