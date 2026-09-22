import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packagesPath = fileURLToPath(new URL("../data/packages.json", import.meta.url));
const exclusionsPath = fileURLToPath(new URL("../data/packages-no-incluye.json", import.meta.url));

const packages = JSON.parse(readFileSync(packagesPath, "utf8"));
const exclusions = JSON.parse(readFileSync(exclusionsPath, "utf8"));

if (!Array.isArray(packages) || !Array.isArray(exclusions)) {
  throw new Error("Ambos archivos deben contener arreglos JSON.");
}

const bySlug = new Map(packages.map((item) => [item.slug, item]));
let merged = 0;
for (const entry of exclusions) {
  if (!entry || typeof entry.slug !== "string" || !Array.isArray(entry.no_incluye)) {
    throw new Error("Cada entrada de no-incluye debe tener slug y un arreglo no_incluye.");
  }
  const item = bySlug.get(entry.slug);
  if (!item) throw new Error(`No existe el paquete con slug: ${entry.slug}`);
  item.no_incluye = entry.no_incluye;
  merged += 1;
}

writeFileSync(packagesPath, `${JSON.stringify(packages, null, 2)}\n`, "utf8");
console.log(`Paquetes fusionados: ${merged}.`);
