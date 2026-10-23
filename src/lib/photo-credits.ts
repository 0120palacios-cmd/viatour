// Author and license of the licensed photos the site serves from public/ (Wikimedia Commons, commercial use
// allowed). CC BY and CC BY-SA require naming the author and license wherever the photo appears, so every
// surface that shows one of these photos lists its credit. Pure, so it can be tested.

import tripCredits from "../../data/trip-photo-credits.json";
import panamaCredits from "../../data/panama-photo-credits.json";

export type PhotoCredit = { archivo: string; alt: string; autor: string; licencia: string; licencia_url: string | null; fuente: string };

const all = new Map<string, PhotoCredit>([...(panamaCredits as PhotoCredit[]), ...(tripCredits as PhotoCredit[])].map(credit => [credit.archivo, credit]));

// Credits for the given photos, in the order given, without duplicates. Photos without a record (the site's
// own earlier destination photos) are simply not listed.
export function creditsFor(paths: (string | null | undefined)[]): PhotoCredit[] {
  return [...new Set(paths.filter((path): path is string => Boolean(path)))].flatMap(path => all.get(path) ?? []);
}

export function hasCredit(path: string) {
  return all.has(path);
}
