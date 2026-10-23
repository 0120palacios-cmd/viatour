import { tripFixtures } from "@/lib/trip-fixtures";
import { renderItineraryPdf } from "@/lib/itinerary-pdf";
import { renderReservationConfirmationPdf } from "@/lib/reservation-confirmation-pdf";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import { itineraryEmail, receiptEmail } from "@/lib/travel-email";
import { termsTemplates } from "@/lib/quotation-details";
import type { Reservation } from "@/lib/reservation-types";
import type { PublicTravel } from "@/lib/travel-operations";

export const dynamic = "force-dynamic";

// Local QA of the customer documents and emails with anonymized fixtures (same gate as the fixture page):
// itinerario.pdf, confirmacion.pdf, recibo.pdf, correo.html, correo.txt, correo-recibo.html.
export async function GET(_: Request, { params }: { params: Promise<{ caso: string; documento: string }> }) {
  if (process.env.NODE_ENV !== "development" && process.env.TRIP_FIXTURES !== "1") return new Response("No encontrado", { status: 404 });
  const { caso, documento } = await params;
  const fixture = tripFixtures()[caso];
  if (!fixture) return new Response("No encontrado", { status: 404 });
  const input = fixture.input;
  const total = Number(input.reservation.total);
  const items = [{ descripcion: "Servicios de viaje según la versión aceptada", tipo: "Paquete", cantidad: 1, precio_unitario: total, orden: 0 }];
  const reservation = {
    ...input.reservation, quotation_id: null, customer_id: null, cliente_nombre: fixture.customerName, cliente_email: "qa@example.invalid", cliente_telefono: null, notas: "INTERNAL DO NOT PRINT", agente_id: "qa", created_at: "2026-10-10T15:00:00Z",
    supplier_reference: input.reservation.supplier_status === "pendiente" ? null : "QA-SUPPLIER-REF",
    accepted_snapshot: { quotation: { codigo: "COT-QA-0001", version: 2, detalles: { ...(input.details as object), condiciones: termsTemplates.vuelo, pago: { deposito: "", depositoFecha: "", saldoFecha: "2026-11-01", instrucciones: "Transferencia o depósito a la cuenta indicada por su asesor.", precioPorPasajero: false } } }, items },
  } as unknown as Reservation;
  const payments = input.payments.map((payment, index) => ({ id: `p${index}`, reservation_id: reservation.id, monto: Number(payment.monto), moneda: payment.moneda as "USD", metodo: "transferencia" as const, referencia: "QA-REF", fecha_pago: payment.fecha_pago ?? "", notas: null }));
  const receipt = { id: "r1", number: input.receipts[0]?.number ?? "REC-00000099", reservation_id: reservation.id, created_at: "2026-10-15T15:00:00Z", snapshot: { customer: fixture.customerName, reservation: reservation.codigo, amount: Number(input.payments[0]?.monto ?? 500), currency: reservation.moneda, method: "transferencia" as const, reference: "QA-TRANSFER-001", date: input.payments[0]?.fecha_pago ?? "2026-10-15", balance: Math.max(0, total - Number(input.payments[0]?.monto ?? 500)) } };
  const pdf = (body: Buffer) => new Response(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
  const travel = input.travel as PublicTravel;
  if (documento === "itinerario.pdf") return pdf(await renderItineraryPdf(reservation, travel, 3, input.today));
  if (documento === "confirmacion.pdf") return pdf(await renderReservationConfirmationPdf(reservation, items, payments, [], "2026-10-21T15:00:00Z"));
  if (documento === "recibo.pdf") return pdf(await renderReceiptPdf(receipt));
  const email = documento.startsWith("correo-recibo") ? receiptEmail(receipt) : itineraryEmail(reservation, travel, input.today);
  if (documento.endsWith(".txt")) return new Response(`Asunto: ${email.subject}\nVista previa: ${email.preheader}\n\n${email.text}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  if (documento.endsWith(".html")) return new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  return new Response("No encontrado", { status: 404 });
}
