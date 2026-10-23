import { openSharedQuotation } from "@/lib/quotation-link";
import { rateLimit } from "@/lib/public-security";
import { quotationPdfFilename, renderQuotationPdf } from "@/lib/quotation-pdf";
import { loadQuotationPhotos } from "@/lib/quotation-media";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The PDF of the shared version, rendered from its frozen snapshot (the same document an e-mail would attach).
// ?inline=1 opens it in the browser instead of downloading.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = await rateLimit(request, "quotation-link-pdf", 60);
  if (limited) return limited;
  const { token } = await params;
  const shared = await openSharedQuotation(token);
  if (shared.state !== "ok") return new Response(shared.state === "expired" ? "Este enlace venció." : "Este enlace no está disponible.", { status: shared.state === "expired" ? 410 : 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const photos = await loadQuotationPhotos(createAdminClient(), shared.record.details);
  const pdf = await renderQuotationPdf(shared.record, { photos, versionNumber: shared.versionNumber });
  const disposition = new URL(request.url).searchParams.get("inline") === "1" ? "inline" : "attachment";
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${quotationPdfFilename(shared.record, shared.versionNumber)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}
