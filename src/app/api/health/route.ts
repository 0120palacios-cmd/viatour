export const dynamic = "force-static";

export function GET() {
  return Response.json({ ok: true, status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
