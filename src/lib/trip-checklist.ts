// "Próximos pasos": what is worth doing now, from the trip dates and what the reservation actually holds.
// Pure, so it can be tested without a database. Nothing is shown that does not apply: no check-in step
// without issued tickets, no airline check without an airline booking code, no baggage step without
// baggage data, and never a review request before the trip has ended (a gentle one only on its last day).
//
// Phases (days before the start date, Honduras calendar):
//   planning  more than 7 | week  5-7 | soon  2-4 | eve  1 | today | during | after

import type { TripView } from "@/lib/trip-view";

export type ChecklistPhase = "planning" | "week" | "soon" | "eve" | "today" | "during" | "after";
export type ChecklistKey =
  | "balance" | "names" | "passports" | "itinerary" | "requirements" | "documentsReady" | "baggage"
  | "airlineCheck" | "airlineApp" | "checkin" | "airport" | "travelDocs" | "flightDetails"
  | "destination" | "activities" | "support" | "feedback" | "review" | "share" | "referral" | "nextTrip";
// Where each step leads: a Mi viaje section, an outside page the portal already links, or nowhere.
export type ChecklistTarget = "travelers" | "itinerary" | "documents" | "destination" | "services" | "messages" | "requirements" | "airline" | "review" | "share" | "referral" | "next" | null;
export type ChecklistItem = { key: ChecklistKey; target: ChecklistTarget };

type ChecklistInput = Pick<TripView, "stage" | "timing" | "end" | "hasFlights" | "ticketing" | "travelersReviewed" | "confirmations" | "baggage" | "finance" | "journeys" | "hotels" | "services">;

const dayNumber = (value: string) => Math.round(Date.parse(`${value}T00:00:00Z`) / 86400000);

export function checklistPhase(view: Pick<TripView, "stage" | "timing">): ChecklistPhase | null {
  if (view.stage === "cancelled") return null;
  if (view.stage === "completed") return "after";
  if (view.stage === "in_progress") return view.timing.kind === "today" ? "today" : "during";
  const timing = view.timing;
  if (timing.kind === "today") return "today";
  if (timing.kind !== "upcoming") return timing.kind === "unknown" ? "planning" : null;
  if (timing.days <= 1) return "eve";
  if (timing.days <= 4) return "soon";
  if (timing.days <= 7) return "week";
  return "planning";
}

// The last day of a trip in progress: the moment for a light "¿cómo va su viaje?".
export function isLastTripDay(view: Pick<TripView, "stage" | "end">, today: string) {
  return view.stage === "in_progress" && Boolean(view.end) && /^\d{4}-\d{2}-\d{2}$/.test(view.end ?? "") && dayNumber(view.end!) - dayNumber(today) <= 0;
}

export function tripChecklist(view: ChecklistInput, options: { today: string; referral?: boolean }): { phase: ChecklistPhase | null; items: ChecklistItem[] } {
  const phase = checklistPhase(view);
  if (!phase) return { phase, items: [] };
  const issued = view.hasFlights && view.ticketing === "issued";
  const hasItinerary = view.journeys.length + view.hotels.length + view.services.length > 0;
  const hasBaggage = view.hasFlights && view.baggage.length > 0;
  const step = (key: ChecklistKey, target: ChecklistTarget, when = true): ChecklistItem[] => when ? [{ key, target }] : [];
  const balance = step("balance", "documents", view.finance.balance > 0 && phase !== "after");
  const items: Record<ChecklistPhase, ChecklistItem[]> = {
    planning: [...step("names", "travelers", view.travelersReviewed), ...step("passports", null), ...step("itinerary", "itinerary", hasItinerary), ...step("requirements", "requirements")],
    week: [...step("documentsReady", null), ...step("requirements", "requirements"), ...step("baggage", "itinerary", hasBaggage), ...step("itinerary", "itinerary", hasItinerary)],
    soon: [...step("airlineCheck", "airline", issued && view.confirmations.length > 0), ...step("airlineApp", null, view.hasFlights), ...step("documentsReady", null), ...step("baggage", "itinerary", hasBaggage)],
    eve: [...step("checkin", "airline", issued), ...step("travelDocs", null), ...step("airport", null, view.hasFlights)],
    today: [...step("flightDetails", "itinerary", view.hasFlights), ...step("travelDocs", null), ...step("support", "messages")],
    during: [...step("feedback", "review", isLastTripDay(view, options.today)), ...step("destination", "destination"), ...step("activities", "services"), ...step("support", "messages")],
    after: [...step("review", "review"), ...step("share", "share"), ...step("referral", "referral", Boolean(options.referral)), ...step("nextTrip", "next")],
  };
  return { phase, items: [...balance, ...items[phase]].slice(0, 5) };
}
