import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { validUuid } from "@/lib/quotation-validation";
import { attachmentHeaders, attachmentTypes, isAttachmentPath, type ChatAttachment } from "@/lib/chat-attachments";
import { portalDocsBucket } from "@/lib/portal-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number) => new Response(status === 401 ? "No autorizado." : "Archivo no disponible.", { status, headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain; charset=utf-8" } });

// One chat attachment of the signed-in reservation. The row is looked up by its ID *and* the session's
// reservation, so an ID from another reservation answers 404 exactly like one that does not exist; the
// stored path is checked again before reading. The bytes are served from this origin (no storage URL is
// handed out) with headers that keep the browser from sniffing or running them.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) return fail(401);
  const { id } = await params;
  if (!validUuid(id)) return fail(404);
  const client = createAdminClient();
  const row = await client.from("reservation_message_attachments").select("id,path,name,mime,size,reservation_id").eq("id", id).eq("reservation_id", reservationId).maybeSingle();
  const file = row.data as (ChatAttachment & { path: string; reservation_id: string }) | null;
  if (row.error || !file || file.reservation_id !== reservationId || !isAttachmentPath(reservationId, file.path) || !(attachmentTypes as readonly string[]).includes(file.mime)) return fail(404);
  const download = await client.storage.from(portalDocsBucket).download(file.path);
  if (download.error || !download.data) return fail(404);
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  return new Response(bytes, { headers: attachmentHeaders({ ...file, size: bytes.length }) });
}
