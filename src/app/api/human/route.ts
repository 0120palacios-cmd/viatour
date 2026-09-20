import { humanSessionExpires, humanSessionResponse, publicError, rateLimit, readBody, verifyTurnstile } from "@/lib/public-security";

export async function GET(request: Request) {
  return Response.json({ expires: await humanSessionExpires(request) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return publicError(403, "Solicitud no permitida.");
  const expires = await humanSessionExpires(request);
  if (expires) return Response.json({ ok: true, expires }, { headers: { "Cache-Control": "no-store" } });
  const limited = await rateLimit(request, "/api/human", 30);
  if (limited) return limited;
  let token: unknown;
  try { token = JSON.parse((await readBody(request, 4096)).toString("utf8")).token; }
  catch { return publicError(400, "Revise los campos indicados."); }
  if (!await verifyTurnstile(request, token)) return publicError(400, "No se pudo verificar su solicitud. Inténtelo nuevamente.");
  return humanSessionResponse();
}
