// Dates, clock times and durations for the traveller surfaces (portal, itinerary PDF, email).
// Dates are calendar days ("2026-11-18") and times are local clock times printed on the ticket, so both
// are formatted at noon UTC / as plain clock values: never shifted by the reader's or server's zone.

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const intlLocale = (locale: string) => (locale === "en" ? "en-US" : "es-HN");
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);

export type DateStyle = "full" | "long" | "medium" | "short" | "weekday" | "dayMonth";

export function formatTripDate(date: string | null | undefined, locale = "es", style: DateStyle = "long") {
  if (!date || !datePattern.test(date)) return "";
  const styles: Record<DateStyle, Intl.DateTimeFormatOptions> = {
    full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    short: { day: "numeric", month: "short" },
    weekday: { weekday: "long", day: "numeric", month: "long" },
    dayMonth: { day: "numeric", month: "long" },
  };
  const options = styles[style];
  const text = new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: "UTC" }).format(atNoon(date));
  return locale === "en" ? text : text.replace(/\.(?=\s|$)/g, "");
}

// "18 – 23 de noviembre de 2026", "28 de noviembre – 3 de diciembre de 2026", or a single day.
export function formatDateRange(start: string | null | undefined, end: string | null | undefined, locale = "es") {
  if (!start || !datePattern.test(start)) return "";
  if (!end || !datePattern.test(end) || end === start) return formatTripDate(start, locale, "long");
  const format = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return format.formatRange(atNoon(start), atNoon(end)).replace(/\s?–\s?/, " – ");
}

// "8:30 a. m." / "8:30 AM": the clock value as written, never converted between zones.
export function formatClock(time: string | null | undefined, locale = "es") {
  const match = time ? timePattern.exec(time) : null;
  if (!match) return "";
  const date = new Date(Date.UTC(2000, 0, 1, Number(match[1]), Number(match[2])));
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(date).replace(/ | /g, " ");
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return "";
  const hours = Math.floor(minutes / 60), rest = Math.round(minutes % 60);
  return hours ? `${hours} h${rest ? ` ${String(rest).padStart(2, "0")} min` : ""}` : `${rest} min`;
}

export function formatAmount(amount: number, currency: "USD" | "HNL") {
  const number = new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${currency === "USD" ? "US$" : "L"} ${number}`;
}

export function firstName(fullName: string | null | undefined) {
  return (fullName ?? "").trim().split(/\s+/)[0] ?? "";
}

export function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
