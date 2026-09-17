import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/lib/blog";
import { blogCoverUrl, blogDate } from "@/lib/blog-utils";
export function BlogCard({ post }: {
    post: BlogPost;
}) { const cover = blogCoverUrl(post.cover_url); return <article className="overflow-hidden rounded-card border bg-canvas shadow-sm"><div className="relative aspect-[3/2] bg-brand-tint">{cover && <Image fill unoptimized={false} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" src={cover} alt={"Portada de " + post.titulo} className="object-cover"/>}</div><div className="space-y-4 p-6"><p className="t-small text-brand">{post.categoria} · {post.tipo === "guia" ? "Guía" : "Artículo"}</p><h3 className="t-h3">{post.titulo}</h3><p className="text-ink-soft">{post.extracto}</p>{post.publicado_en && <time className="block t-small text-ink-soft" dateTime={post.publicado_en}>{blogDate(post.publicado_en)}</time>}<Link className="inline-block text-brand underline" href={"/blog/" + post.slug} aria-label={"Leer más: " + post.titulo}>Leer más</Link></div></article>; }
