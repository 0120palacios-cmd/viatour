import { requireAdmin } from "@/lib/admin";
import { getAdminInvoice } from "@/lib/reservation-data";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { validUuid } from "@/lib/quotation-validation";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) return new Response("Factura inválida.", { status: 400 });
  const record = await getAdminInvoice(client, id);
  if (!record) return new Response("No se encontró la factura.", { status: 404 });
  const pdf = await renderInvoicePdf(record.invoice);
  return new Response(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="factura-${record.invoice.numero}.pdf"`, "Cache-Control": "private, no-store" } });
}
