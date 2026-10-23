import "server-only";

import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTravel } from "@/lib/travel-data";
import { getReceipts } from "@/lib/receipt-data";
import { listReservationDocuments, portalDocsBucket } from "@/lib/portal-documents";
import { quotationMediaBucket } from "@/lib/quotation-media";
import { normalizePlace } from "@/lib/destination-match";
import { photoPathPattern } from "@/lib/quotation-details";
import { hondurasToday } from "@/lib/portal-summary";
import { buildTripView } from "@/lib/trip-view";
import { getDestinations } from "@/lib/destinations";
import { destinationContent } from "@/lib/trip-destination";
import { readThread } from "@/lib/reservation-messages";
import { getPortalTickets } from "@/lib/portal-data";
import { chatSummary, fromMessages, fromRequests, type ChatSummary } from "@/lib/trip-chat";
import { missingTable } from "@/lib/reservation-messages";
import { assembleTrip, feedbackFromTickets, requestsFromTickets, type LoadedTrip, type TripServiceRequest } from "@/lib/trip-model";
import type { RequestStatus } from "@/lib/trip-requests";
import type { OfferKey } from "@/lib/trip-offers";

// Everything the traveller surfaces read for one reservation, in one round of parallel queries. Only
// customer-safe columns are selected: no internal notes, commission, agent, costs or private travel data.
const tripFields = "id,codigo,cliente_nombre,destino,moneda,total,estado,fecha_inicio,fecha_fin,prerreserva,supplier_status,accepted_snapshot";

export type { LoadedTrip, TripImage } from "@/lib/trip-model";

// Published destination content; a failure only hides the destination block, never the trip.
export async function tripDestinationContent(destino: string) {
  try {
    return destinationContent(destino, await getDestinations());
  } catch {
    return { destination: null, suggestions: [] };
  }
}

let localDestinationPhotos: string[] | null = null;

// Real destination photos the site already publishes (public/destinos/<slug>.jpg). A destination
// without its own photo gets the tonal header instead of an unrelated stock image.
export function destinationPhoto(destination: string): string | null {
  try {
    localDestinationPhotos ??= readdirSync(join(process.cwd(), "public/destinos")).filter(file => /^[a-z0-9-]+\.jpg$/.test(file)).map(file => file.slice(0, -4));
  } catch {
    localDestinationPhotos = [];
  }
  const place = `-${normalizePlace(destination)}-`;
  const match = localDestinationPhotos.find(slug => place.includes(`-${slug}-`));
  return match ? `/destinos/${match}.jpg` : null;
}

export async function loadTrip(client: SupabaseClient, reservationId: string, options: { signHotelPhotos?: boolean } = {}): Promise<LoadedTrip | null> {
  const today = hondurasToday();
  const [reservationResult, travel, paymentsResult, receipts, documents, invoicesResult, extras] = await Promise.all([
    client.from("reservations").select(tripFields).eq("id", reservationId).maybeSingle(),
    getTravel(client, reservationId),
    client.from("payments").select("monto,moneda,fecha_pago").eq("reservation_id", reservationId),
    getReceipts(client, reservationId),
    listReservationDocuments(client.storage.from(portalDocsBucket), reservationId).catch(() => []),
    client.from("invoices").select("estado,total,moneda").eq("reservation_id", reservationId).in("estado", ["emitida", "pagada"]).order("created_at", { ascending: false }),
    loadRequestsAndFeedback(client, reservationId),
  ]);
  if (reservationResult.error || !reservationResult.data) return null;
  const reservation = reservationResult.data as unknown as {
    id: string; codigo: string; cliente_nombre: string; destino: string; moneda: "USD" | "HNL"; total: number; estado: string;
    fecha_inicio: string | null; fecha_fin: string | null; prerreserva: boolean | null; supplier_status: string | null;
    accepted_snapshot: { quotation?: { detalles?: unknown } } | null;
  };
  const view = buildTripView({
    reservation: { ...reservation, prerreserva: Boolean(reservation.prerreserva) },
    details: reservation.accepted_snapshot?.quotation?.detalles ?? null,
    travel: travel.data,
    payments: paymentsResult.error ? [] : paymentsResult.data ?? [],
    invoices: invoicesResult.error ? [] : invoicesResult.data ?? [],
    receipts,
    documents,
    today,
  });

  // Hotel photos live in a private bucket: short-lived signed URLs, only for validated paths.
  const hotelPhotos: Record<string, string> = {};
  const paths = view.hotels.map(hotel => hotel.photoPath).filter(path => photoPathPattern.test(path));
  if (options.signHotelPhotos !== false && paths.length) {
    const signed = await client.storage.from(quotationMediaBucket).createSignedUrls(paths, 3600).catch(() => null);
    for (const item of signed?.data ?? []) if (item.path && item.signedUrl) hotelPhotos[item.path] = item.signedUrl;
  }

  const content = await tripDestinationContent(reservation.destino);
  const photo = destinationPhoto(reservation.destino) ?? content.destination?.image ?? null;
  return assembleTrip({ view, customerName: reservation.cliente_nombre, photo, hotelPhotos, reservationId: reservation.id, ...content, ...extras, today });
}

// The traveller's additional-service requests and private feedback: their own tables when applied
// (docs/sql/mi_viaje_premium.sql), otherwise the support requests that carry them. Never fails the page.
export async function loadRequestsAndFeedback(client: SupabaseClient, reservationId: string): Promise<{ requests: TripServiceRequest[]; feedback: { rating: number } | null }> {
  try {
    const [requests, feedback] = await Promise.all([
      client.from("trip_service_requests").select("id,service,status,created_at").eq("reservation_id", reservationId).order("created_at", { ascending: false }).limit(20),
      client.from("trip_feedback").select("rating").eq("reservation_id", reservationId).maybeSingle(),
    ]);
    const needTickets = missingTable(requests.error) || missingTable(feedback.error);
    const tickets = needTickets ? await getPortalTickets(client, reservationId) : [];
    return {
      requests: missingTable(requests.error) ? requestsFromTickets(tickets) : (requests.data ?? []).map(row => ({ id: String(row.id), service: row.service as OfferKey, status: row.status as RequestStatus, createdAt: String(row.created_at) })),
      feedback: missingTable(feedback.error) ? feedbackFromTickets(tickets) : feedback.data ? { rating: Number(feedback.data.rating) } : null,
    };
  } catch {
    return { requests: [], feedback: null };
  }
}

// Latest message and unread count for the portal: the conversation table when it exists, otherwise the
// support requests that carry the conversation until then. A read failure shows an empty preview.
export async function loadChatSummary(client: SupabaseClient, reservationId: string): Promise<ChatSummary> {
  try {
    const thread = await readThread(client, reservationId);
    if (thread.available) return chatSummary("messages", fromMessages(thread.messages));
    return chatSummary("requests", fromRequests(await getPortalTickets(client, reservationId)));
  } catch {
    return chatSummary("messages", []);
  }
}
