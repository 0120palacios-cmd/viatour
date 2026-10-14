import { requireAdmin } from "@/lib/admin";
import { getAdminQuotation, getQuotationVersion } from "@/lib/quotation-data";
import { quotationPdfFilename, renderQuotationPdf } from "@/lib/quotation-pdf";
import { loadQuotationPhotos } from "@/lib/quotation-media";
import { validUuid } from "@/lib/quotation-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ?version=N renders an issued version from its frozen snapshot; without it, the current quotation.
// ?inline=1 opens it in the browser instead of downloading.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) return new Response("Cotización inválida.", { status: 400 });
  const url = new URL(request.url);
  const versionParam = url.searchParams.get("version");
  const versionNumber = versionParam && /^\d{1,4}$/.test(versionParam) ? Number(versionParam) : undefined;
  if (versionParam && !versionNumber) return new Response("Versión inválida.", { status: 400 });
  const record = versionNumber ? await getQuotationVersion(client, id, versionNumber) : await getAdminQuotation(client, id);
  if (!record) return new Response("No se encontró la cotización.", { status: 404 });
  const photos = await loadQuotationPhotos(client, record.details);
  const pdf = await renderQuotationPdf(record, { photos, versionNumber });
  const disposition = url.searchParams.get("inline") === "1" ? "inline" : "attachment";
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${quotationPdfFilename(record, versionNumber)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
