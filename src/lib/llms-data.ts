import "server-only";
import { getBlogPosts } from "@/lib/blog";
import { CITY_SEO_PAGES } from "@/lib/city-seo";
import { getDestinations } from "@/lib/destinations";
import { getFAQs } from "@/lib/faqs";
import { getPackages } from "@/lib/packages";
import { getReviewSummary } from "@/lib/reviews";
import { siteConfig } from "@/lib/site-config";
import type { LlmsContent } from "@/lib/llms";

// Each source fails on its own: a slow table shortens the file instead of breaking it.
async function settle<T>(promise: Promise<T>, fallback: T) { try { return await promise; } catch { return fallback; } }

export async function loadLlmsContent(): Promise<LlmsContent> {
  const [packages, destinations, posts, faqs, reviews] = await Promise.all([
    settle(getPackages(), []),
    settle(getDestinations(), []),
    settle(getBlogPosts(), []),
    settle(getFAQs(), []),
    settle(getReviewSummary(), null),
  ]);
  return { siteUrl: siteConfig.url, whatsappNumber: siteConfig.whatsappNumber, supportEmail: siteConfig.supportEmail, packages, destinations, posts, faqs, reviews, cities: CITY_SEO_PAGES.filter(city => city.published).map(city => city.name) };
}

export function llmsResponse(body: string) {
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400", "X-Robots-Tag": "noindex" } });
}
