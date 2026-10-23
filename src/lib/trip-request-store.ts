import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { missingTable } from "@/lib/reservation-messages";
import { feedbackText, serviceLabels, serviceRequestText, type RequestContext } from "@/lib/trip-requests";
import type { OfferKey } from "@/lib/trip-offers";
import { captureNotificationFailure, sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";
import { clientIP } from "@/lib/public-security";
import { hondurasToday, tripTiming } from "@/lib/portal-summary";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export type ReservationContext = RequestContext & { estado: string; canGiveFeedback: boolean };

// What staff need with each request, read on the server for the session's reservation only.
export async function reservationContext(client: SupabaseClient, reservationId: string): Promise<ReservationContext | null> {
  const result = await client.from("reservations").select("codigo,destino,estado,fecha_inicio,fecha_fin,pasajeros:accepted_snapshot->quotation->detalles->pasajeros").eq("id", reservationId).maybeSingle();
  if (result.error || !result.data) return null;
  const row = result.data as { codigo: string; destino: string; estado: string; fecha_inicio: string | null; fecha_fin: string | null; pasajeros: { adultos?: number; ninos?: number; infantes?: number } | null };
  const party = row.pasajeros ?? {};
  const timing = tripTiming(row.fecha_inicio, row.fecha_fin, hondurasToday());
  // Feedback about the service opens on the last day of the trip and stays open afterwards.
  const lastDay = row.fecha_fin && row.fecha_fin <= hondurasToday();
  return {
    code: row.codigo, destination: row.destino, start: row.fecha_inicio, end: row.fecha_fin, estado: row.estado,
    travelers: [party.adultos, party.ninos, party.infantes].reduce<number>((sum, value) => sum + (Number(value) || 0), 0),
    canGiveFeedback: row.estado !== "cancelada" && (row.estado === "completada" || timing.kind === "ended" || Boolean(lastDay)),
  };
}

export async function underLimit(client: SupabaseClient, request: Request, route: string, reservationId: string, max: number, windowSeconds = 3600) {
  const keys = [`/mi-reserva:${route}:reservation:${hash(reservationId)}`, `/mi-reserva:${route}:ip:${hash(clientIP(request))}`];
  const results = await Promise.all(keys.map((key, index) => client.rpc("hit_rate_limit", { p_key: key, p_max: index === 0 ? max : max * 2, p_window_seconds: windowSeconds })));
  return results.every(result => !result.error && result.data === true);
}

async function notify(idempotencyKey: string, subject: string, text: string, kind: string, reference: string) {
  try {
    await sendResendEmail({ idempotencyKey, from: siteConfig.supportEmail, to: [siteConfig.supportEmail], subject, text });
  } catch (error) {
    captureNotificationFailure(kind, reference, error);
  }
}

// The service request as an operational record: its own table when applied, else a support request.
export async function storeServiceRequest(client: SupabaseClient, reservationId: string, context: ReservationContext, service: OfferKey, note: string): Promise<{ id: string; store: "requests" | "tickets" } | null> {
  const inserted = await client.from("trip_service_requests").insert({ reservation_id: reservationId, service, note, destination: context.destination.slice(0, 160), trip_start: context.start, trip_end: context.end, travelers: Math.min(99, context.travelers) }).select("id").single();
  let saved: { id: string; store: "requests" | "tickets" } | null = null;
  if (!inserted.error && inserted.data) saved = { id: String(inserted.data.id), store: "requests" };
  else if (missingTable(inserted.error)) {
    const ticket = await client.from("support_tickets").insert({ reservation_id: reservationId, asunto: `Solicitud de servicio: ${serviceLabels[service]}`.slice(0, 160), mensaje: serviceRequestText(service, note, context).slice(0, 4000), estado: "abierto" }).select("id").single();
    if (!ticket.error && ticket.data) saved = { id: String(ticket.data.id), store: "tickets" };
  }
  if (!saved) return null;
  await notify(`trip-service-request/${saved.id}`, `Solicitud de servicio: ${serviceLabels[service]} | ${context.code}`, `${serviceRequestText(service, note, context)}\n\nVer en: ${siteConfig.url}/admin/reservas/${reservationId}#solicitudes`, "trip_service_request", saved.id);
  return saved;
}

// Private feedback: one per reservation (a second submission replaces the first), else a support request.
export async function storeFeedback(client: SupabaseClient, reservationId: string, context: ReservationContext, rating: number, comment: string): Promise<{ id: string; store: "feedback" | "tickets" } | null> {
  const upserted = await client.from("trip_feedback").upsert({ reservation_id: reservationId, rating, comment, updated_at: new Date().toISOString() }, { onConflict: "reservation_id" }).select("id").single();
  let saved: { id: string; store: "feedback" | "tickets" } | null = null;
  if (!upserted.error && upserted.data) saved = { id: String(upserted.data.id), store: "feedback" };
  else if (missingTable(upserted.error)) {
    const ticket = await client.from("support_tickets").insert({ reservation_id: reservationId, asunto: `Opinión del viaje (${rating} de 5)`, mensaje: feedbackText(rating, comment, context.code).slice(0, 4000), estado: "abierto" }).select("id").single();
    if (!ticket.error && ticket.data) saved = { id: String(ticket.data.id), store: "tickets" };
  }
  if (!saved) return null;
  await notify(`trip-feedback/${saved.id}/${rating}`, `Opinión privada del viaje (${rating} de 5) | ${context.code}`, `${feedbackText(rating, comment, context.code)}\n\nVer en: ${siteConfig.url}/admin/reservas/${reservationId}#solicitudes`, "trip_feedback", saved.id);
  return saved;
}
