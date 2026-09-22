import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blog";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { mainLinks, serviceLinks } from "@/lib/navigation";
import { localizedPath } from "@/i18n/config";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const [destinations, packages, posts] = await Promise.all([getDestinations(), getPackages(), getBlogPosts()]); const routes = new Set([...mainLinks, ...serviceLinks, { href: "/opiniones/nueva" }, { href: "/requisitos" }].map(link => link.href)); const paths = [...Array.from(routes), ...destinations.map(item => `/destinos/${item.slug}`), ...posts.map(item => `/blog/${item.slug}`), ...packages.map(item => `/paquetes/${item.slug}`)]; return paths.flatMap(path => [{ url: `${siteConfig.url}${localizedPath(path, "es")}` }, { url: `${siteConfig.url}${localizedPath(path, "en")}` }]); }
