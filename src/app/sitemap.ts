import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blog";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { mainLinks, serviceLinks, legalLinks } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, packages, posts] = await Promise.all([getDestinations(), getPackages(), getBlogPosts()]);
  const routes = new Set([...mainLinks, ...serviceLinks, ...legalLinks].map(link => link.href));
  return [
    ...Array.from(routes, route => ({ url: `${siteConfig.url}${route}` })),
    ...destinations.map(item => ({ url: `${siteConfig.url}/destinos/${item.slug}` })),
    ...posts.map(item => ({ url: `${siteConfig.url}/blog/${item.slug}`, lastModified: item.updated_at })),
    ...packages.map(item => ({ url: `${siteConfig.url}/paquetes/${item.slug}` })),
  ];
}
