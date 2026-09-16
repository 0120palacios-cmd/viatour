import type { MetadataRoute } from "next";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { mainLinks, serviceLinks, legalLinks } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, packages] = await Promise.all([getDestinations(), getPackages()]);
  const routes = new Set([...mainLinks, ...serviceLinks, ...legalLinks].map(link => link.href));
  return [
    ...Array.from(routes, route => ({ url: `${siteConfig.url}${route}` })),
    ...destinations.map(item => ({ url: `${siteConfig.url}/destinos/${item.slug}` })),
    ...packages.map(item => ({ url: `${siteConfig.url}/paquetes/${item.slug}` })),
  ];
}
