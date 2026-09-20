import { requireAdmin } from "@/lib/admin";
import { getAdminQuotation } from "@/lib/quotation-data";
import { renderQuotationPdf } from "@/lib/quotation-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Cotización inválida.", { status: 400 });
  const record = await getAdminQuotation(client, id);
  if (!record) return new Response("No se encontró la cotización.", { status: 404 });
  const pdf = await renderQuotationPdf(record.quotation, record.items);
  return new Response(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="cotizacion-${record.quotation.codigo}.pdf"`, "Cache-Control": "private, no-store" } });
}
