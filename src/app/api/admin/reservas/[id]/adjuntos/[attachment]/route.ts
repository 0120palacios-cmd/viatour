import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { attachmentHeaders, attachmentTypes, isAttachmentPath, type ChatAttachment } from "@/lib/chat-attachments";
import { portalDocsBucket } from "@/lib/portal-documents";

export const dynamic = "force-dynamic";

// A chat attachment of this reservation, for staff: read with the admin's own session (RLS on the table,
// storage policies on the bucket), checked against the reservation in the URL, served with the same
// no-sniff, sandboxed headers as the customer route.
export async function GET(_: Request, { params }: { params: Promise<{ id: string; attachment: string }> }) {
  const { client } = await requireAdmin();
  const { id, attachment } = await params;
  const missing = new Response("Archivo no disponible.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!validUuid(id) || !validUuid(attachment)) return missing;
  const row = await client.from("reservation_message_attachments").select("id,path,name,mime,size,reservation_id").eq("id", attachment).eq("reservation_id", id).maybeSingle();
  const file = row.data as (ChatAttachment & { path: string; reservation_id: string }) | null;
  if (row.error || !file || !isAttachmentPath(id, file.path) || !(attachmentTypes as readonly string[]).includes(file.mime)) return missing;
  const download = await client.storage.from(portalDocsBucket).download(file.path);
  if (download.error || !download.data) return missing;
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  return new Response(bytes, { headers: attachmentHeaders({ ...file, size: bytes.length }) });
}
