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
import { buildTripView, type TripView } from "@/lib/trip-view";

// Everything the traveller surfaces read for one reservation, in one round of parallel queries. Only
// customer-safe columns are selected: no internal notes, commission, agent, costs or private travel data.
const tripFields = "id,codigo,cliente_nombre,destino,moneda,total,estado,fecha_inicio,fecha_fin,prerreserva,supplier_status,accepted_snapshot";

export type TripImage = { src: string; alt: string } | null;
export type LoadedTrip = { view: TripView; customerName: string; image: TripImage; hotelPhotos: Record<string, string>; reservationId: string };

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
  const [reservationResult, travel, paymentsResult, receipts, documents, invoicesResult] = await Promise.all([
    client.from("reservations").select(tripFields).eq("id", reservationId).maybeSingle(),
    getTravel(client, reservationId),
    client.from("payments").select("monto,moneda,fecha_pago").eq("reservation_id", reservationId),
    getReceipts(client, reservationId),
    listReservationDocuments(client.storage.from(portalDocsBucket), reservationId).catch(() => []),
    client.from("invoices").select("estado,total,moneda").eq("reservation_id", reservationId).in("estado", ["emitida", "pagada"]).order("created_at", { ascending: false }),
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
    today: hondurasToday(),
  });

  // Hotel photos live in a private bucket: short-lived signed URLs, only for validated paths.
  const hotelPhotos: Record<string, string> = {};
  const paths = view.hotels.map(hotel => hotel.photoPath).filter(path => photoPathPattern.test(path));
  if (options.signHotelPhotos !== false && paths.length) {
    const signed = await client.storage.from(quotationMediaBucket).createSignedUrls(paths, 3600).catch(() => null);
    for (const item of signed?.data ?? []) if (item.path && item.signedUrl) hotelPhotos[item.path] = item.signedUrl;
  }

  const photo = destinationPhoto(reservation.destino);
  return { view, customerName: reservation.cliente_nombre, image: photo ? { src: photo, alt: reservation.destino } : null, hotelPhotos, reservationId: reservation.id };
}
