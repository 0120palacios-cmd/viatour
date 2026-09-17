import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
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
export async function getBlogPosts(): Promise<BlogPost[]> { const client = await createClient(); const { data, error } = await client.from("blog_posts").select("*").eq("publicado", true).order("publicado_en", { ascending: false, nullsFirst: false }).order("orden").order("slug").abortSignal(AbortSignal.timeout(8000)); if (error)
    throw Error("No se pudieron cargar las publicaciones."); return data as BlogPost[]; }
export const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => { const client = await createClient(); const { data, error } = await client.from("blog_posts").select("*").eq("publicado", true).eq("slug", slug).abortSignal(AbortSignal.timeout(8000)).maybeSingle(); if (error)
    throw Error("No se pudo cargar la publicación."); return data as BlogPost | null; });
