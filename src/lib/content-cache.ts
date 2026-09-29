import "server-only";
import { unstable_cache, updateTag } from "next/cache";

// Public content is cached across requests (tagged) so most page views skip Supabase.
// Admin saves expire the tag immediately; rows written by the data scripts in scripts/
// appear within `revalidate` seconds.
export const contentTags = { packages: "packages", destinations: "destinations", blog_posts: "blog", faqs: "faqs", reviews: "reviews" } as const;
export type ContentTable = keyof typeof contentTags;

export function cachedContent<Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>, key: string, table: ContentTable) {
  return unstable_cache(fn, [`content:${key}`], { tags: [contentTags[table]], revalidate: 300 });
}

// Server Actions only (read-your-own-writes): the next request waits for fresh data.
export function expireContent(table: string) {
  if (table in contentTags) updateTag(contentTags[table as ContentTable]);
}
