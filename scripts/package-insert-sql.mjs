// Prints reviewed-SQL that inserts the given packages from data/packages.json, for running manually in
// Supabase (see docs/sql/). Unlike scripts/import-packages.mjs it never connects to the database, never
// updates or unpublishes existing rows, and skips any slug that already exists.
// Usage: node scripts/package-insert-sql.mjs --destination=<destination slug> <slug> [<slug> ...] > docs/sql/<name>.sql
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packages = JSON.parse(readFileSync(new URL("../data/packages.json", import.meta.url), "utf8"));
const publicPath = fileURLToPath(new URL("../public", import.meta.url));
const args = process.argv.slice(2);
const destination = args.find(arg => arg.startsWith("--destination="))?.slice(14) ?? "";
const slugs = args.filter(arg => !arg.startsWith("--"));
if (!slugs.length || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destination)) throw new Error("Indique --destination=<slug> y al menos un paquete.");

// Same image detection as scripts/import-packages.mjs.
function gallery(slug) {
  const dir = path.join(publicPath, "paquetes", slug);
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isFile() && /\.(?:jpg|webp|png)$/i.test(entry.name)).map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })).map(file => `/paquetes/${slug}/${file}`)
    : [];
}

const columns = ["slug", "nombre", "destino", "resumen", "descripcion", "incluye", "no_incluye", "itinerario", "duracion", "imagen_url", "galeria", "destacado", "publicado", "orden", "categoria", "etiquetas", "precio_desde", "moneda", "ficha"];
const rows = slugs.map(slug => {
  const item = packages.find(value => value.slug === slug);
  if (!item) throw new Error(`No existe en data/packages.json: ${slug}`);
  const images = gallery(slug);
  if (!images.length) throw new Error(`Sin fotografías en public/paquetes/${slug}`);
  const row = { ...item, galeria: images, imagen_url: item.imagen_url ?? images[0], no_incluye: item.no_incluye ?? [], etiquetas: item.etiquetas ?? [], precio_desde: null, moneda: null, publicado: false };
  const json = JSON.stringify(Object.fromEntries(columns.map(key => [key, row[key] ?? null])), null, 2);
  if (json.includes("$pkg$")) throw new Error("El contenido no puede incluir $pkg$.");
  return { slug, json };
});

const list = columns.join(", ");
console.log(`-- Generado con: node scripts/package-insert-sql.mjs --destination=${destination} ${slugs.join(" ")}
-- No editar a mano: cambie data/packages.json y vuelva a generarlo.
--
-- Inserta los paquetes SIN publicar (publicado = false). Si un slug ya existe, no lo toca.
-- Requiere docs/sql/packages_ficha.sql (columna ficha).

begin;
`);
for (const { slug, json } of rows) {
  console.log(`-- ${slug}
insert into public.packages (${list}, destination_id)
select ${columns.map(key => `r.${key}`).join(", ")}, (select id from public.destinations where slug = '${destination}')
from jsonb_populate_record(null::public.packages, $pkg$${json}$pkg$::jsonb) as r
on conflict (slug) do nothing;
`);
}
console.log(`commit;

-- Verificación (solo lectura):
-- select slug, publicado, destacado, orden, destination_id is not null as con_destino,
--        jsonb_typeof(ficha) as ficha, galeria is not null as con_fotos
-- from public.packages where slug in (${slugs.map(slug => `'${slug}'`).join(", ")}) order by orden;`);
