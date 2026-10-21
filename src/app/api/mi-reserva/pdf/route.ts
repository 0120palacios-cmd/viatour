import { cookies } from "next/headers";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminReservation } from "@/lib/reservation-data";
import { renderReservationPdf } from "@/lib/reservation-pdf";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  // The reservation comes exclusively from the verified, expiring OTP session. No request ID accepted.
  const id = verifyPortalCookie((await cookies()).get(portalCookieName)?.value);
  if (!id) return new Response("No autorizado.", { status: 401, headers });
  const record = await getAdminReservation(createAdminClient(), id);
  if (!record) return new Response("Documento no disponible.", { status: 404, headers });
  try {
    const pdf = await renderReservationPdf(record.reservation, record.items, record.payments, record.invoices);
    return new Response(pdf as unknown as BodyInit, { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("inline") === "1" ? "inline" : "attachment"}; filename="confirmacion-${record.reservation.codigo}.pdf"` } });
  } catch {
    return new Response("Documento no disponible. Consulte con su asesor.", { status: 409, headers });
  }
}
