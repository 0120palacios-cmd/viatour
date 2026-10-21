// Writes the three Panama packages from data/panama-packages.mjs into data/packages.json (replacing those
// slugs in place, keeping every other package untouched). Photo paths become { archivo, alt } using
// data/panama-photo-credits.json, every photo a package shows gets its credit, and the plain-text
// itinerario column is built from the structured days. Never connects to the database.
// Usage: node scripts/merge-panama-packages.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import panama from "../data/panama-packages.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const packagesPath = `${root}data/packages.json`;
const credits = new Map(JSON.parse(readFileSync(`${root}data/panama-photo-credits.json`, "utf8")).map(credit => [credit.archivo, credit]));

function packagePhotos(slug) {
  const dir = `${root}public/paquetes/${slug}`;
  return existsSync(dir) ? readdirSync(dir).filter(file => /\.(?:jpg|webp|png)$/i.test(file)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(file => `/paquetes/${slug}/${file}`) : [];
}

function build(item) {
  const used = new Set(packagePhotos(item.slug));
  if (!used.size) throw new Error(`Sin fotografías en public/paquetes/${item.slug}`);
  const ref = archivo => {
    if (archivo == null) return null;
    const credit = credits.get(archivo);
    if (!credit) throw new Error(`${item.slug}: ${archivo} no tiene crédito en data/panama-photo-credits.json`);
    if (!existsSync(`${root}public${archivo}`)) throw new Error(`${item.slug}: no existe public${archivo}`);
    used.add(archivo);
    return { archivo, alt: credit.alt };
  };
  const ficha = structuredClone(item.ficha);
  for (const option of ficha.opciones ?? []) option.foto = ref(option.foto);
  for (const stay of ficha.estancias ?? []) {
    stay.portada = ref(stay.portada);
    for (const hotel of stay.hoteles) hotel.fotos = hotel.fotos.map(ref);
  }
  for (const experience of ficha.experiencias ?? []) experience.foto = ref(experience.foto);
  ficha.creditos = [...used].map(archivo => {
    const credit = credits.get(archivo);
    if (!credit) throw new Error(`${item.slug}: ${archivo} no tiene crédito`);
    return { archivo, alt: credit.alt, autor: credit.autor, licencia: credit.licencia, licencia_url: credit.licencia_url, fuente: credit.fuente };
  });
  const itinerario = ficha.dias.map((day, index) => `Día ${index + 1} — ${day.titulo}. ${day.descripcion}`).join("\n");
  const fields = Object.fromEntries(Object.entries(item).filter(([key]) => key !== "ficha"));
  // Same key order as the existing entries, with ficha last.
  const row = { ...fields, itinerario, imagen_url: [...packagePhotos(item.slug)][0], ficha };
  const order = ["slug", "nombre", "destino", "categoria", "etiquetas", "resumen", "descripcion", "incluye", "itinerario", "duracion", "imagen_url", "destacado", "publicado", "orden", "no_incluye", "ficha"];
  return Object.fromEntries(order.map(key => [key, row[key]]));
}

const packages = JSON.parse(readFileSync(packagesPath, "utf8"));
const built = panama.map(build);
for (const item of built) {
  const index = packages.findIndex(value => value.slug === item.slug);
  if (index === -1) packages.push(item); else packages[index] = item;
}
const slugs = packages.map(item => item.slug);
if (new Set(slugs).size !== slugs.length) throw new Error("Slug duplicado en data/packages.json");
writeFileSync(packagesPath, JSON.stringify(packages, null, 2).replace(/\n/g, "\r\n") + "\r\n");
for (const item of built) console.log(`${item.slug}: ${item.ficha.creditos.length} fotos con crédito, ${item.ficha.estancias.reduce((sum, stay) => sum + stay.hoteles.length, 0)} hoteles, ${item.ficha.experiencias.length} experiencias`);
