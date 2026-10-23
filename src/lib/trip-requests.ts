// Additional-service requests and private feedback from Mi viaje. Pure validation and wording, shared by
// the customer routes, the admin pages and the tests.
//
// Store: trip_service_requests / trip_feedback (docs/sql/mi_viaje_premium.sql). Until that SQL is applied,
// the routes write the same content as a support request (support_tickets), which staff already see in
// /admin/tickets and on the reservation, so no request is ever lost.

import { offerKeys, type OfferKey } from "@/lib/trip-offers";

export const requestStatuses = ["nueva", "en_cotizacion", "cotizada", "confirmada", "cerrada"] as const;
export type RequestStatus = (typeof requestStatuses)[number];
export const requestStatusLabels: Record<RequestStatus, string> = { nueva: "Nueva", en_cotizacion: "En cotización", cotizada: "Cotizada", confirmada: "Confirmada", cerrada: "Cerrada" };
// Spanish service names for staff (admin, email notice, support-request subject).
export const serviceLabels: Record<OfferKey, string> = { hotel: "Hotel", traslado: "Traslado", auto: "Auto de alquiler", tour: "Tours y excursiones", seguro: "Seguro de viaje", equipaje: "Equipaje adicional", vuelo: "Vuelos", a_medida: "Viaje a medida" };

export const requestNoteMaxLength = 600;
export const feedbackCommentMaxLength = 1000;
const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function validateServiceRequest(input: { service: unknown; note: unknown }): { service: OfferKey; note: string } | null {
  const service = typeof input.service === "string" && (offerKeys as readonly string[]).includes(input.service) ? input.service as OfferKey : null;
  const note = typeof input.note === "string" ? input.note.replace(/\r\n/g, "\n").trim() : input.note === undefined || input.note === null ? "" : null;
  if (!service || note === null || note.length > requestNoteMaxLength || control.test(note)) return null;
  return { service, note };
}

export function validateFeedback(input: { rating: unknown; comment: unknown }): { rating: number; comment: string } | null {
  const rating = typeof input.rating === "number" ? input.rating : typeof input.rating === "string" && /^[1-5]$/.test(input.rating) ? Number(input.rating) : NaN;
  const comment = typeof input.comment === "string" ? input.comment.replace(/\r\n/g, "\n").trim() : input.comment === undefined || input.comment === null ? "" : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment === null || comment.length > feedbackCommentMaxLength || control.test(comment)) return null;
  return { rating, comment };
}

export type RequestContext = { code: string; destination: string; start: string | null; end: string | null; travelers: number };

// The support-request (fallback) and email text: everything staff need without opening the reservation.
export function serviceRequestText(service: OfferKey, note: string, context: RequestContext) {
  return [
    `Solicitud desde Mi viaje: ${serviceLabels[service]}`,
    `Reserva: ${context.code}`,
    `Destino: ${context.destination || "sin destino"}`,
    `Fechas del viaje: ${[context.start, context.end].filter(Boolean).join(" a ") || "por confirmar"}`,
    `Viajeros: ${context.travelers || "por confirmar"}`,
    note ? `\nNota del cliente:\n${note}` : "",
  ].filter(Boolean).join("\n");
}

export function feedbackText(rating: number, comment: string, code: string) {
  return [`Opinión privada del viaje desde Mi viaje`, `Reserva: ${code}`, `Calificación del servicio: ${rating} de 5`, comment ? `\nComentario:\n${comment}` : ""].filter(Boolean).join("\n");
}
