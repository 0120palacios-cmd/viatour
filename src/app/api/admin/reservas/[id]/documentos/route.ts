import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { documentSource, portalDocsBucket } from "@/lib/portal-documents";

export const dynamic = "force-dynamic";

// Opens one stored document of this reservation for the admin client preview: same folder-layout check
// as the customer route, signed with the admin's own session (storage policies, not the service role).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  const path = new URL(request.url).searchParams.get("ruta") ?? "";
  if (!validUuid(id) || !documentSource(id, path)) return new Response("Documento no disponible.", { status: 404, headers });
  const signed = await client.storage.from(portalDocsBucket).createSignedUrl(path, 60);
  if (signed.error || !signed.data?.signedUrl) return new Response("Documento no disponible.", { status: 404, headers });
  return new Response(null, { status: 303, headers: { ...headers, Location: signed.data.signedUrl, "Referrer-Policy": "no-referrer" } });
}
