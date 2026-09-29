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
  const sent = rows.filter(row => ["enviada", "aceptada", "rechazada", "expirada"].includes(String(row.estado))).length;
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
