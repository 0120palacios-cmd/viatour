import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blog";
import { blogCoverUrl } from "@/lib/blog-utils";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { mainLinks, serviceLinks } from "@/lib/navigation";
import { localizedPath, type Locale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/seo";
import { CITY_SEO_PAGES } from "@/lib/city-seo";
export const dynamic = "force-dynamic";
const staticPaths = [...mainLinks.map(link => link.href), ...serviceLinks.map(link => link.href), "/preguntas-frecuentes", "/requisitos", "/opiniones/nueva"];
function localizedEntries(path: string, lastModified?: string | Date): MetadataRoute.Sitemap { return (["es", "en"] as Locale[]).map(locale => ({ url: absoluteUrl(localizedPath(path, locale)), ...(lastModified ? { lastModified } : {}) })); }
// Image entries let search engines index the real photos with the page they belong to.
function imageUrls(...sources: (string | null | undefined)[]) { return [...new Set(sources.filter((source): source is string => typeof source === "string" && source.trim().length > 0).map(source => absoluteUrl(source)))]; }
// Database content is Spanish-only; its English URLs canonicalise to Spanish (see localizedContentMetadata).
function spanishEntry(path: string, lastModified?: string | Date, images: string[] = []): MetadataRoute.Sitemap[number] { return { url: absoluteUrl(localizedPath(path, "es")), ...(lastModified ? { lastModified } : {}), ...(images.length ? { images } : {}) }; }
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A content table that fails to load shortens the sitemap instead of failing it.
  const [destinations, packages, posts] = await Promise.all([getDestinations().catch(() => []), getPackages().catch(() => []), getBlogPosts().catch(() => [])]);
  const publishedCityPaths = CITY_SEO_PAGES.filter(city => city.published).map(city => `/agencia-de-viajes/${city.slug}`);
  return [
    ...[...new Set(staticPaths)].flatMap(path => localizedEntries(path)),
    ...destinations.map(item => spanishEntry(`/destinos/${item.slug}`, undefined, imageUrls(item.imagen_url))),
    ...packages.map(item => spanishEntry(`/paquetes/${item.slug}`, item.updated_at || undefined, imageUrls(item.imagen_url, ...(Array.isArray(item.galeria) ? item.galeria : [])))),
    ...posts.map(item => spanishEntry(`/blog/${item.slug}`, item.updated_at || item.publicado_en || undefined, imageUrls(blogCoverUrl(item.cover_url)))),
    ...publishedCityPaths.flatMap(path => localizedEntries(path)),
  ];
}
