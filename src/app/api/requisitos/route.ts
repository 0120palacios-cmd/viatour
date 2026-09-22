import { getRequirementsProvider } from "@/lib/requirements/provider";
import type { RequirementsQuery } from "@/lib/requirements/types";
import { publicError, rateLimit, readBody } from "@/lib/public-security";

const fieldPattern = /^[\p{L}\p{N}\s,.'’()\-/]+$/u;

function readText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() && value.length <= max && fieldPattern.test(value.trim()) ? value.trim() : null;
}

function readNationality(value: unknown) {
  if (value === undefined) return "HN";
  if (typeof value !== "string" || value.length > 80) return null;
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "honduras" || trimmed.toUpperCase() === "HN") return "HN";
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

function readPayload(value: unknown): RequirementsQuery | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  const nacionalidad = readNationality(payload.nacionalidad);
  const destino = readText(payload.destino, 120);
  if (!nacionalidad || !destino) return null;
  const transitos = payload.transitos === undefined ? undefined : readText(payload.transitos, 300);
  const fechas = payload.fechas === undefined ? undefined : readText(payload.fechas, 120);
  if ((payload.transitos !== undefined && !transitos) || (payload.fechas !== undefined && !fechas)) return null;
  return { nacionalidad, destino, transitos: transitos || undefined, fechas: fechas || undefined };
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, "/api/requisitos", 20);
  if (limited) return limited;
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return publicError(403, "Solicitud no permitida.");

  let body: unknown;
  try {
    body = JSON.parse((await readBody(request, 8 * 1024)).toString("utf8"));
  } catch {
    return publicError(400, "Revise los datos indicados.");
  }

  const query = readPayload(body);
  if (!query) return publicError(400, "Revise los datos indicados.");

  try {
    const result = await getRequirementsProvider().check(query);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Requirements lookup failed");
    return Response.json({ status: "error", provider: "requirements" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
