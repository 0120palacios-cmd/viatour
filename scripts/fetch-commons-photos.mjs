// Downloads the photos listed in a manifest (default data/panama-photos.json) from Wikimedia Commons,
// checks each file and its license, crops and compresses it with sharp, saves it under public/ and writes
// the credits (author, license, source, date) next to the manifest. Never touches the database.
// Only licenses that allow commercial use are accepted; anything else stops the script.
// Usage: node scripts/fetch-commons-photos.mjs [data/panama-photos.json] [--only=<path prefix>]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = path.resolve(root, process.argv.slice(2).find(arg => !arg.startsWith("--")) ?? "data/panama-photos.json");
const only = process.argv.find(arg => arg.startsWith("--only="))?.slice(7);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const creditsPath = manifestPath.replace(/photos\.json$/, "photo-credits.json");
const headers = { "User-Agent": "viatour-photo-import/1.0 (soporte@miviatour.com)" };
const allowed = /^(CC BY(-SA)? [1-4]\.[0-9]|CC0|Public domain)$/;
const strip = value => String(value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

let previous = {};
try { previous = Object.fromEntries(JSON.parse(readFileSync(creditsPath, "utf8")).map(credit => [credit.archivo, credit])); } catch { previous = {}; }
const credits = { ...previous };

for (const photo of manifest.photos) {
  if (only && !photo.archivo.startsWith(only)) continue;
  const [width, height] = manifest.sizes[photo.tipo];
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", titles: photo.commons, prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: String(Math.max(width, 2400)) }).forEach(([key, value]) => url.searchParams.set(key, value));
  const page = Object.values((await (await fetch(url, { headers })).json()).query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) throw new Error(`No existe en Commons: ${photo.commons}`);
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  if (!allowed.test(license) || meta.NonFree?.value === "true") throw new Error(`Licencia no permitida (${license}): ${photo.commons}`);
  if (!/^image\/(jpeg|png|webp)$/.test(info.mime)) throw new Error(`Formato no admitido (${info.mime}): ${photo.commons}`);
  const source = info.width > Math.max(width, 2400) ? info.thumburl : info.url;
  const response = await fetch(source, { headers });
  if (!response.ok) throw new Error(`Descarga fallida (${response.status}): ${photo.commons}`);
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Archivo de imagen inválido: ${photo.commons}`);
  const target = path.join(root, "public", photo.archivo);
  mkdirSync(path.dirname(target), { recursive: true });
  await sharp(input).rotate().resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(target);
  credits[photo.archivo] = {
    archivo: photo.archivo, alt: photo.alt, autor: strip(meta.Artist?.value) || "Autor no indicado", licencia: license,
    licencia_url: meta.LicenseUrl?.value ?? null, fuente: info.descriptionurl, fecha: strip(meta.DateTimeOriginal?.value).slice(0, 40) || null,
    original: `${info.width}x${info.height}`,
  };
  console.log(`${photo.archivo}  ${license}  ${credits[photo.archivo].autor}`);
}

// Keep only the files the manifest still lists, in manifest order.
const ordered = manifest.photos.map(photo => credits[photo.archivo]).filter(Boolean);
writeFileSync(creditsPath, JSON.stringify(ordered, null, 2) + "\n");
console.log(`Créditos: ${path.relative(root, creditsPath)} (${ordered.length})`);
