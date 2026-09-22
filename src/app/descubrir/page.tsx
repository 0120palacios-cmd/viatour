import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localizedPageMetadata } from "@/lib/seo";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { DiscoveryAssistant } from "@/components/discovery/assistant";
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/descubrir", "discover"); }
export default async function DiscoverPage() { const t = await getTranslations("static"); const discover = await getTranslations("discover"); const [destinations, packages] = await Promise.all([getDestinations(), getPackages()]); return <main className="container-site py-14 sm:py-24"><header className="mb-12 max-w-3xl space-y-4"><p className="t-small text-brand">{t("discoverEyebrow")}</p><h1 className="t-h1">{discover("title")}</h1><p className="t-body-lg text-ink-soft">{discover("intro")}</p></header><DiscoveryAssistant destinations={destinations.map(item => ({ id: item.id, slug: item.slug, nombre: item.nombre }))} packages={packages} /></main>; }
