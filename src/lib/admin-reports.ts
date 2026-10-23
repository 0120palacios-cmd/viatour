import { leadContact } from "@/lib/lead-admin";

type Row = Record<string, unknown>;
const day = 86400000;
const count = (values: string[]) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

// Where a lead came from, in the owner's words: campaign source, referring site, or direct.
export function leadSource(row: Row) {
  const origin = leadContact(row).origen;
  return origin.utm_source || origin.referrer || "Directo o sin datos";
}

export function summarizeLeads(rows: Row[], now = Date.now()) {
  const age = (row: Row) => now - new Date(String(row.created_at)).getTime();
  const recent = rows.filter(row => age(row) <= 30 * day);
  return {
    last7: rows.filter(row => age(row) <= 7 * day).length,
    last30: recent.length,
    byService: count(recent.map(row => String(row.servicio ?? "—"))),
    bySource: count(recent.map(leadSource)),
    won: recent.filter(row => row.estado === "ganado").length,
    lost: recent.filter(row => row.estado === "perdido").length,
    pending: recent.filter(row => row.estado === "nuevo").length,
  };
}

// Of the quotations that reached the customer, how many were accepted.
export function quotationFunnel(rows: Row[]) {
  const sent = rows.filter(row => ["enviada", "aceptada", "rechazada", "expirada", "reemplazada"].includes(String(row.estado))).length;
  const accepted = rows.filter(row => row.estado === "aceptada").length;
  return { total: rows.length, drafts: rows.filter(row => row.estado === "borrador").length, sent, accepted, rate: sent ? Math.round((accepted / sent) * 100) : 0 };
}

// Month totals per currency: reservations sold (excluding cancelled), net income recorded, payments received.
export function monthTotals(reservations: Row[], payments: Row[]) {
  const totals: Record<string, { sold: number; income: number; received: number; bookings: number }> = {};
  const bucket = (currency: unknown) => totals[String(currency || "USD")] ??= { sold: 0, income: 0, received: 0, bookings: 0 };
  for (const row of reservations) {
    if (row.estado === "cancelada") continue;
    const target = bucket(row.moneda);
    target.sold += Number(row.total) || 0; target.income += Number(row.comision) || 0; target.bookings += 1;
  }
  for (const row of payments) bucket(row.moneda).received += Number(row.monto) || 0;
  return totals;
}

export function formatAmount(amount: number, currency: string) {
  return `${currency === "HNL" ? "L" : "$"} ${new Intl.NumberFormat("es-HN", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

// ----- inicio: work queue -----

// Today's calendar day in Honduras (YYYY-MM-DD), plus an offset in days.
export function hondurasDay(now = new Date(), offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now.getTime() + offsetDays * day));
}

// What each reservation still owes, counting only payments in the reservation's own currency
// (the same rule as the reservation pages). Reservations with nothing owed are left out.
export function outstandingBalances(reservations: Row[], payments: Row[]) {
  const paid = new Map<string, number>();
  const currency = new Map(reservations.map(row => [String(row.id), String(row.moneda)]));
  for (const payment of payments) {
    const id = String(payment.reservation_id);
    if (currency.get(id) === String(payment.moneda)) paid.set(id, (paid.get(id) ?? 0) + (Number(payment.monto) || 0));
  }
  return reservations
    .filter(row => row.estado !== "cancelada")
    .map(row => ({ row, balance: Math.round(((Number(row.total) || 0) - (paid.get(String(row.id)) ?? 0)) * 100) / 100 }))
    .filter(entry => entry.balance > 0);
}

// Open quotations (draft or sent) whose validity ends within `hours`, soonest first. `expiryOf`
// returns the effective expiry so legacy date-only quotations are handled the same way.
export function expiringSoon(rows: Row[], expiryOf: (row: Row) => string, now = new Date(), hours = 48) {
  const limit = now.getTime() + hours * 3600000;
  return rows
    .filter(row => row.estado === "borrador" || row.estado === "enviada")
    .map(row => ({ row, expiry: expiryOf(row) }))
    .filter(entry => entry.expiry && Date.parse(entry.expiry) > now.getTime() && Date.parse(entry.expiry) <= limit)
    .sort((a, b) => Date.parse(a.expiry) - Date.parse(b.expiry));
}
