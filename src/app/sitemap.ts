import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blog";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { mainLinks, serviceLinks } from "@/lib/navigation";
import { localizedPath, type Locale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/seo";
import { CITY_SEO_PAGES } from "@/lib/city-seo";
export const dynamic = "force-dynamic";
const staticPaths = [...mainLinks.map(link => link.href), ...serviceLinks.map(link => link.href), "/preguntas-frecuentes", "/requisitos", "/opiniones/nueva"];
function localizedEntries(path: string, lastModified?: string | Date): MetadataRoute.Sitemap { return (["es", "en"] as Locale[]).map(locale => ({ url: absoluteUrl(localizedPath(path, locale)), ...(lastModified ? { lastModified } : {}) })); }
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const [destinations, packages, posts] = await Promise.all([getDestinations(), getPackages(), getBlogPosts()]); const publishedCityPaths = CITY_SEO_PAGES.filter(city => city.published).map(city => `/agencia-de-viajes/${city.slug}`); return [...[...new Set(staticPaths)].flatMap(path => localizedEntries(path)), ...destinations.flatMap(item => localizedEntries(`/destinos/${item.slug}`)), ...packages.flatMap(item => localizedEntries(`/paquetes/${item.slug}`)), ...posts.flatMap(item => localizedEntries(`/blog/${item.slug}`, item.updated_at || item.publicado_en || undefined)), ...publishedCityPaths.flatMap(path => localizedEntries(path))]; }
