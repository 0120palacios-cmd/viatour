import "server-only";

import data from "./offline-data.json";
import type { RequirementsProvider, RequirementsQuery, RequirementsResult } from "./types";

type OfflineEntry = (typeof data)[number];

function key(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function destinationMatches(input: string, entry: string) {
  const normalized = key(input);
  const expected = key(entry);
  if (normalized === expected) return true;
  if (expected === "punta cana") return normalized === "republica dominicana" || normalized === "dominican republic";
  if (expected === "europa") return normalized === "schengen" || normalized === "espacio schengen";
  if (expected === "dubai") return normalized === "emiratos arabes unidos" || normalized === "uae";
  if (expected === "cartagena") return normalized === "colombia";
  return false;
}

function toResult(entry: OfflineEntry): RequirementsResult {
  return {
    status: "ok",
    provider: "offline",
    sourceUrl: entry.sourceUrl,
    data: {
      visaRequirement: entry.visaRequirement,
      allowedStay: entry.allowedStay,
      passportRules: entry.passportRules,
      transitRequirements: entry.transitRequirements,
      notes: entry.notes,
      updatedAt: entry.ultima_actualizacion,
      referential: true,
    },
  };
}

export const offlineProvider: RequirementsProvider = {
  async check({ nacionalidad, destino }: RequirementsQuery) {
    const nationality = key(nacionalidad) === "honduras" ? "HN" : nacionalidad.trim().toUpperCase();
    const entry = data.find(item => item.nacionalidad === nationality && destinationMatches(destino, item.destino));
    return entry ? toResult(entry) : { status: "unknown", provider: "offline" };
  },
};
