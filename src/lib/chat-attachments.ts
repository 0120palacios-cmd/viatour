// Files a traveller can attach to a Mi viaje message: photos (JPEG, PNG, WebP) and PDFs, up to 4 MB.
// Pure, so the rules can be tested without storage. The type is decided by the file's own first bytes,
// never by its name or the browser's label, so an HTML page, an SVG (which can carry script), an executable
// or a renamed file is refused. PDFs that declare active content (scripts, launch actions, embedded files)
// are refused too. Images are re-encoded on the server before storage (route), which also drops their
// metadata (camera, location). Files are stored in the private `portal-docs` bucket under
// {reservation}/mensajes/{random id}.{ext}; the name the person chose is only kept as display text.

import { portalUploadMaxBytes, safeDocumentName } from "@/lib/portal-documents";

export const attachmentMaxBytes = portalUploadMaxBytes;
export const attachmentTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AttachmentType = (typeof attachmentTypes)[number];
export type ChatAttachment = { id: string; name: string; mime: AttachmentType; size: number };

const extensions: Record<AttachmentType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
export const attachmentExtension = (mime: AttachmentType) => extensions[mime];
export const isImageAttachment = (mime: string) => mime.startsWith("image/");

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);
const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

// The real type of a file from its first bytes, or null when it is not one of the accepted types.
export function sniffAttachment(bytes: Uint8Array): AttachmentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

// Name tokens for scripts, launch actions, embedded files and rich media. A travel document never needs
// them. (/OpenAction and /AA are left alone: ordinary exported PDFs use them to set the opening page.)
const activePdf = /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA)\b/;
export function pdfHasActiveContent(bytes: Uint8Array) {
  // Latin-1 keeps every byte as one character, so the dictionary names are searchable.
  let text = "";
  for (let index = 0; index < bytes.length; index += 65536) text += String.fromCharCode(...bytes.subarray(index, Math.min(bytes.length, index + 65536)));
  return activePdf.test(text);
}

export type AttachmentCheck = { ok: true; mime: AttachmentType; name: string } | { ok: false; reason: "empty" | "tooLarge" | "type" | "activePdf" };

// What the server accepts. `declared` is the browser's label: it must agree with the bytes, so a renamed
// file is refused instead of being stored under a misleading type.
export function checkAttachment(bytes: Uint8Array, declared: string, originalName: string): AttachmentCheck {
  if (!bytes.length) return { ok: false, reason: "empty" };
  if (bytes.length > attachmentMaxBytes) return { ok: false, reason: "tooLarge" };
  const mime = sniffAttachment(bytes);
  if (!mime || (declared && declared !== mime && !(declared === "image/jpg" && mime === "image/jpeg"))) return { ok: false, reason: "type" };
  if (mime === "application/pdf" && pdfHasActiveContent(bytes)) return { ok: false, reason: "activePdf" };
  return { ok: true, mime, name: safeDocumentName(originalName || "archivo", attachmentExtension(mime)) };
}

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function attachmentPath(reservationId: string, fileId: string, mime: AttachmentType) {
  return `${reservationId}/mensajes/${fileId}.${attachmentExtension(mime)}`;
}
// Only a server-made path inside this reservation's chat folder (mirrors the database check).
export function isAttachmentPath(reservationId: string, path: string) {
  return new RegExp(`^${uuid}/mensajes/${uuid}\\.(jpg|png|webp|pdf)$`).test(path) && path.split("/")[0] === reservationId;
}

// Headers for serving a stored attachment: never sniffed or run by the browser, never cached by a proxy,
// opened inline (images, PDFs) with a safe download name.
export function attachmentHeaders(attachment: Pick<ChatAttachment, "name" | "mime" | "size">) {
  const ascii = attachment.name.replace(/[^A-Za-z0-9._-]/g, "_");
  return {
    "Content-Type": attachment.mime,
    "Content-Length": String(attachment.size),
    "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
