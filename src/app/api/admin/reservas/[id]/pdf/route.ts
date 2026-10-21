import { requireAdmin } from "@/lib/admin";
import { getAdminReservation } from "@/lib/reservation-data";
import { renderReservationPdf } from "@/lib/reservation-pdf";
import { validUuid } from "@/lib/quotation-validation";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  if (!validUuid(id)) return new Response("Documento no disponible.", { status: 404, headers });
  const record = await getAdminReservation(client, id);
  if (!record) return new Response("Documento no disponible.", { status: 404, headers });
  try {
    const pdf = await renderReservationPdf(record.reservation, record.items, record.payments, record.invoices);
    return new Response(pdf as unknown as BodyInit, { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("inline") === "1" ? "inline" : "attachment"}; filename="confirmacion-${record.reservation.codigo}.pdf"` } });
  } catch {
    return new Response("Revise la versión aceptada y los importes de la reserva antes de generar el PDF.", { status: 409, headers });
  }
}
