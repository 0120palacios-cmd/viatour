import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { ServicePage } from "@/components/services/service-page";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/hoteles", "hotels"); }
export default function Page() { return <ServicePage path="/hoteles" breadcrumbKey="hotels" titleKey="hotelsTitle" introKey="hotelsIntro" defaultTab="hoteles" helpKeys={["hotelsHelp1", "hotelsHelp2", "hotelsHelp3"]} />; }
