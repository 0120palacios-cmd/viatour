import type { Metadata } from "next";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { PackageSkeletons } from "@/components/packages/package-skeletons";
import { PackageGrid } from "@/components/packages/package-card";
import { getPackages } from "@/lib/packages";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/paquetes", "packages"); }
async function Packages() { return <PackageGrid items={await getPackages()} />; }
export default function Page() { const t = useTranslations("static"); const common = useTranslations("common"); return <main className="container-site space-y-12 py-14 sm:py-24"><header className="space-y-4"><h1 className="t-h1">{common("packages")}</h1><p className="t-body-lg measure text-ink-soft">{t("packagesIntro")}</p></header><section aria-label={t("packagesAvailable")}><h2 className="sr-only">{t("packagesAvailable")}</h2><Suspense fallback={<PackageSkeletons />}><Packages /></Suspense></section></main>; }
