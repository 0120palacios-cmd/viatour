// What the customer sees first in Mi reserva: where the trip stands in time and the one next step.
// Pure functions so they can be tested without a database.

export type TripTiming = { kind: "upcoming"; days: number } | { kind: "today" } | { kind: "ongoing" } | { kind: "ended"; date: string } | { kind: "unknown" };
export type NextStep = "cancelled" | "balance" | "pending" | "documents" | "ready";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (value: string) => Math.round(Date.parse(`${value}T00:00:00Z`) / 86400000);

// Calendar day in Honduras, so "today" does not flip at UTC midnight (6 p.m. local).
export function hondurasToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function tripTiming(start: string | null, end: string | null, today: string): TripTiming {
  if (!start || !datePattern.test(start) || !datePattern.test(today)) return { kind: "unknown" };
  const days = dayNumber(start) - dayNumber(today);
  if (days > 0) return { kind: "upcoming", days };
  if (days === 0) return { kind: "today" };
  const last = end && datePattern.test(end) ? end : start;
  return dayNumber(last) >= dayNumber(today) ? { kind: "ongoing" } : { kind: "ended", date: last };
}

// One step, in priority order: a cancelled trip, money owed, confirmation, documents, then preparation.
export function nextStep({ status, balance, agencyDocuments }: { status: string; balance: number; agencyDocuments: number }): NextStep {
  if (status === "cancelada") return "cancelled";
  if (balance > 0) return "balance";
  if (status === "pendiente") return "pending";
  if (agencyDocuments === 0 && status !== "completada") return "documents";
  return "ready";
}
