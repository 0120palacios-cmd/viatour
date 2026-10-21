// Where a trip stands in time (Mi viaje countdown and trip stages; the next step lives in trip-view.ts).
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
