import "server-only";
import { renderReservationConfirmationPdf } from "@/lib/reservation-confirmation-pdf";
import type { Invoice, Payment, Reservation, ReservationItem } from "@/lib/reservation-types";
import { totalAmount } from "@/lib/money";

export const reservationPortalUrl = "https://www.miviatour.com/mi-reserva";

// The reservation confirmation is generated only from the immutable accepted version, and only while its
// price lines still add up to the reservation total (a mismatch means the record needs review first).
export async function renderReservationPdf(reservation: Reservation, items: ReservationItem[], payments: Payment[], invoices: Pick<Invoice, "estado" | "total" | "moneda">[] = []) {
  const snapshot = reservation.accepted_snapshot;
  if (!snapshot?.quotation || !snapshot.items?.length) throw new Error("La reserva no tiene una versión aceptada verificable.");
  if (totalAmount(snapshot.items) !== Number(reservation.total) || totalAmount(items) !== Number(reservation.total)) throw new Error("El total de la reserva no coincide con el documento aceptado.");
  return renderReservationConfirmationPdf(reservation, items, payments, invoices);
}
