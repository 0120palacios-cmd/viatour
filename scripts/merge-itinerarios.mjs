import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesPath = resolve(root, 'data/packages.json');
const updatesPath = resolve(root, 'data/itinerarios-batch2.json');

const packages = JSON.parse(await readFile(packagesPath, 'utf8'));
const updates = JSON.parse(await readFile(updatesPath, 'utf8'));

if (!Array.isArray(packages) || !Array.isArray(updates)) {
  throw new Error('Both package files must contain JSON arrays.');
}

const packagesBySlug = new Map(packages.map((pkg) => [pkg.slug, pkg]));
const seenSlugs = new Set();
for (const update of updates) {
  if (!update || typeof update.slug !== 'string' || typeof update.itinerario !== 'string') {
    throw new Error('Each itinerary update must contain a slug and itinerario string.');
  }
  if (seenSlugs.has(update.slug)) throw new Error(`Duplicate itinerary slug: ${update.slug}`);
  seenSlugs.add(update.slug);
  if (!packagesBySlug.has(update.slug)) throw new Error(`No package found for slug: ${update.slug}`);
}

for (const update of updates) {
  packagesBySlug.get(update.slug).itinerario = update.itinerario;
}

await writeFile(packagesPath, `${JSON.stringify(packages, null, 2)}\n`, 'utf8');
console.log(`Merged ${updates.length} itineraries.`);
