import { homeDestinations, type HomeDestination } from "@/lib/home-destinations";

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

// The destination a guide is about, read from its title only (a body mentions many places in
// passing). When several appear, the first one in the title wins: "Cancún o Punta Cana" → Cancún.
export function guideDestination(title: string): HomeDestination | null {
  const text = normalize(title);
  let best: { destination: HomeDestination; index: number } | null = null;
  for (const destination of homeDestinations) {
    const match = new RegExp(`(^|[^a-z])${normalize(destination.nombre).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).exec(text);
    if (match && (!best || match.index < best.index)) best = { destination, index: match.index };
  }
  return best?.destination ?? null;
}

// About 200 words per minute for Spanish reading on screen; never less than one minute.
export function readingMinutes(markdown: string) {
  const words = markdown.replace(/[#>*_`[\]()|-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Stable, readable anchors for guide headings (#pasaporte-vigente).
export function headingSlug(text: string) {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

// Section headings of a guide (Markdown #, ## and ###, which all render as <h2>), in document
// order, for its contents list. Duplicate titles get a numeric suffix, matching the ids the
// Markdown renderer assigns.
export function guideOutline(markdown: string) {
  const seen = new Map<string, number>();
  const outline: { id: string; text: string }[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^#{1,3}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    // Same visible text the renderer reads: link labels without their URLs, no emphasis marks.
    const text = match[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").trim();
    outline.push({ id: uniqueSlug(text, seen), text });
  }
  return outline;
}

export function uniqueSlug(text: string, seen: Map<string, number>) {
  const base = headingSlug(text) || "seccion";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}
