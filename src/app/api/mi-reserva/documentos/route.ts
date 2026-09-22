import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { validUuid } from "@/lib/quotation-validation";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 128 * 1024;

function fail(error: string, status = 400) { return Response.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } }); }

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
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return fail("El documento debe pesar como máximo 8 MB.", 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type")! } }).formData();
    const file = form.get("documento");
    if (!(file instanceof File) || !file.size || file.size > MAX_FILE_BYTES) return fail("El documento debe pesar como máximo 8 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatures: Record<string, { extension: string; valid: boolean }> = {
      "application/pdf": { extension: "pdf", valid: bytes.subarray(0, 5).toString("ascii") === "%PDF-" },
      "image/jpeg": { extension: "jpg", valid: bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) },
      "image/png": { extension: "png", valid: bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
      "image/webp": { extension: "webp", valid: bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
    };
    const signature = signatures[file.type];
    if (!signature?.valid) return fail("Seleccione un PDF o una imagen válida.");
    const path = `${reservationId}/${crypto.randomUUID()}.${signature.extension}`;
    const upload = await createAdminClient().storage.from("portal-docs").upload(path, bytes, { contentType: file.type, upsert: false });
    if (upload.error) return fail("No se pudo guardar el documento. Inténtelo nuevamente.", 503);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("No se pudo guardar el documento. Inténtelo nuevamente.", 503);
  }
}
