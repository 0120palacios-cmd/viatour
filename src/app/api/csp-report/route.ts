import { publicError, rateLimit, readBody } from "@/lib/public-security";

// Collects Content-Security-Policy reports (report-uri and Reporting API formats) so the
// report-only policy can be reviewed before enforcement (docs/csp-audit.md). Only the
// directive, blocked origin and page path are logged; no query strings or page content.
const origin = (value: unknown) => { try { return typeof value === "string" && value ? (/^[a-z-]+$/.test(value) ? value : new URL(value).origin) : ""; } catch { return ""; } };
const path = (value: unknown) => { try { return typeof value === "string" && value ? new URL(value).pathname.slice(0, 200) : ""; } catch { return ""; } };

export async function POST(request: Request) {
  const limited = await rateLimit(request, "/api/csp-report", 60); if (limited) return new Response(null, { status: 204 });
  let body: unknown;
  try { body = JSON.parse((await readBody(request, 16 * 1024)).toString("utf8")); }
  catch { return publicError(400, "Reporte inválido."); }
  const reports = Array.isArray(body) ? body.map(item => (item as { body?: unknown })?.body) : [(body as { "csp-report"?: unknown })?.["csp-report"]];
  for (const report of reports.slice(0, 20)) {
    if (!report || typeof report !== "object") continue;
    const r = report as Record<string, unknown>;
    console.warn("CSP violation", {
      directive: String(r["effectiveDirective"] ?? r["effective-directive"] ?? r["violated-directive"] ?? "").slice(0, 80),
      blocked: origin(r["blockedURL"] ?? r["blocked-uri"]),
      page: path(r["documentURL"] ?? r["document-uri"]),
    });
  }
  return new Response(null, { status: 204 });
}
