import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { validUuid } from "@/lib/quotation-validation";
import { customerDocumentPath, documentSource, portalDocsBucket, portalUploadMaxBytes } from "@/lib/portal-documents";

export const runtime = "nodejs";
const MAX_BODY_BYTES = portalUploadMaxBytes + 128 * 1024;
// A traveller sends a few documents per trip; this caps what one session can store in a day.
const UPLOADS_PER_DAY = 20;
const SIGNED_URL_SECONDS = 60;

function fail(error: string, status = 400) { return Response.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } }); }

// Opens one document of the signed-in reservation: the path is checked against that reservation's
// folder layout, then a short-lived URL is signed at click time (links never expire on an open page).
export async function GET(request: Request) {
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) return fail("No autorizado.", 401);
  const path = new URL(request.url).searchParams.get("ruta") ?? "";
  if (!documentSource(reservationId, path)) return fail("Documento no disponible.", 404);
  const signed = await createAdminClient().storage.from(portalDocsBucket).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) return fail("Documento no disponible.", 404);
  return new Response(null, { status: 303, headers: { Location: signed.data.signedUrl, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

async function underDailyLimit(client: ReturnType<typeof createAdminClient>, reservationId: string) {
  const key = `/mi-reserva:documentos:${createHash("sha256").update(reservationId).digest("hex")}`;
  const { data, error } = await client.rpc("hit_rate_limit", { p_key: key, p_max: UPLOADS_PER_DAY, p_window_seconds: 86400 });
  return !error && data === true;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return fail("Solicitud no permitida.", 403);
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) return fail("No autorizado.", 401);
  if (!validUuid(reservationId) || !request.headers.get("content-type")?.startsWith("multipart/form-data")) return fail("Revise el documento seleccionado.");
  const reader = request.body?.getReader();
  if (!reader) return fail("Revise el documento seleccionado.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return fail("El documento debe pesar como máximo 4 MB.", 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type")! } }).formData();
    const file = form.get("documento");
    if (!(file instanceof File) || !file.size || file.size > portalUploadMaxBytes) return fail("El documento debe pesar como máximo 4 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatures: Record<string, { extension: string; valid: boolean }> = {
      "application/pdf": { extension: "pdf", valid: bytes.subarray(0, 5).toString("ascii") === "%PDF-" },
      "image/jpeg": { extension: "jpg", valid: bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) },
      "image/png": { extension: "png", valid: bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
      "image/webp": { extension: "webp", valid: bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
    };
    const signature = signatures[file.type];
    if (!signature?.valid) return fail("Seleccione un PDF o una imagen válida.");
    const client = createAdminClient();
    if (!await underDailyLimit(client, reservationId)) return fail("Alcanzó el límite de documentos por hoy. Si necesita enviar más, escríbanos por WhatsApp.", 429);
    const upload = await client.storage.from(portalDocsBucket).upload(customerDocumentPath(reservationId, crypto.randomUUID(), signature.extension), bytes, { contentType: file.type, upsert: false });
    if (upload.error) return fail("No se pudo guardar el documento. Inténtelo nuevamente.", 503);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("No se pudo guardar el documento. Inténtelo nuevamente.", 503);
  }
}
