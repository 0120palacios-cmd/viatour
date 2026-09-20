import { cookies } from "next/headers";
import { getPortalInvoice } from "@/lib/portal-data";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { validUuid } from "@/lib/quotation-validation";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const reservationId = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!reservationId) return new Response("No autorizado.", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { id } = await params;
  if (!validUuid(id)) return new Response("Factura no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });
  const invoice = await getPortalInvoice(createAdminClient(), reservationId, id);
  if (!invoice) return new Response("Factura no disponible.", { status: 404, headers: { "Cache-Control": "no-store" } });

  const pdf = await renderInvoicePdf(invoice);
  return new Response(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="factura-${invoice.numero}.pdf"`, "Cache-Control": "private, no-store" } });
}
