import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedContent } from "@/lib/content-cache";
export type BlogPost = {
    id: string;
    slug: string;
    titulo: string;
    categoria: string;
    tipo: string;
    extracto: string;
    cuerpo: string;
    cover_url: string | null;
    autor: string | null;
    meta_titulo: string | null;
    meta_descripcion: string | null;
    publicado_en: string | null;
    updated_at: string;
};
export const getBlogPosts = cachedContent(async (): Promise<BlogPost[]> => { const client = createPublicClient(); const { data, error } = await client.from("blog_posts").select("*").eq("publicado", true).order("publicado_en", { ascending: false, nullsFirst: false }).order("orden").order("slug").abortSignal(AbortSignal.timeout(8000)); if (error)
    throw Error("No se pudieron cargar las publicaciones."); return data as BlogPost[]; }, "blog", "blog_posts");
const readBlogPost = cachedContent(async (slug: string): Promise<BlogPost | null> => { const client = createPublicClient(); const { data, error } = await client.from("blog_posts").select("*").eq("publicado", true).eq("slug", slug).abortSignal(AbortSignal.timeout(8000)).maybeSingle(); if (error)
    throw Error("No se pudo cargar la publicación."); return data as BlogPost | null; }, "blog-post", "blog_posts");
export const getBlogPost = cache((slug: string) => readBlogPost(slug));
