import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesPath = resolve(root, 'data/packages.json');
const updatesPath = resolve(root, 'data/packages-incluye-v2.json');

const packages = JSON.parse(await readFile(packagesPath, 'utf8'));
const updates = JSON.parse(await readFile(updatesPath, 'utf8'));
const packagesBySlug = new Map(packages.map((pkg) => [pkg.slug, pkg]));
let mergedCount = 0;

for (const update of updates) {
  const pkg = packagesBySlug.get(update.slug);
  if (!pkg) throw new Error(`No package found for slug: ${update.slug}`);
  pkg.incluye = update.incluye;
  mergedCount += 1;
}

await writeFile(packagesPath, `${JSON.stringify(packages, null, 2)}\n`, 'utf8');
console.log(`Merged ${mergedCount} package inclusions.`);
