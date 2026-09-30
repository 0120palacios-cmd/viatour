import { getBlogPosts, type BlogPost } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function rfc822(value: string | null | undefined) {
  const date = value ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toUTCString() : null;
}

function item(post: BlogPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const date = rfc822(post.publicado_en || post.updated_at);
  return [
    "<item>",
    `<title>${xml(post.titulo)}</title>`,
    `<link>${xml(url)}</link>`,
    `<guid isPermaLink="true">${xml(url)}</guid>`,
    `<description>${xml(post.extracto)}</description>`,
    post.categoria ? `<category>${xml(post.categoria)}</category>` : "",
    date ? `<pubDate>${date}</pubDate>` : "",
    "</item>",
  ].filter(Boolean).join("");
}

// Guides feed for readers, aggregators and AI systems that follow RSS.
export async function GET() {
  let posts: BlogPost[] = [];
  try { posts = await getBlogPosts(); } catch { posts = []; }
  const updated = rfc822(posts.map(post => post.updated_at).filter(Boolean).sort().at(-1)) || new Date().toUTCString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>viatour | Guías de viaje desde Honduras</title>
<link>${xml(absoluteUrl("/blog"))}</link>
<atom:link href="${xml(absoluteUrl("/blog/rss.xml"))}" rel="self" type="application/rss+xml" />
<description>Guías y artículos de viatour para planificar viajes al exterior desde Honduras.</description>
<language>es-HN</language>
<lastBuildDate>${updated}</lastBuildDate>
${posts.map(item).join("\n")}
</channel></rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
