import type { Tone } from "@/components/admin/ui";
import type { AdminQuotationStatus } from "@/lib/admin-quotation-status";
import type { InvoiceStatus, ReservationStatus } from "@/lib/reservation-types";

// One place that decides how each record state reads and looks across the admin.

export const quotationTone: Record<AdminQuotationStatus, Tone> = { borrador: "muted", enviada: "info", aceptada: "success", rechazada: "danger", expirada: "muted", reemplazada: "muted" };
export const reservationTone: Record<ReservationStatus, Tone> = { pendiente: "neutral", confirmada: "info", en_curso: "info", completada: "success", cancelada: "danger" };
export const invoiceTone: Record<InvoiceStatus, Tone> = { borrador: "muted", emitida: "info", pagada: "success", anulada: "danger" };

export const ticketStatuses = ["abierto", "en_revision", "resuelto", "cerrado"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];
export const ticketStatusLabels: Record<TicketStatus, string> = { abierto: "Abierta", en_revision: "En revisión", resuelto: "Resuelta", cerrado: "Cerrada" };
export const ticketTone: Record<TicketStatus, Tone> = { abierto: "info", en_revision: "neutral", resuelto: "success", cerrado: "muted" };
export const openTicketStatuses: TicketStatus[] = ["abierto", "en_revision"];

export const reviewStatuses = ["pendiente", "aprobada", "rechazada", "despublicada"] as const;
export const reviewStatusLabels: Record<string, string> = { pendiente: "Pendiente", aprobada: "Aprobada", rechazada: "Rechazada", despublicada: "Despublicada" };

export function ticketLabel(value: string) { return ticketStatusLabels[value as TicketStatus] ?? value; }
export function ticketToneOf(value: string): Tone { return ticketTone[value as TicketStatus] ?? "neutral"; }
