import "server-only";

import type { AttachmentType } from "@/lib/chat-attachments";
import { attachmentMaxBytes } from "@/lib/chat-attachments";

// Re-encodes an uploaded photo before it is stored: the pixels are decoded and written again, so anything
// hidden after the image data is dropped, along with the camera and location metadata (EXIF, GPS, XMP).
// The photo is turned upright first and capped at 2400 px. A file that cannot be decoded is refused.
// PDFs are not touched here (see pdfHasActiveContent).
export async function cleanImage(bytes: Uint8Array, mime: AttachmentType): Promise<{ bytes: Buffer; mime: AttachmentType } | null> {
  if (mime === "application/pdf") return { bytes: Buffer.from(bytes), mime };
  try {
    const { default: sharp } = await import("sharp");
    const base = () => sharp(bytes, { failOn: "error", limitInputPixels: 50_000_000 }).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true });
    let output = mime === "image/png" ? await base().png({ compressionLevel: 9 }).toBuffer() : mime === "image/webp" ? await base().webp({ quality: 82 }).toBuffer() : await base().jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    let type = mime;
    // A large screenshot can stay big as PNG; JPEG keeps it under the limit.
    if (output.length > attachmentMaxBytes) { output = await base().jpeg({ quality: 78, mozjpeg: true }).toBuffer(); type = "image/jpeg"; }
    return output.length > attachmentMaxBytes ? null : { bytes: output, mime: type };
  } catch {
    return null;
  }
}
