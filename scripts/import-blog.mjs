import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { posts } from "../data/blog-posts.mjs";

dotenv.config({ path: [".env.local", ".env"] });

function blogPostRow(post) {
  return {
    slug: post.slug,
    titulo: post.titulo,
    categoria: post.categoria,
    tipo: post.tipo,
    extracto: post.extracto,
    cuerpo: post.cuerpo,
    autor: post.autor,
    meta_titulo: post.meta_titulo,
    meta_descripcion: post.meta_descripcion,
    destacado: post.destacado,
    publicado: post.publicado,
    orden: post.orden,
    cover_url: post.cover_url ?? null,
    publicado_en: post.publicado_en ?? new Date().toISOString().slice(0, 10),
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY localmente.");
  }
  if (!Array.isArray(posts) || posts.length === 0) {
    throw new Error("data/blog-posts.mjs debe exportar al menos una publicación.");
  }

  const rows = posts.map(blogPostRow);
  const slugs = rows.map((post) => post.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("Hay slugs duplicados en data/blog-posts.mjs.");
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: existing, error: selectError } = await client
    .from("blog_posts")
    .select("slug")
    .in("slug", slugs);
  if (selectError) {
    throw new Error(`No se pudieron consultar las publicaciones existentes: ${selectError.message}`);
  }

  const existingSlugs = new Set((existing ?? []).map((post) => post.slug));
  const { error: upsertError } = await client
    .from("blog_posts")
    .upsert(rows, { onConflict: "slug" });
  if (upsertError) {
    throw new Error(`No se pudieron importar las publicaciones: ${upsertError.message}`);
  }

  const inserted = rows.filter((post) => !existingSlugs.has(post.slug)).length;
  const updated = rows.length - inserted;
  console.log(`Publicaciones importadas: ${inserted} insertadas, ${updated} actualizadas.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar la importación.");
  process.exitCode = 1;
});
