import type { Metadata } from "next";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { DestinationGrid, DestinationSkeletons } from "@/components/destinations/destination-card";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/components/home/sections";
import { getDestinations } from "@/lib/destinations";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/destinos", "destinations"); }
async function Destinations() { return <DestinationGrid items={await getDestinations()} />; }
export default function Page() { const t = useTranslations("static"); const common = useTranslations("common"); return <main><div className="container-site"><PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("destinations"), href: "/destinos" }]} title={common("destinations")} intro={t("destinationsIntro")} /><section aria-labelledby="available-destinations"><h2 id="available-destinations" className="sr-only">{t("destinationsAvailable")}</h2><Suspense fallback={<DestinationSkeletons />}><Destinations /></Suspense></section></div><FinalCta /></main>; }
