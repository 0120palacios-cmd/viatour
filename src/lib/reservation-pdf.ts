import "server-only";
import { toRecord } from "@/lib/quotation-data";
import { renderQuotationPdf } from "@/lib/quotation-pdf";
import { reservationStatusLabel, type Payment, type Reservation, type ReservationItem } from "@/lib/reservation-types";
import { totalAmount } from "@/lib/money";

export const reservationPortalUrl = "https://www.miviatour.com/mi-reserva";

export async function renderReservationPdf(reservation: Reservation, items: ReservationItem[], payments: Payment[]) {
  const snapshot = reservation.accepted_snapshot;
  if (!snapshot?.quotation || !snapshot.items?.length) throw new Error("La reserva no tiene una versión aceptada verificable.");
  if (totalAmount(snapshot.items) !== Number(reservation.total) || totalAmount(items) !== Number(reservation.total)) throw new Error("El total de la reserva no coincide con el documento aceptado.");
  const record = toRecord({ ...snapshot.quotation, notas: null }, snapshot.items, true);
  const deposit = record.details.pago.deposito;
  record.details.pago.deposito = ""; // Requested deposit is never treated as money received.
  const paid = payments.filter(payment => payment.moneda === reservation.moneda).reduce((cents, payment) => cents + Math.round(Number(payment.monto) * 100), 0) / 100;
  const supplier = ({ pendiente: "Pendiente de confirmación", parcial: "Confirmación parcial", confirmada: "Confirmado por proveedor", emitida: "Boletos emitidos" } as Record<string,string>)[reservation.supplier_status ?? "pendiente"];
  return renderQuotationPdf(record, { issuedAt: reservation.created_at, versionNumber: snapshot.quotation.version ?? undefined, reservation: {
    code: reservation.codigo, status: `${reservation.prerreserva ? "Prerreservación" : "Reserva"} · ${reservationStatusLabel(reservation.estado)}`,
    supplier, paid, deposit, portalUrl: reservationPortalUrl,
  } });
}
