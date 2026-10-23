import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { missingTable } from "@/lib/reservation-messages";
import type { RequestStatus } from "@/lib/trip-requests";
import type { OfferKey } from "@/lib/trip-offers";

export type AdminServiceRequest = { id: string; service: OfferKey; note: string; destination: string; trip_start: string | null; trip_end: string | null; travelers: number | null; status: RequestStatus; staff_note: string | null; created_at: string; updated_at: string | null };
export type AdminFeedback = { rating: number; comment: string; created_at: string; updated_at: string | null };

// What a reservation's traveller asked for from Mi viaje, read with the admin session (RLS: is_admin()).
// `available: false` until docs/sql/mi_viaje_premium.sql is applied; those requests are support requests.
export async function readTripRequests(client: SupabaseClient, reservationId: string): Promise<{ available: boolean; requests: AdminServiceRequest[]; feedback: AdminFeedback | null }> {
  const [requests, feedback] = await Promise.all([
    client.from("trip_service_requests").select("id,service,note,destination,trip_start,trip_end,travelers,status,staff_note,created_at,updated_at").eq("reservation_id", reservationId).order("created_at", { ascending: false }).limit(50),
    client.from("trip_feedback").select("rating,comment,created_at,updated_at").eq("reservation_id", reservationId).maybeSingle(),
  ]);
  if (missingTable(requests.error)) return { available: false, requests: [], feedback: null };
  return { available: !requests.error, requests: (requests.data ?? []) as AdminServiceRequest[], feedback: feedback.error ? null : (feedback.data as AdminFeedback | null) };
}

// The agency's Mi viaje work queue across reservations: new or in-progress requests, newest first.
export async function openTripRequests(client: SupabaseClient, limit = 8) {
  const result = await client.from("trip_service_requests").select("id,service,status,destination,created_at,reservation:reservations(id,codigo,cliente_nombre)").in("status", ["nueva", "en_cotizacion"]).order("created_at", { ascending: false }).limit(limit);
  if (result.error) return null;
  return (result.data ?? []) as unknown as { id: string; service: OfferKey; status: RequestStatus; destination: string; created_at: string; reservation: { id: string; codigo: string; cliente_nombre: string } | null }[];
}
