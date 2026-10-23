// The destination content Mi viaje and the itinerary may show: only what the site already publishes
// for that destination (destinations table, imported from data/destinations.json). Nothing is written
// here about a destination; when there is no published entry, the portal simply shows no destination block.
// Pure, so it can be tested without a database.

import { normalizePlace } from "@/lib/destination-match";

export type DestinationSource = { slug: string; nombre: string; intro: string | null; cuerpo: string | null; imagen_url: string | null; destacado?: boolean; publicado?: boolean };
export type TripDestination = { slug: string; name: string; intro: string; body: string; image: string | null };
export type DestinationSuggestion = { slug: string; name: string; intro: string; image: string };

// Only photos served by the site itself (public/...), never a hotlinked URL.
const localImage = (value: string | null | undefined) => value && /^\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(value) ? value : null;

// "Cancún, México" → cancun; "Nueva York y Toronto" → nueva-york. Whole words only, longest name first,
// so "san-andres" never matches inside another place.
export function matchDestination<T extends DestinationSource>(destino: string, items: T[]): T | null {
  const place = `-${normalizePlace(destino)}-`;
  const candidates = items.filter(item => item.publicado !== false)
    .map(item => ({ item, names: [normalizePlace(item.slug), normalizePlace(item.nombre)].filter(Boolean) }))
    .sort((a, b) => Math.max(...b.names.map(name => name.length)) - Math.max(...a.names.map(name => name.length)));
  return candidates.find(candidate => candidate.names.some(name => place.includes(`-${name}-`)))?.item ?? null;
}

export function destinationContent(destino: string, items: DestinationSource[]) {
  const match = matchDestination(destino, items);
  const destination: TripDestination | null = match && (match.intro || match.cuerpo)
    ? { slug: match.slug, name: match.nombre, intro: (match.intro ?? "").trim(), body: (match.cuerpo ?? "").trim(), image: localImage(match.imagen_url) }
    : null;
  // Ideas for a next trip: featured destinations with a real photo, never the one being travelled to.
  const suggestions: DestinationSuggestion[] = items
    .filter(item => item.publicado !== false && item.destacado && item.slug !== match?.slug && localImage(item.imagen_url))
    .slice(0, 3)
    .map(item => ({ slug: item.slug, name: item.nombre, intro: (item.intro ?? "").trim(), image: localImage(item.imagen_url)! }));
  return { destination, suggestions };
}
