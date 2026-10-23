// Re-checks every licensed photo Mi viaje shows against Wikimedia Commons (read-only, no downloads):
// the file still exists, its license allows commercial use and is not flagged non-free, and the stored
// credit (author, license, source page) matches. Also checks the local file and that every photo the
// destination guides use has a credit record. Usage: node scripts/verify-photo-licenses.mjs
import fs from 'node:fs';

const headers = { 'User-Agent': 'viatour-photo-audit/1.0 (soporte@miviatour.com)' };
const allowed = /^(CC BY(-SA)? [1-4]\.[0-9]|CC0|Public domain)$/;
const strip = value => String(value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const manifest = JSON.parse(fs.readFileSync('data/trip-photos.json', 'utf8')).photos;
const credits = [...JSON.parse(fs.readFileSync('data/trip-photo-credits.json', 'utf8')), ...JSON.parse(fs.readFileSync('data/panama-photo-credits.json', 'utf8'))];
const byFile = new Map(credits.map(credit => [credit.archivo, credit]));
const problems = [];

for (const photo of manifest) {
  const credit = byFile.get(photo.archivo);
  if (!fs.existsSync(`public${photo.archivo}`)) problems.push(`${photo.archivo}: local file missing`);
  if (!credit) { problems.push(`${photo.archivo}: no credit record`); continue; }
  for (const field of ['autor', 'licencia', 'fuente']) if (!credit[field]) problems.push(`${photo.archivo}: credit without ${field}`);
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', format: 'json', titles: photo.commons, prop: 'imageinfo', iiprop: 'extmetadata|url' }).forEach(([k, v]) => url.searchParams.set(k, v));
  let info;
  for (let attempt = 0; attempt < 4 && !info; attempt++) {
    try { info = Object.values((await (await fetch(url, { headers })).json()).query.pages)[0].imageinfo?.[0]; } catch { await new Promise(resolve => setTimeout(resolve, 3000)); }
  }
  if (!info) { problems.push(`${photo.archivo}: not found on Commons (${photo.commons})`); continue; }
  const meta = info.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  if (!allowed.test(license) || meta.NonFree?.value === 'true') problems.push(`${photo.archivo}: license now ${license}`);
  if (license !== credit.licencia) problems.push(`${photo.archivo}: credit says ${credit.licencia}, Commons says ${license}`);
  if (info.descriptionurl !== credit.fuente) problems.push(`${photo.archivo}: source ${credit.fuente} != ${info.descriptionurl}`);
  if ((strip(meta.Artist?.value) || 'Autor no indicado') !== credit.autor) problems.push(`${photo.archivo}: author "${credit.autor}" != "${strip(meta.Artist?.value)}"`);
  console.log(`ok  ${photo.archivo}  ${license}  ${credit.autor}`);
  await new Promise(resolve => setTimeout(resolve, 400));
}

// Every photo a destination guide shows needs a credit (this covers the reused Panamá photos).
const guides = fs.readFileSync('src/lib/destination-guides.ts', 'utf8');
for (const [, image] of guides.matchAll(/image: "(\/[^"]+\.jpg)"/g)) if (!byFile.has(image)) problems.push(`${image}: used by a guide without a credit`);

console.log(`\n${manifest.length} manifest photos checked; ${problems.length} problems`);
for (const problem of problems) console.log(`PROBLEM ${problem}`);
process.exitCode = problems.length ? 1 : 0;
