import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expandedDetails, photoPathPattern, type QuotationDetails } from "@/lib/quotation-details";
import type { PdfPhoto } from "@/lib/quotation-pdf";

// Hotel photos live in the private quotation-media bucket (docs/sql/quotations_v5.sql). They are read
// with the admin's own session (storage policies allow admins only) and only from validated paths in
// that bucket: the PDF never fetches arbitrary URLs.
export const quotationMediaBucket = "quotation-media";
const maxPhotoBytes = 6 * 1024 * 1024;
const maxPhotos = 24;

function imageFormat(bytes: Buffer): PdfPhoto["format"] | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  return null;
}

export async function loadQuotationPhotos(client: SupabaseClient, details: QuotationDetails) {
  // A combined package's hotels are inside its components.
  const paths = Array.from(new Set(expandedDetails(details).hoteles.flatMap(hotel => hotel.fotos.map(photo => photo.path)))).filter(path => photoPathPattern.test(path)).slice(0, maxPhotos);
  const storage = client.storage.from(quotationMediaBucket);
  const loaded = await Promise.all(paths.map(async (path): Promise<[string, PdfPhoto] | null> => {
    try {
      const { data, error } = await storage.download(path);
      if (error || !data || data.size > maxPhotoBytes) return null;
      const bytes = Buffer.from(await data.arrayBuffer());
      const format = imageFormat(bytes);
      return format ? [path, { data: bytes, format }] : null;
    } catch {
      return null;
    }
  }));
  return new Map(loaded.filter((entry): entry is [string, PdfPhoto] => entry !== null));
}
