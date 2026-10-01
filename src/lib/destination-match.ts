// Which published packages belong on a destination page. Pure, so it can be tested without a database.
// Some destinations are regions (Europa, Medio Oriente, Cruceros) whose packages name the countries
// instead; others appear inside a multi-destination package ("Cartagena y Ciudad de Panamá").

export function normalizePlace(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Region destinations and the package category that covers them (the same categories /paquetes filters by).
export const regionCategories: Record<string, string> = { europa: "Europa", "medio-oriente": "Medio Oriente", cruceros: "Cruceros" };

type DestinationRef = { id: string; slug: string; nombre: string };
type PackageRef = { destination_id: string | null; destino: string; categoria: string | null };

export function packageMatchesDestination(item: PackageRef, destination: DestinationRef) {
  if (item.destination_id && item.destination_id === destination.id) return true;
  const place = `-${normalizePlace(item.destino)}-`;
  const names = [normalizePlace(destination.slug), normalizePlace(destination.nombre)].filter(Boolean);
  // Whole words only: "panama" matches "cartagena-y-ciudad-de-panama", never part of another word.
  if (names.some(name => place.includes(`-${name}-`))) return true;
  const region = regionCategories[destination.slug];
  return Boolean(region && item.categoria === region);
}
