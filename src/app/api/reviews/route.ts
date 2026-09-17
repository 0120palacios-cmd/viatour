import { createAdminClient } from "@/lib/supabase/admin";
import { REVIEW_PHOTO_LIMIT, validateReview } from "@/lib/review-validation";

export const runtime = "nodejs";
const MAX_BODY = REVIEW_PHOTO_LIMIT + 64 * 1024;
export async function POST(request: Request) {
  const fail = (status: number, error: string, errors?: Record<string, string>) => Response.json({ ok: false, error, errors }, { status });
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return fail(403, "Solicitud no permitida.");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return fail(400, "Revise los datos de su opinión.");
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail(400, "Revise los datos de su opinión.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return fail(413, "La foto debe pesar como máximo 3 MB."); }
      chunks.push(value);
    }
    form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type")! } }).formData();
  } catch { return fail(400, "Revise los datos de su opinión."); }
  if (form.get("website")) return fail(400, "No se pudo enviar su opinión.");
  const { data, errors } = validateReview(Object.fromEntries(form));
  if (Object.keys(errors).length) return fail(400, "Revise los campos indicados.", errors);
  const photo = form.get("foto");
  let bytes: Buffer | undefined;
  let extension = "";
  if (photo instanceof File && photo.size) {
    if (photo.size > REVIEW_PHOTO_LIMIT) return fail(400, "Revise la foto.", { foto: "La foto debe pesar como máximo 3 MB." });
    bytes = Buffer.from(await photo.arrayBuffer());
    if (photo.type === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) extension = "jpg";
    if (photo.type === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = "png";
    if (photo.type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") extension = "webp";
    if (!extension) return fail(400, "Revise la foto.", { foto: "Seleccione una foto JPG, PNG o WebP válida." });
  }
  try {
    const client = createAdminClient();
    const id = crypto.randomUUID();
    const path = bytes ? `${id}/${crypto.randomUUID()}.${extension}` : null;
    if (path && bytes) {
      const upload = await client.storage.from("review-photos").upload(path, bytes, { contentType: (photo as File).type, upsert: false });
      if (upload.error) return fail(503, "No se pudo guardar la foto. Inténtelo de nuevo.");
    }
    const result = await client.from("reviews").insert({ ...data, id, foto_path: path, estado: "pendiente", fuente: "formulario", verificada: false });
    if (result.error) {
      if (path) await client.storage.from("review-photos").remove([path]);
      return fail(503, "No se pudo guardar su opinión. Inténtelo de nuevo.");
    }
    return Response.json({ ok: true, id }, { status: 201 });
  } catch { return fail(503, "No se pudo guardar su opinión. Inténtelo de nuevo."); }
}
