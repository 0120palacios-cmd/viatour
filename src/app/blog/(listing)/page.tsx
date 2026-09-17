import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/blog/card";
export const metadata = pageMetadata("/blog", "viatour | Blog y guías para planificar viajes desde Honduras", "Blog y guías para planificar viajes desde Honduras con viatour. Consulte la información disponible y cuéntenos qué busca para recibir asesoría sobre su viaje.");
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        categoria?: string;
        tipo?: string;
    }>;
}) {
    const posts = await getBlogPosts();
    const { categoria, tipo } = await searchParams;
    const categories = [...new Set(posts.map(p => p.categoria))].sort();
    const visible = posts.filter(p => (!categoria || p.categoria === categoria) && (!tipo || p.tipo === tipo));
    const href = (c?: string, t?: string) => { const q = new URLSearchParams(); if (c)
        q.set("categoria", c); if (t)
        q.set("tipo", t); return "/blog" + (q.size ? "?" + q : ""); };
    // Copy pendiente de aprobación final
    return <main className="container-site py-14 sm:py-24"><h1 className="t-h1">Blog y guías de viaje</h1><p className="measure t-body-lg mt-4 text-ink-soft">Consulte nuestras publicaciones para planificar su viaje.</p><nav aria-label="Filtrar por categoría" className="my-8 flex flex-wrap gap-4">{["", ...categories].map(c => <Link key={c} href={href(c, tipo)} aria-current={(categoria || "") === c ? "page" : undefined} className="rounded-btn border px-4 py-2 text-brand aria-[current=page]:bg-brand-tint">{c || "Todas las categorías"}</Link>)}</nav><nav aria-label="Filtrar por tipo" className="mb-8 flex flex-wrap gap-4">{[["", "Todas las publicaciones"], ["post", "Artículos"], ["guia", "Guías"]].map(([t, label]) => <Link key={t} href={href(categoria, t)} aria-current={(tipo || "") === t ? "page" : undefined} className="rounded-btn border px-4 py-2 text-brand aria-[current=page]:bg-brand-tint">{label}</Link>)}</nav>{visible.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map(post => <BlogCard key={post.id} post={post}/>)}</div> : <p className="rounded-card border bg-surface p-6">Aún no hay publicaciones.</p>}</main>;
}
