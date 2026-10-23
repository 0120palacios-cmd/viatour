// The whole traveller model one Mi viaje page renders: the trip projection plus everything around it
// (destination photo and guide, photo credits, additional-service requests, feedback). Pure, so the customer
// portal (database), the admin preview and the local QA fixtures assemble it the same way.

import type { TripView } from "@/lib/trip-view";
import type { DestinationSuggestion, TripDestination } from "@/lib/trip-destination";
import { guideFor, type DestinationGuide } from "@/lib/destination-guides";
import { creditsFor, type PhotoCredit } from "@/lib/photo-credits";
import { serviceLabels, type RequestStatus } from "@/lib/trip-requests";
import type { OfferKey } from "@/lib/trip-offers";
import type { SupportRequest } from "@/lib/trip-chat";

export type TripImage = { src: string; alt: string } | null;
export type TripServiceRequest = { id: string; service: OfferKey; status: RequestStatus; createdAt: string };
export type LoadedTrip = {
  view: TripView; customerName: string; image: TripImage; hotelPhotos: Record<string, string>; reservationId: string;
  // destination / suggestions: published site content only (see trip-destination.ts).
  destination: TripDestination | null; suggestions: DestinationSuggestion[];
  // Curated "Qué hacer" guide (destination-guides.ts) and the credits of every licensed photo on the page.
  guide: DestinationGuide | null; credits: PhotoCredit[];
  requests: TripServiceRequest[]; feedback: { rating: number } | null;
  today: string;
};

type Base = Omit<LoadedTrip, "guide" | "credits" | "requests" | "feedback" | "image"> & { photo: string | null; requests?: TripServiceRequest[]; feedback?: { rating: number } | null };

export function assembleTrip(base: Base): LoadedTrip {
  const { photo, ...rest } = base;
  const guide = guideFor(base.view.destination);
  // The guide's own hero photo first (it has a written description), then the published destination photo.
  const hero = guide?.hero?.image ?? photo;
  const alt = guide?.hero && hero === guide.hero.image ? guide.hero.alt.es : base.view.destination;
  return {
    ...rest,
    image: hero ? { src: hero, alt } : null,
    guide,
    credits: creditsFor([hero, ...(guide?.highlights.map(item => item.image) ?? [])]),
    requests: base.requests ?? [],
    feedback: base.feedback ?? null,
  };
}

// The services with a request still open (anything but closed), so they are not offered again.
export const pendingServices = (trip: Pick<LoadedTrip, "requests">) => trip.requests.filter(request => request.status !== "cerrada").map(request => request.service);

// Support requests that carry a Mi viaje service request (before trip_service_requests exists), read back
// as requests so the traveller sees what they asked for and its state.
const statusFromTicket: Record<string, RequestStatus> = { abierto: "nueva", en_revision: "en_cotizacion", resuelto: "cerrada", cerrado: "cerrada" };
export function requestsFromTickets(tickets: SupportRequest[]): TripServiceRequest[] {
  const byLabel = new Map(Object.entries(serviceLabels).map(([key, label]) => [`Solicitud de servicio: ${label}`, key as OfferKey]));
  return tickets.flatMap(ticket => {
    const service = byLabel.get(ticket.asunto);
    return service ? [{ id: ticket.id, service, status: statusFromTicket[ticket.estado] ?? "nueva", createdAt: ticket.created_at }] : [];
  });
}

export function feedbackFromTickets(tickets: SupportRequest[]): { rating: number } | null {
  const match = tickets.map(ticket => /^Opinión del viaje \(([1-5]) de 5\)$/.exec(ticket.asunto)).find(Boolean);
  return match ? { rating: Number(match[1]) } : null;
}
