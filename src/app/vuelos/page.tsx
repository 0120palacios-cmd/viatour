import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { ServicePage } from "@/components/services/service-page";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/vuelos", "flights"); }
export default function Page() { return <ServicePage path="/vuelos" breadcrumbKey="flights" titleKey="flightsTitle" introKey="flightsIntro" defaultTab="vuelos" helpKeys={["flightsHelp1", "flightsHelp2", "flightsHelp3"]} />; }
