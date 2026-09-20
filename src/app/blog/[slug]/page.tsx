import { pageMetadata, detailDescription } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/blog";
import { blogCoverUrl, blogDate } from "@/lib/blog-utils";
import { Markdown } from "@/components/blog/markdown";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { siteConfig } from "@/lib/site-config";
type Props = {
    params: Promise<{
        slug: string;
    }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> { const post = await getBlogPost((await params).slug); if (!post) notFound(); return pageMetadata(`/blog/${post.slug}`, post.meta_titulo?.trim() || `viatour | ${post.titulo} desde Honduras`, detailDescription(post.titulo, post.meta_descripcion || post.extracto), blogCoverUrl(post.cover_url), true); }
export default async function Page({ params }: Props) { const post = await getBlogPost((await params).slug); if (!post)
    notFound(); const cover = blogCoverUrl(post.cover_url); const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "BlogPosting", headline: post.titulo, description: post.extracto, url: siteConfig.url + "/blog/" + post.slug, mainEntityOfPage: siteConfig.url + "/blog/" + post.slug, dateModified: post.updated_at, ...(post.publicado_en ? { datePublished: post.publicado_en } : {}), ...(post.autor ? { author: { "@type": "Person", name: post.autor } } : {}), ...(cover ? { image: cover } : {}) }, { "@type": "BreadcrumbList", itemListElement: [["Inicio", ""], ["Blog", "/blog"], [post.titulo, "/blog/" + post.slug]].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: siteConfig.url + path })) }] }; return <main className="container-site py-14 sm:py-24"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/><article className="mx-auto max-w-[68ch]"><Link className="text-brand underline" href="/blog">Volver al blog</Link><header className="my-8"><h1 className="t-h1">{post.titulo}</h1><div className="mt-4 flex flex-wrap gap-4 t-small text-ink-soft"><span>{post.categoria}</span>{post.publicado_en && <time dateTime={post.publicado_en}>{blogDate(post.publicado_en)}</time>}{post.autor && <span>{post.autor}</span>}</div></header>{cover && <div className="relative mb-8 aspect-video overflow-hidden rounded-card"><Image fill preload unoptimized={false} sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc(100vw - 48px), 680px" src={cover} alt={"Portada de " + post.titulo} className="object-cover"/></div>}<Markdown>{post.cuerpo}</Markdown><section className="mt-12 space-y-6 rounded-panel border bg-surface p-6"><h2 className="t-h2">Planifiquemos su viaje</h2><WhatsAppLink /></section></article></main>; }
