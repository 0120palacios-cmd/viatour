// What Mi viaje may offer to add to a trip ("Mejore su viaje"), from what the reservation already holds.
// Pure, so the rules can be tested without a database. The rules, in order:
// - a cancelled trip offers nothing; a completed one only looks ahead (next flight, a custom trip);
// - nothing the traveller already bought is offered again (a booked car shows as "Su auto de alquiler");
// - during the trip, only what helps at the destination (tours, a car, transfers);
// - before it: flight only -> hotel, transfer, car, tours, insurance; flight and hotel -> transfer, car,
//   tours, insurance; no flight -> flights, transfer, tours, insurance, car;
// - a checked bag is offered when the fare does not include one.
// No prices, discounts or deadlines: each request goes to the advisor, who quotes it.

import type { ServiceView, TripView } from "@/lib/trip-view";

export const offerKeys = ["hotel", "traslado", "auto", "tour", "seguro", "equipaje", "vuelo", "a_medida"] as const;
export type OfferKey = (typeof offerKeys)[number];

type OfferInput = Pick<TripView, "stage" | "hasFlights" | "hotels" | "services" | "baggage" | "party">;

export function purchasedServices(view: Pick<TripView, "hasFlights" | "hotels" | "services">) {
  const kinds = new Set(view.services.map(service => service.kind));
  return {
    vuelo: view.hasFlights,
    hotel: view.hotels.length > 0,
    traslado: kinds.has("traslado"),
    tour: kinds.has("tour") || kinds.has("actividad"),
    seguro: kinds.has("seguro") || kinds.has("asistencia"),
    auto: kinds.has("auto"),
  };
}

// The car-rental services on the reservation, in date order (normally one).
export function carRentals(view: Pick<TripView, "services">): ServiceView[] {
  return view.services.filter(service => service.kind === "auto").sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}

export function isFamilyTrip(view: Pick<TripView, "party">) {
  return view.party.children + view.party.infants > 0;
}

// `pending`: services the traveller already asked for and that are still open: not offered again.
export function tripOffers(view: OfferInput, max = 5, pending: OfferKey[] = []): OfferKey[] {
  if (view.stage === "cancelled") return [];
  if (view.stage === "completed") return (["vuelo", "a_medida"] as OfferKey[]).filter(key => !pending.includes(key));
  const bought = purchasedServices(view);
  const checkedBagMissing = view.hasFlights && view.baggage.some(bag => bag.pieces.some(piece => piece.kind === "documentado" && (piece.state === "no_incluido" || piece.state === "con_cargo")));
  let order: OfferKey[];
  if (view.stage === "in_progress") order = ["tour", "auto", "traslado"];
  else if (!view.hasFlights) order = ["vuelo", "traslado", "tour", "seguro", "auto"];
  else order = [...(bought.hotel ? [] : ["hotel" as const]), "traslado", "auto", "tour", "seguro"];
  if (checkedBagMissing && view.stage !== "in_progress") order.splice(Math.min(2, order.length), 0, "equipaje");
  return order.filter(key => (!(key in bought) || !bought[key as keyof typeof bought]) && !pending.includes(key)).slice(0, max);
}
