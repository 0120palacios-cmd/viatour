import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const destinationsPath = new URL("../data/destinations.json", import.meta.url);

function loadDestinations() {
  const value = JSON.parse(readFileSync(destinationsPath, "utf8"));
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("data/destinations.json debe contener al menos un destino.");
  }

  const slugs = new Set();
  for (const item of value) {
    if (!item || typeof item.slug !== "string" || !item.slug.trim()) {
      throw new Error("Cada destino debe tener un slug válido.");
    }
    if (slugs.has(item.slug)) {
      throw new Error(`Slug duplicado en data/destinations.json: ${item.slug}`);
    }
    if (item.faqs !== null && item.faqs !== undefined && !Array.isArray(item.faqs)) {
      throw new Error(`faqs debe ser un arreglo o null: ${item.slug}`);
    }
    slugs.add(item.slug);
  }

  return value;
}

function destinationRow(item) {
  return {
    slug: item.slug,
    nombre: item.nombre,
    titulo_seo: item.titulo_seo ?? null,
    meta_descripcion: item.meta_descripcion ?? null,
    intro: item.intro ?? null,
    cuerpo: item.cuerpo ?? null,
    mejor_epoca: item.mejor_epoca ?? null,
    faqs: item.faqs ?? null,
    imagen_url: item.imagen_url ?? null,
    destacado: item.destacado === true,
    publicado: item.publicado === true,
    orden: item.orden,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY localmente.");
  }

  const destinations = loadDestinations();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: before, error: beforeError } = await client.from("destinations").select("slug,cuerpo");
  if (beforeError) throw new Error(`No se pudieron consultar los destinos existentes: ${beforeError.message}`);

  const existingBySlug = new Map((before ?? []).map((row) => [row.slug, row]));
  let inserted = 0;
  let updated = 0;

  for (const item of destinations) {
    const row = destinationRow(item);
    const existing = existingBySlug.get(item.slug);

    // A null body in the seed must not erase editorial content already in the database.
    if (existing && row.cuerpo === null && existing.cuerpo !== null) {
      const rowWithoutBody = { ...row };
      delete rowWithoutBody.cuerpo;
      const { error } = await client.from("destinations").update(rowWithoutBody).eq("slug", item.slug);
      if (error) throw new Error(`No se pudo actualizar el destino ${item.slug}: ${error.message}`);
    } else {
      const { error } = await client.from("destinations").upsert([row], { onConflict: "slug" });
      if (error) throw new Error(`No se pudo importar el destino ${item.slug}: ${error.message}`);
    }

    if (existing) updated += 1;
    else inserted += 1;
  }

  const importedSlugs = new Set(destinations.map((item) => item.slug));
  const { data: allDestinations, error: allError } = await client.from("destinations").select("slug");
  if (allError) throw new Error(`No se pudieron revisar los destinos heredados: ${allError.message}`);

  const legacySlugs = (allDestinations ?? [])
    .map((row) => row.slug)
    .filter((slug) => !importedSlugs.has(slug));

  if (legacySlugs.length > 0) {
    const { error: purgeError } = await client
      .from("destinations")
      .update({ publicado: false })
      .in("slug", legacySlugs);
    if (purgeError) throw new Error(`No se pudieron despublicar los destinos heredados: ${purgeError.message}`);
  }

  console.log(`Destinos importados: ${inserted} insertados, ${updated} actualizados.`);
  console.log(`Destinos despublicados: ${legacySlugs.length ? legacySlugs.join(", ") : "ninguno"}.`);
  for (const slug of legacySlugs) console.log(`  - ${slug}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar la importación.");
  process.exitCode = 1;
});
