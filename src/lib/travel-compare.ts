import { emptyTravel, legalName, ticketingLabels, validateTravel, type PublicTravel, type TravelOperations } from "@/lib/travel-operations";
import { validatePassengerCounts } from "@/lib/passenger-counts";

export const issuanceRank = { pendiente: 0, en_emision: 1, emitida: 2 } as const;

// When the encrypted copy is behind what the traveller sees (an issuance recorded outside this form),
// start from the visible issuance and tickets, so saving brings both copies together instead of
// taking them back. Passengers and their private data always come from the encrypted copy.
export function reconcile(initial: TravelOperations | null, visible: PublicTravel | null) {
  const base = initial ?? emptyTravel();
  if (!visible || issuanceRank[visible.status] < issuanceRank[base.status] || (visible.status === base.status && visible.tickets.length <= base.tickets.length)) return { value: base, behind: false };
  return { value: { ...base, status: visible.status, tickets: visible.tickets.map(t => ({ ...t })), confirmedAt: visible.confirmedAt || base.confirmedAt, estimateApproved: visible.estimateApproved, estimateMinHours: visible.estimateMinHours ?? base.estimateMinHours, estimateMaxHours: visible.estimateMaxHours ?? base.estimateMaxHours, reviewed: visible.reviewed || base.reviewed }, behind: true };
}

export type CopyComparison = {
  rows: { label: string; admin: string; customer: string; same: boolean }[];
  inSync: boolean;
  // What pressing "Guardar expediente revisado" would do right now, without saving anything.
  save: { ok: true } | { ok: false; reason: string };
};

const listOf = (values: string[]) => values.length ? values.join(", ") : "Ninguno";

// Read-only comparison of the encrypted passenger file (what the admin edits) with the copy the traveller sees
// in Mi viaje. Passenger names are compared by id; ticket numbers and the passenger each points to are shown.
export function compareTravelCopies(privateData: TravelOperations | null, visible: PublicTravel | null, departure: string | null, details: unknown): CopyComparison {
  const admin = privateData ?? emptyTravel();
  const customer = visible ?? { passengers: [], tickets: [], status: "pendiente" as const, confirmedAt: "", estimateApproved: false, reviewed: false };
  const names = new Map([...customer.passengers, ...admin.passengers].map(p => [p.id, legalName(p) || p.id]));
  // Tickets point to passengers by id, so passengers match only when their ids do; the ids are shown when they differ.
  const key = (values: string[]) => [...values].sort().join("|");
  const samePassengers = key(admin.passengers.map(p => p.id)) === key(customer.passengers.map(p => p.id));
  const passengers = (list: { id: string }[]) => listOf(list.map(p => samePassengers ? names.get(p.id) ?? p.id : `${names.get(p.id) ?? p.id} (id ${p.id})`));
  const tickets = (list: { number: string; passengerId: string }[]) => listOf(list.map(t => `${t.number || "sin número"} → ${names.get(t.passengerId) ?? "?"} (id ${t.passengerId})`));
  const ticketKey = (list: { number: string; passengerId: string }[]) => key(list.map(t => `${t.number}>${t.passengerId}`));
  const rows = [
    { label: "Emisión", admin: ticketingLabels[admin.status], customer: ticketingLabels[customer.status], same: admin.status === customer.status },
    { label: "Pasajeros", admin: passengers(admin.passengers), customer: passengers(customer.passengers), same: samePassengers },
    { label: "Boletos", admin: tickets(admin.tickets), customer: tickets(customer.tickets), same: ticketKey(admin.tickets) === ticketKey(customer.tickets) },
  ];
  let save: CopyComparison["save"] = { ok: true };
  try {
    const next = validateTravel(reconcile(privateData, visible).value, departure);
    validatePassengerCounts(next, details);
  } catch (error) { save = { ok: false, reason: error && typeof error === "object" && "message" in error ? String(error.message) : "El expediente no pasaría la validación." }; }
  return { rows, inSync: rows.every(row => row.same), save };
}
