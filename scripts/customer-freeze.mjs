// The approved customer experience (Mi viaje / Mi reserva, its APIs, documents and e-mails) is frozen.
// This computes a fingerprint of every file it depends on: the customer-owned entry points plus all the
// modules they import, transitively, and the translation namespaces they read.
//   node scripts/customer-freeze.mjs            print a summary
//   node scripts/customer-freeze.mjs --update   rewrite tests/fixtures/customer-freeze.json
// tests/customer-freeze.test.mjs fails when any fingerprint changes. Update the manifest only after the
// owner has approved the customer-facing change.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const manifestPath = join(root, "tests/fixtures/customer-freeze.json");

// Customer-owned: any change here is a change to the approved experience.
const ownedRoots = ["src/app/mi-reserva", "src/app/api/mi-reserva", "src/components/trip", "src/components/portal"];
// Customer-facing outputs produced from admin actions (e-mails, calendar, documents the customer receives).
const extraEntries = ["src/lib/travel-email.ts", "src/lib/travel-calendar.ts", "src/lib/itinerary-pdf.tsx", "src/lib/receipt-pdf.tsx", "src/lib/invoice-pdf.tsx", "src/lib/reservation-pdf.ts"];
const messageNamespaces = [["trip"], ["portal"], ["v4", "portal"]];

const walk = dir => readdirSync(join(root, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(root, path)).isDirectory() ? walk(path) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : [];
});

function resolve(from, specifier) {
  let base;
  // Translation files are fingerprinted per namespace (messageNamespaces), not as whole files, so copy
  // changes elsewhere on the public site do not trip the freeze.
  if (/(^|\/)messages\/[a-z]{2}\.json$/.test(specifier)) return null;
  if (specifier.startsWith("@/")) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith(".")) base = relative(root, join(root, dirname(from), specifier)).replaceAll("\\", "/");
  else return null; // packages are pinned by package-lock.json
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (existsSync(join(root, candidate)) && statSync(join(root, candidate)).isFile()) return candidate;
  return null; // assets resolved by the bundler (images, fonts) are covered below when imported with an extension
}

const importPattern = /(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g;

// Line endings are normalised so a checkout with CRLF produces the same fingerprint.
const digest = path => createHash("sha256").update(readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n")).digest("hex").slice(0, 16);

export function computeFreeze() {
  const owned = ownedRoots.flatMap(walk);
  const seen = new Set();
  const queue = [...owned, ...extraEntries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(ts|tsx|mjs|js)$/.test(file)) continue;
    for (const match of readFileSync(join(root, file), "utf8").matchAll(importPattern)) {
      const target = resolve(file, match[1] ?? match[2] ?? match[3]);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  const ownedSet = new Set(owned);
  const files = {};
  for (const file of [...seen].sort()) files[file] = { owner: ownedSet.has(file) ? "customer" : "shared", sha256: digest(file) };
  const messages = {};
  for (const locale of ["es", "en"]) {
    const all = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), "utf8"));
    for (const path of messageNamespaces) {
      const value = path.reduce((node, key) => node?.[key], all);
      messages[`${locale}:${path.join(".")}`] = createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
    }
  }
  return { files, messages };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const freeze = computeFreeze();
  const entries = Object.values(freeze.files);
  console.log(`${entries.length} files (${entries.filter(file => file.owner === "customer").length} customer-owned, ${entries.filter(file => file.owner === "shared").length} shared), ${Object.keys(freeze.messages).length} message namespaces`);
  if (process.argv.includes("--update")) {
    writeFileSync(manifestPath, `${JSON.stringify({ note: "Fingerprint of the approved customer experience. Regenerate only after owner approval: node scripts/customer-freeze.mjs --update", ...freeze }, null, 2)}\n`);
    console.log(`Wrote ${relative(root, manifestPath)}`);
  }
}
