import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { ServicePage } from "@/components/services/service-page";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/viaje-a-medida", "customTrip"); }
export default function Page() { return <ServicePage path="/viaje-a-medida" breadcrumbKey="customTrip" titleKey="customTitle" introKey="customIntro" defaultTab="medida" helpKeys={["customHelp1", "customHelp2", "customHelp3"]} />; }
