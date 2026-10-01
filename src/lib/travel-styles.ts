import type { Package } from "@/lib/packages";

// Ways to browse the catalogue by kind of trip. Each one is backed by data the packages already carry
// (their `etiquetas` or their `categoria`), so a style never promises trips that are not published.
export type TravelStyle = {
  slug: string;
  /** Message key under `v3.styles`. */
  key: string;
  tags?: readonly string[];
  region?: string;
};

export const travelStyles: readonly TravelStyle[] = [
  { slug: "playa-caribe", key: "beach", region: "Caribe" },
  { slug: "luna-de-miel", key: "honeymoon", tags: ["luna-de-miel"] },
  { slug: "parejas", key: "couples", tags: ["parejas"] },
  { slug: "familias", key: "family", tags: ["familias"] },
  { slug: "grupos", key: "groups", tags: ["grupos", "quinceaneras"] },
  { slug: "cultura", key: "culture", tags: ["cultura", "religioso", "tierra-santa"] },
  { slug: "aventura", key: "adventure", tags: ["aventura", "naturaleza"] },
  { slug: "cruceros", key: "cruises", tags: ["cruceros"], region: "Cruceros" },
];

export function findTravelStyle(slug?: string | null) {
  return slug ? travelStyles.find(style => style.slug === slug) : undefined;
}

export function matchesTravelStyle(item: Pick<Package, "etiquetas" | "categoria">, style: TravelStyle) {
  if (style.region && item.categoria === style.region) return true;
  return Boolean(style.tags?.some(tag => item.etiquetas?.includes(tag)));
}

/** Folds accents and case so "japon" finds "Japón" and "cancun" finds "Cancún". */
export function searchText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
}

/** Every word of the query must appear somewhere in the package's name, destination, summary, region or tags. */
export function matchesSearch(item: Pick<Package, "nombre" | "destino" | "resumen" | "categoria" | "etiquetas">, query: string) {
  const words = searchText(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = searchText([item.nombre, item.destino, item.resumen, item.categoria ?? "", ...(item.etiquetas ?? [])].join(" ").replace(/-/g, " "));
  return words.every(word => haystack.includes(word));
}

/**
 * Destinations the catalogue covers beyond the featured ones: single-place package destinations
 * (no lists with commas), each linked to its first package. Shows how far viatour plans trips
 * using only published packages.
 */
export function extraDestinations(items: Pick<Package, "destino" | "slug">[], featuredNames: readonly string[], limit = 16) {
  const featured = new Set(featuredNames.map(searchText));
  const seen = new Set<string>();
  const result: { name: string; slug: string }[] = [];
  for (const item of items) {
    const name = item.destino?.trim();
    if (!name || name.includes(",")) continue;
    const key = searchText(name);
    if (featured.has(key) || seen.has(key) || [...featured].some(value => key.startsWith(`${value} `))) continue;
    seen.add(key);
    result.push({ name, slug: item.slug });
    if (result.length >= limit) break;
  }
  return result;
}
