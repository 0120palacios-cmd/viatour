import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { collectionSchema, localizedPageMetadata } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog";
import { blogCoverUrl } from "@/lib/blog-utils";
import { BlogCard } from "@/components/blog/card";
import { PageHeader } from "@/components/layout/page-header";
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/blog", "blog"); }
const chipClass = "t-small flex min-h-11 items-center whitespace-nowrap rounded-btn border px-4 transition-colors duration-(--duration-fast) ease-out";
export default async function Page({ searchParams }: { searchParams: Promise<{ categoria?: string; tipo?: string }> }) {
  const t = await getTranslations("static"); const common = await getTranslations("common");
  const posts = await getBlogPosts(); const { categoria, tipo } = await searchParams;
  const categories = [...new Set(posts.map(p => p.categoria))].sort();
  const visible = posts.filter(p => (!categoria || p.categoria === categoria) && (!tipo || p.tipo === tipo));
  const href = (category?: string, postType?: string) => { const q = new URLSearchParams(); if (category) q.set("categoria", category); if (postType) q.set("tipo", postType); return "/blog" + (q.size ? "?" + q : ""); };
  const chip = (key: string, label: string, target: string, current: boolean) => <li key={key}><Link href={target} scroll={false} aria-current={current ? "page" : undefined} className={`${chipClass} ${current ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line bg-canvas text-ink hover:bg-surface"}`}>{label}</Link></li>;
  const locale = (await getLocale()) as Locale;
  return <main className="container-site pb-12 sm:pb-24">
    <JsonLd data={collectionSchema("/blog", t("guides"), posts.map(post => ({ name: post.titulo, path: `/blog/${post.slug}`, image: blogCoverUrl(post.cover_url) })), locale)} />
    <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("blog"), href: "/blog" }]} title={t("guides")} intro={t("blogIntro")} />
    <div className="mb-8 space-y-3">
      <nav aria-label={t("allPosts")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="chip-row flex gap-2">{[["", t("allPosts")], ["guia", t("guides")], ["post", t("articles")]].map(([postType, label]) => chip(postType || "all", label, href(categoria, postType), (tipo || "") === postType))}</ul></nav>
      {categories.length > 1 && <nav aria-label={t("allCategories")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="chip-row flex gap-2 sm:flex-wrap">{["", ...categories].map(category => chip(category || "all", category || t("allCategories"), href(category, tipo), (categoria || "") === category))}</ul></nav>}
    </div>
    {visible.length ? <section aria-labelledby="blog-post-list"><h2 id="blog-post-list" className="sr-only">{t("allPosts")}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map(post => <BlogCard key={post.id} post={post} />)}</div></section> : <p role="status" className="rounded-panel border border-line bg-surface p-8 text-center text-ink-soft">{t("noPosts")}</p>}
  </main>;
}
