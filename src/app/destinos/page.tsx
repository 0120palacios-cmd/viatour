import type { Metadata } from "next";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { DestinationGrid, DestinationSkeletons } from "@/components/destinations/destination-card";
import { getDestinations } from "@/lib/destinations";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/destinos", "destinations"); }
async function Destinations() { return <DestinationGrid items={await getDestinations()} />; }
export default function Page() { const t = useTranslations("static"); const common = useTranslations("common"); return <main className="container-site space-y-12 py-14 sm:py-24"><header className="space-y-4"><h1 className="t-h1">{common("destinations")}</h1><p className="t-body-lg measure text-ink-soft">{t("destinationsIntro")}</p></header><section aria-labelledby="available-destinations"><h2 id="available-destinations" className="sr-only">{t("destinationsAvailable")}</h2><Suspense fallback={<DestinationSkeletons />}><Destinations /></Suspense></section></main>; }
