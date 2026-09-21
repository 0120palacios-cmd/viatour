import "server-only";

import type { RequirementsProvider, RequirementsQuery, RequirementsResult } from "./types";

const endpoint = "https://visa-requirement.p.rapidapi.com/v2/visa/check";
const host = "visa-requirement.p.rapidapi.com";

type Rule = {
  name?: unknown;
  display_label?: unknown;
  duration?: unknown;
  color?: unknown;
  link?: unknown;
  confidence?: unknown;
  full_text?: unknown;
  exception_type_name?: unknown;
};

type TravelBuddyPayload = {
  data?: {
    destination?: { passport_validity?: unknown; embassy_url?: unknown };
    visa_rules?: { primary_rule?: Rule; secondary_rule?: Rule; exception_rule?: Rule };
    mandatory_registration?: { name?: unknown; link?: unknown };
    confidence?: unknown;
  };
  meta?: { confidence?: unknown; is_demo?: unknown; data_mode?: unknown; generated_at?: unknown };
};

const destinationCodes: Record<string, string> = {
  "punta cana": "DO",
  "republica dominicana": "DO",
  "dominican republic": "DO",
  cartagena: "CO",
  colombia: "CO",
  dubai: "AE",
  "emiratos arabes unidos": "AE",
  uae: "AE",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function countryCode(value: string, kind: "nationality" | "destination") {
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  if (kind === "nationality" && normalize(value) === "honduras") return "HN";
  return destinationCodes[normalize(value)] || null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function url(value: unknown) {
  const candidate = text(value);
  if (!candidate) return undefined;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function lowConfidence(payload: TravelBuddyPayload, primary: Rule | undefined) {
  const confidence = payload.data?.confidence ?? primary?.confidence ?? payload.meta?.confidence;
  if (typeof confidence === "number" && confidence < 0.7) return true;
  if (typeof confidence === "string" && /low|unknown/i.test(confidence)) return true;
  if (payload.meta?.is_demo === true || payload.meta?.data_mode === "demo") return true;
  const label = text(primary?.display_label) || text(primary?.name);
  const color = text(primary?.color);
  return !label || /unknown|not available|unavailable|no data/i.test(label) || (color ? !["green", "blue", "yellow", "red"].includes(color.toLowerCase()) : false);
}

function mapPayload(payload: TravelBuddyPayload, query: RequirementsQuery): RequirementsResult {
  const primary = payload.data?.visa_rules?.primary_rule;
  if (lowConfidence(payload, primary)) return { status: "unknown", provider: "travelbuddy" };

  const secondary = payload.data?.visa_rules?.secondary_rule;
  const primaryName = text(primary?.display_label) || text(primary?.name);
  const secondaryName = text(secondary?.display_label) || text(secondary?.name);
  const visaRequirement = [primaryName, secondaryName].filter(Boolean).join(" / ");
  const allowedStay = text(primary?.duration) || text(secondary?.duration) || "La respuesta no especifica una permanencia autorizada.";
  const passportRules = [text(payload.data?.destination?.passport_validity)].filter((value): value is string => Boolean(value));
  if (!passportRules.length) passportRules.push("Consulte la regla de vigencia del pasaporte en la fuente oficial.");

  const transitRequirements = query.transitos?.trim()
    ? "La respuesta corresponde al destino final. Las escalas pueden tener reglas propias; verifique cada tránsito por separado."
    : undefined;
  const sourceUrl = url(primary?.link) || url(secondary?.link) || url(payload.data?.mandatory_registration?.link) || url(payload.data?.destination?.embassy_url);
  if (!sourceUrl || !visaRequirement) return { status: "unknown", provider: "travelbuddy" };

  const notes = ["Resultado referencial de una fuente de datos externa. Verifique siempre con la autoridad oficial."];
  const registration = text(payload.data?.mandatory_registration?.name);
  if (registration) notes.push(`Registro obligatorio indicado por la fuente: ${registration}.`);
  const exception = payload.data?.visa_rules?.exception_rule;
  const exceptionText = text(exception?.full_text) || text(exception?.exception_type_name);
  if (exceptionText) notes.push(`Condición especial indicada por la fuente: ${exceptionText}`);

  return {
    status: "ok",
    provider: "travelbuddy",
    sourceUrl,
    data: {
      visaRequirement,
      allowedStay,
      passportRules,
      transitRequirements,
      notes,
      updatedAt: text(payload.meta?.generated_at) || undefined,
      referential: true,
    },
  };
}

export const travelBuddyProvider: RequirementsProvider = {
  async check(query) {
    const apiKey = process.env.RAPIDAPI_VISA_KEY;
    const passport = countryCode(query.nacionalidad, "nationality");
    const destination = countryCode(query.destino, "destination");
    if (!apiKey || !passport || !destination) return { status: "unknown", provider: "travelbuddy" };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": host,
          "x-rapidapi-key": apiKey,
        },
        body: JSON.stringify({ passport, destination }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok) return { status: "unknown", provider: "travelbuddy" };
      return mapPayload((await response.json()) as TravelBuddyPayload, query);
    } catch {
      return { status: "unknown", provider: "travelbuddy" };
    }
  },
};
