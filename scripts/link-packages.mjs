import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: [".env.local", ".env"] });

const packagesPath = new URL("../data/packages.json", import.meta.url);

function loadPackages() {
  const value = JSON.parse(readFileSync(packagesPath, "utf8"));
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("data/packages.json debe contener al menos un paquete.");
  }
  return value;
}

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isEuropeanMultiCountry(item) {
  return item.categoria === "Europa" && item.destino.split(",").length > 1;
}

function destinationSlugForPackage(item, destinationsBySlug, destinationsByName) {
  if (item.slug === "cartagena-y-panama") return "cartagena";
  if (item.slug.startsWith("punta-cana-")) return "punta-cana";
  if (item.slug.startsWith("cancun-")) return "cancun";
  if (item.slug.startsWith("rio-") || item.slug === "carnaval-de-rio") return "rio-de-janeiro";
  if (item.slug === "buenos-aires-bariloche") return "argentina";
  if (item.slug === "dubai-abu-dhabi") return "dubai";
  if (item.slug === "paris-disneyland") return "paris";
  if (item.slug.startsWith("crucero-")) return "cruceros";
  if (isEuropeanMultiCountry(item)) return "europa";

  const exactSlug = normalize(item.destino);
  if (destinationsBySlug.has(exactSlug)) return exactSlug;
  return destinationsByName.get(exactSlug) ?? null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY localmente.");
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const packages = loadPackages();

  const { data: destinations, error: destinationsError } = await client
    .from("destinations")
    .select("id,slug,nombre");
  if (destinationsError) throw new Error(`No se pudieron consultar los destinos: ${destinationsError.message}`);

  const destinationsBySlug = new Map((destinations ?? []).map((item) => [item.slug, item]));
  const destinationsByName = new Map((destinations ?? []).map((item) => [normalize(item.nombre), item.slug]));

  const { data: existingPackages, error: packagesError } = await client
    .from("packages")
    .select("id,slug,nombre,destino,destination_id");
  if (packagesError) throw new Error(`No se pudieron consultar los paquetes: ${packagesError.message}`);

  const packagesBySlug = new Map((existingPackages ?? []).map((item) => [item.slug, item]));
  for (const item of packages) {
    const current = packagesBySlug.get(item.slug);
    if (!current) {
      console.log(`${item.slug} -> sin paquete en la base de datos; no se actualizó.`);
      continue;
    }

    const destinationSlug = destinationSlugForPackage(item, destinationsBySlug, destinationsByName);
    const destination = destinationSlug ? destinationsBySlug.get(destinationSlug) : null;
    const destinationId = destination?.id ?? null;
    const { error } = await client
      .from("packages")
      .update({ destination_id: destinationId })
      .eq("id", current.id);
    if (error) throw new Error(`No se pudo enlazar el paquete ${item.slug}: ${error.message}`);

    console.log(`${item.slug} -> ${destination ? `${destination.nombre} (${destination.slug})` : "NULL (sin coincidencia confiable)"}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar el enlace de paquetes.");
  process.exitCode = 1;
});
