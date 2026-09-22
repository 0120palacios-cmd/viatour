import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const packagesPath = new URL("../data/packages.json", import.meta.url);

function loadPackages() {
  const value = JSON.parse(readFileSync(packagesPath, "utf8"));
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("data/packages.json debe contener al menos un paquete.");
  }

  const slugs = new Set();
  for (const item of value) {
    if (!item || typeof item.slug !== "string" || !item.slug.trim()) {
      throw new Error("Cada paquete debe tener un slug válido.");
    }
    if (slugs.has(item.slug)) {
      throw new Error(`Slug duplicado en data/packages.json: ${item.slug}`);
    }
    slugs.add(item.slug);
  }

  return value;
}

function packageRow(item) {
  return {
    slug: item.slug,
    nombre: item.nombre,
    destino: item.destino,
    resumen: item.resumen,
    descripcion: item.descripcion,
    incluye: item.incluye,
    no_incluye: Array.isArray(item.no_incluye) ? item.no_incluye : [],
    itinerario: item.itinerario,
    duracion: item.duracion,
    imagen_url: item.imagen_url ?? null,
    destacado: item.destacado === true,
    publicado: item.publicado === true,
    orden: item.orden,
    categoria: item.categoria ?? null,
    etiquetas: item.etiquetas ?? [],
    precio_desde: null,
    moneda: null,
    destination_id: null,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY localmente.");
  }

  const packages = loadPackages();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: before, error: beforeError } = await client.from("packages").select("slug");
  if (beforeError) throw new Error(`No se pudieron consultar los paquetes existentes: ${beforeError.message}`);

  const existingSlugs = new Set((before ?? []).map((row) => row.slug));
  const rows = packages.map(packageRow);
  const { error: upsertError } = await client.from("packages").upsert(rows, { onConflict: "slug" });
  if (upsertError) throw new Error(`No se pudieron importar los paquetes: ${upsertError.message}`);

  const inserted = rows.filter((row) => !existingSlugs.has(row.slug)).length;
  const updated = rows.length - inserted;
  const importedSlugs = new Set(rows.map((row) => row.slug));
  const { data: allPackages, error: allError } = await client.from("packages").select("slug");
  if (allError) throw new Error(`No se pudieron revisar los paquetes heredados: ${allError.message}`);

  const legacySlugs = (allPackages ?? [])
    .map((row) => row.slug)
    .filter((slug) => !importedSlugs.has(slug));
  if (legacySlugs.length > 0) {
    const { error: purgeError } = await client.from("packages").update({ publicado: false }).in("slug", legacySlugs);
    if (purgeError) throw new Error(`No se pudieron despublicar los paquetes heredados: ${purgeError.message}`);
  }

  console.log(`Paquetes importados: ${inserted} insertados, ${updated} actualizados.`);
  console.log(`Paquetes despublicados: ${legacySlugs.length ? legacySlugs.join(", ") : "ninguno"}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar la importación.");
  process.exitCode = 1;
});
