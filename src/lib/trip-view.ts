// One customer-facing view of a reservation: what the traveller sees in Mi viaje, the admin client
// preview, the itinerary PDF and the itinerary email. Pure (no database, no server-only), so every
// surface renders the same projection and the rules can be tested without a database.
//
// Only public-safe data enters here: the accepted quotation's services, the public travel projection
// (names and categories, never documents, birth dates or contacts), registered payments and receipts,
// and document metadata. Internal notes, costs, commission and unit prices never reach this module.

import { componentTitle, expandedDetails, nights, sanitizeDetails, type BaggageState, type QuotationDetails } from "@/lib/quotation-details";
import { travelServices } from "@/lib/travel-services";
import { dayDifference, isOvernightConnection, layoverMinutes, segmentDuration, journeyDuration, type FlightJourney, type FlightSegment } from "@/lib/flight-itinerary";
import { airportInfo } from "@/lib/flight-reference";
import { legalName, type PublicTravel } from "@/lib/travel-operations";
import { tripTiming, type TripTiming } from "@/lib/portal-summary";
import type { StoredDocument } from "@/lib/portal-documents";

export type TripStage = "cancelled" | "completed" | "in_progress" | "ready" | "ticketing" | "confirmed" | "registered" | "prereserved";
export type MilestoneState = "done" | "current" | "upcoming";
export type NextStepKey = "cancelled" | "completed" | "inProgress" | "balance" | "travelersReview" | "awaitingConfirmation" | "awaitingTickets" | "ticketing" | "awaitingDocuments" | "readySoon" | "ready";

export type Place = { code: string; city: string; airport: string };
export type FlightLeg = {
  id: string; airline: string; flight: string; operatedBy: string; aircraft: string; cabin: string; bookingClass: string;
  from: Place & { date: string; time: string }; to: Place & { date: string; time: string };
  durationMin: number | null; dayShift: number;
};
export type Connection = { code: string; city: string; minutes: number | null; overnight: boolean; airportChange: boolean; nextCode: string };
export type JourneyView = {
  id: string; kind: "ida" | "regreso" | "tramo"; index: number;
  from: Place; to: Place; date: string; time: string; arriveDate: string; arriveTime: string;
  durationMin: number | null; stops: number; legs: FlightLeg[]; connections: Connection[]; airlines: string[];
};
export type HotelView = {
  id: string; name: string; city: string; address: string; checkIn: string; checkOut: string; nights: number;
  rooms: { count: number; category: string; beds: string; adults: number; children: number }[];
  mealPlan: string; included: string[]; mapQuery: string; photoPath: string;
};
export type FerryView = { id: string; operator: string; vessel: string; fromPort: string; toPort: string; date: string; time: string; arriveDate: string; arriveTime: string; className: string };
export type ServiceKind = "traslado" | "tour" | "actividad" | "seguro" | "asistencia" | "otro";
export type ServiceView = { id: string; kind: ServiceKind; title: string; description: string; date: string; time: string; endDate: string; place: string; duration: string; mode: string; operator: string; included: string[] };
export type TripEvent =
  | { kind: "flight"; date: string; time: string; journey: JourneyView }
  | { kind: "checkin" | "checkout"; date: string; time: string; hotel: HotelView }
  | { kind: "ferry"; date: string; time: string; ferry: FerryView }
  | { kind: "service"; date: string; time: string; service: ServiceView };
export type TimelineEntry = { type: "day"; date: string; dayNumber: number; events: TripEvent[] } | { type: "free"; from: string; to: string; days: number };

export type BaggagePieceView = { kind: "personal" | "mano" | "documentado"; state: BaggageState; pieces: number | null; weight: string; size: string };
export type BaggageView = { scope: string; pieces: BaggagePieceView[]; notes: string };
export type TravelerView = { id: string; name: string; category: "adulto" | "nino" | "infante"; pnr: string; ticketNumber: string; airline: string };
export type TicketState = "none" | "pending" | "processing" | "issued";

export type TripDocumentKey = "itinerary" | "confirmation" | "tickets" | "hotelVoucher" | "receipt" | "agency" | "customer";
export type TripDocument = { key: TripDocumentKey; status: "available" | "pending" | "processing"; title: string; date: string | null; ref: string };

export type TripFinance = { currency: "USD" | "HNL"; total: number; paid: number; balance: number; state: "paid" | "due" | "none"; otherCurrency: boolean; reservationTotal: number; adjusted: boolean };
export type TripReceipt = { id: string; number: string; date: string; amount: number; currency: "USD" | "HNL" };

export type TripInput = {
  reservation: {
    id: string; codigo: string; destino: string; estado: string; prerreserva?: boolean; supplier_status?: string | null;
    fecha_inicio: string | null; fecha_fin: string | null; moneda: "USD" | "HNL"; total: number;
  };
  details: unknown;
  travel: PublicTravel | null;
  payments: { monto: number | string; moneda: string; fecha_pago?: string | null }[];
  // Invoices with their agency status, newest first. Only used to pick the customer-facing total.
  invoices?: { estado: string; total: number | string; moneda: string }[];
  receipts: { id: string; number: string; created_at: string; snapshot: { amount: number; currency: "USD" | "HNL"; date: string } }[];
  documents: StoredDocument[];
  today: string;
};

export type TripView = ReturnType<typeof buildTripView>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const sortKey = (event: TripEvent) => `${event.date || "9999-99-99"} ${event.time || (event.kind === "checkout" ? "00:00" : event.kind === "checkin" ? "15:00" : "12:00")}`;

function place(code: string, written: string): Place {
  const info = airportInfo(code);
  return { code, city: info?.ciudad ?? written ?? code, airport: info?.nombre ?? written ?? "" };
}

function legView(segment: FlightSegment): FlightLeg {
  return {
    id: segment.id, airline: segment.aerolinea, flight: segment.vuelo, operatedBy: segment.operadoPor, aircraft: segment.aeronave, cabin: segment.cabina, bookingClass: segment.claseReserva,
    from: { ...place(segment.origen, segment.origenNombre), date: segment.salidaFecha, time: segment.salidaHora },
    to: { ...place(segment.destino, segment.destinoNombre), date: segment.llegadaFecha, time: segment.llegadaHora },
    durationMin: segmentDuration(segment), dayShift: Math.max(0, dayDifference(segment.salidaFecha, segment.llegadaFecha) ?? 0),
  };
}

export function journeyView(journey: FlightJourney, index: number): JourneyView | null {
  const segments = journey.segmentos;
  if (!segments.length) return null;
  const first = segments[0], last = segments[segments.length - 1];
  const connections = segments.slice(1).map((next, i): Connection => {
    const previous = segments[i];
    const minutes = layoverMinutes(previous, next);
    return { code: previous.destino, city: place(previous.destino, previous.destinoNombre).city, minutes, overnight: isOvernightConnection(previous, next, minutes), airportChange: Boolean(previous.destino && next.origen && previous.destino !== next.origen), nextCode: next.origen };
  });
  return {
    id: journey.id, kind: journey.tipo, index,
    from: place(first.origen, first.origenNombre), to: place(last.destino, last.destinoNombre),
    date: first.salidaFecha, time: first.salidaHora, arriveDate: last.llegadaFecha, arriveTime: last.llegadaHora,
    durationMin: journeyDuration(journey), stops: segments.length - 1, legs: segments.map(legView), connections,
    airlines: Array.from(new Set(segments.map(segment => segment.aerolinea.trim()).filter(Boolean))),
  };
}

function included(items: { nombre: string; estado: string; detalle: string }[]) {
  return items.filter(item => item.estado === "incluido").map(item => [item.nombre, item.detalle].filter(Boolean).join(": "));
}

function serviceKind(tipo: string): ServiceKind {
  return (["traslado", "tour", "actividad", "seguro", "asistencia"] as const).find(kind => kind === tipo) ?? "otro";
}

function baggageViews(details: ReturnType<typeof travelServices>): BaggageView[] {
  return details.equipaje.map(bag => ({
    scope: bag.alcance,
    pieces: (["personal", "mano", "documentado"] as const).map(kind => ({ kind, state: bag[kind].estado, pieces: bag[kind].piezas ?? null, weight: bag[kind].peso, size: bag[kind].medidas })),
    notes: [bag.notas, bag.adicional].filter(Boolean).join(" "),
  })).filter(bag => bag.pieces.some(piece => piece.state));
}

// Every dated service on its day; empty stretches between days become one "free time" entry instead of
// fake days. Services without a date are returned apart, never placed on an invented day.
export function buildTimeline(events: TripEvent[], start: string | null) {
  const dated = events.filter(event => datePattern.test(event.date)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const undated = events.filter(event => !datePattern.test(event.date));
  const first = start && datePattern.test(start) && (!dated[0] || start <= dated[0].date) ? start : dated[0]?.date;
  const entries: TimelineEntry[] = [];
  for (const event of dated) {
    const last = entries.at(-1);
    if (last?.type === "day" && last.date === event.date) { last.events.push(event); continue; }
    if (last?.type === "day") {
      const gap = (dayDifference(last.date, event.date) ?? 1) - 1;
      if (gap > 0) entries.push({ type: "free", from: addDay(last.date, 1), to: addDay(event.date, -1), days: gap });
    }
    entries.push({ type: "day", date: event.date, dayNumber: (dayDifference(first ?? event.date, event.date) ?? 0) + 1, events: [event] });
  }
  return { entries, undated };
}

function addDay(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Each customer statement needs the state that proves it: "confirmed" only with a supplier confirmation
// (a partial confirmation or the agency's own status is not enough), "ready" only with issued tickets (or,
// without flights, a supplier confirmation plus travel documents), and the dates only move a trip to
// "in progress" or "completed" once it was actually confirmed.
export function tripStage(input: { estado: string; prereservation?: boolean; supplierStatus: string; hasFlights: boolean; ticketing: TicketState; agencyDocuments: number; timing: TripTiming }): TripStage {
  const { estado, supplierStatus, hasFlights, ticketing, agencyDocuments, timing } = input;
  const supplierConfirmed = ["confirmada", "emitida"].includes(supplierStatus);
  if (estado === "cancelada") return "cancelled";
  if (estado === "completada") return "completed";
  if (estado === "en_curso") return "in_progress";
  if (input.prereservation) return "prereserved";
  if (supplierConfirmed && timing.kind === "ended") return "completed";
  if (supplierConfirmed && (timing.kind === "ongoing" || timing.kind === "today")) return "in_progress";
  if (hasFlights && ticketing === "issued" && supplierConfirmed) return "ready";
  if (!hasFlights && supplierConfirmed && agencyDocuments > 0) return "ready";
  if (hasFlights && ticketing === "processing") return "ticketing";
  if (supplierConfirmed) return "confirmed";
  return "registered";
}

// Four customer milestones: reservation registered, confirmed with suppliers, tickets (or travel
// documents) ready, and the trip itself. "d" done, "c" current, "u" upcoming.
const milestoneStates: Record<TripStage, string> = { prereserved: "dcuu", registered: "dcuu", confirmed: "ddcu", ticketing: "ddcu", ready: "dddu", in_progress: "dddc", completed: "dddd", cancelled: "duuu" };

export function milestones(stage: TripStage, hasFlights: boolean) {
  const keys = [stage === "prereserved" ? "prereserved" : "registered", "confirmed", hasFlights ? "tickets" : "documents", "trip"] as const;
  return keys.map((key, index) => ({ key, state: ({ d: "done", c: "current", u: "upcoming" } as const)[milestoneStates[stage][index] as "d" | "c" | "u"] satisfies MilestoneState }));
}

export function nextStepFor(input: { stage: TripStage; balance: number; travelersReviewed: boolean; hasFlights: boolean; timing: TripTiming }): NextStepKey {
  const { stage, balance, travelersReviewed, hasFlights, timing } = input;
  if (stage === "cancelled") return "cancelled";
  if (stage === "completed") return "completed";
  if (stage === "in_progress") return "inProgress";
  if (balance > 0) return "balance";
  if (!travelersReviewed) return "travelersReview";
  if (stage === "registered" || stage === "prereserved") return "awaitingConfirmation";
  if (stage === "ticketing") return "ticketing";
  if (stage === "confirmed") return hasFlights ? "awaitingTickets" : "awaitingDocuments";
  return timing.kind === "upcoming" && timing.days <= 7 ? "readySoon" : "ready";
}

export function buildTripView(input: TripInput) {
  const { reservation, travel, today } = input;
  const original: QuotationDetails = sanitizeDetails(input.details);
  const services = travelServices(input.details);
  const expanded = expandedDetails(original);
  const journeys = services.vuelos.journeys.map(journeyView).filter((journey): journey is JourneyView => journey !== null);
  const hasFlights = journeys.length > 0;

  const hotels: HotelView[] = expanded.hoteles.filter(hotel => hotel.nombre || hotel.checkIn).map(hotel => ({
    id: hotel.id, name: hotel.nombre, city: hotel.destino, address: hotel.direccion, checkIn: hotel.checkIn, checkOut: hotel.checkOut, nights: nights(hotel.checkIn, hotel.checkOut),
    rooms: hotel.habitaciones.map(room => ({ count: room.cantidad, category: room.categoria, beds: room.camas, adults: room.adultos, children: room.ninos })),
    mealPlan: hotel.planComidas, included: hotel.inclusionesConfirmadas ? included(hotel.inclusiones) : [],
    mapQuery: [hotel.nombre, hotel.direccion, hotel.destino].filter(Boolean).join(", "), photoPath: hotel.fotos[0]?.path ?? "",
  }));
  const ferries: FerryView[] = expanded.ferry.legs.map(leg => ({ id: leg.id, operator: leg.operador, vessel: leg.embarcacion, fromPort: leg.origenPuerto, toPort: leg.destinoPuerto, date: leg.salidaFecha, time: leg.salidaHora, arriveDate: leg.llegadaFecha, arriveTime: leg.llegadaHora, className: expanded.ferry.clase }));
  const extras: ServiceView[] = [
    ...original.paquete.componentes.flatMap(component => component.servicio ? [{
      id: component.id, kind: serviceKind(component.tipo), title: componentTitle(component), description: component.servicio.descripcion !== componentTitle(component) ? component.servicio.descripcion : "", date: component.servicio.fecha, time: component.servicio.hora, endDate: component.servicio.fechaFin,
      place: component.servicio.lugar, duration: component.servicio.duracion, mode: component.servicio.modalidad, operator: component.servicio.operador,
      included: component.servicio.inclusionesConfirmadas ? included(component.servicio.inclusiones) : [],
    }] : []),
    // Older quotations list included services as free text: shown without a date.
    ...original.servicios.filter(service => service.descripcion).map(service => ({ id: service.id, kind: serviceKind(service.tipo.toLowerCase()), title: service.tipo || service.descripcion, description: service.tipo ? service.descripcion : "", date: "", time: "", endDate: "", place: "", duration: "", mode: "", operator: "", included: [] })),
  ];

  const events: TripEvent[] = [
    ...journeys.map(journey => ({ kind: "flight" as const, date: journey.date, time: journey.time, journey })),
    ...hotels.flatMap(hotel => [{ kind: "checkin" as const, date: hotel.checkIn, time: "", hotel }, ...(hotel.checkOut ? [{ kind: "checkout" as const, date: hotel.checkOut, time: "", hotel }] : [])]),
    ...ferries.map(ferry => ({ kind: "ferry" as const, date: ferry.date, time: ferry.time, ferry })),
    ...extras.map(service => ({ kind: "service" as const, date: service.date, time: service.time, service })),
  ];
  const timeline = buildTimeline(events, reservation.fecha_inicio);

  const reviewed = Boolean(travel?.reviewed);
  const travelers: TravelerView[] = reviewed && travel ? travel.passengers.map(passenger => {
    const ticket = travel.tickets.find(item => item.passengerId === passenger.id);
    return { id: passenger.id, name: legalName(passenger), category: passenger.category, pnr: ticket?.pnr ?? "", ticketNumber: travel.status === "emitida" ? ticket?.number ?? "" : "", airline: ticket?.airline ?? "" };
  }) : [];
  const ticketing: TicketState = !hasFlights ? "none" : travel?.status === "emitida" ? "issued" : travel?.status === "en_emision" ? "processing" : "pending";
  const counted = original.pasajeros.adultos + original.pasajeros.ninos + original.pasajeros.infantes;

  const paid = Math.round(input.payments.filter(payment => payment.moneda === reservation.moneda).reduce((cents, payment) => cents + Math.round(Number(payment.monto) * 100), 0)) / 100;
  // Same rule as the recovered portal: once an invoice in the reservation currency is marked paid, its total
  // is what the customer owes (it may differ from the accepted total after an agreed adjustment).
  const reservationTotal = Number(reservation.total) || 0;
  const paidInvoice = (input.invoices ?? []).find(invoice => invoice.estado === "pagada" && invoice.moneda === reservation.moneda);
  const total = paidInvoice ? Number(paidInvoice.total) || 0 : reservationTotal;
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  const finance: TripFinance = { currency: reservation.moneda, total, paid, balance, state: total <= 0 ? "none" : balance <= 0 ? "paid" : "due", otherCurrency: input.payments.some(payment => payment.moneda !== reservation.moneda), reservationTotal, adjusted: Math.round(total * 100) !== Math.round(reservationTotal * 100) };
  const receipts: TripReceipt[] = input.receipts.map(receipt => ({ id: receipt.id, number: receipt.number, date: receipt.snapshot.date || receipt.created_at.slice(0, 10), amount: Number(receipt.snapshot.amount), currency: receipt.snapshot.currency }));

  const agencyDocuments = input.documents.filter(document => document.source === "agency");
  const customerDocuments = input.documents.filter(document => document.source === "customer");
  const timing = tripTiming(reservation.fecha_inicio, reservation.fecha_fin, today);
  const stage = tripStage({ estado: reservation.estado, prereservation: Boolean(reservation.prerreserva), supplierStatus: reservation.supplier_status ?? "pendiente", hasFlights, ticketing, agencyDocuments: agencyDocuments.length, timing });
  const cancelled = stage === "cancelled";

  const documents: TripDocument[] = [];
  // A cancelled trip keeps its receipts and shared files, but no itinerary or confirmation is offered.
  if (events.length && !cancelled) documents.push({ key: "itinerary", status: reviewed ? "available" : "processing", title: "", date: null, ref: "" });
  if (input.details && !cancelled) documents.push({ key: "confirmation", status: reservation.prerreserva ? "pending" : "available", title: "", date: null, ref: "" });
  if (hasFlights && !cancelled) documents.push({ key: "tickets", status: ticketing === "issued" ? "available" : ticketing === "processing" ? "processing" : "pending", title: "", date: null, ref: "" });
  if (hotels.length && !cancelled && !agencyDocuments.length) documents.push({ key: "hotelVoucher", status: "pending", title: "", date: null, ref: "" });
  for (const receipt of receipts) documents.push({ key: "receipt", status: "available", title: receipt.number, date: receipt.date, ref: receipt.id });
  for (const document of agencyDocuments) documents.push({ key: "agency", status: "available", title: document.name, date: document.createdAt, ref: document.path });

  const firstJourney = journeys[0];
  return {
    reference: reservation.codigo,
    destination: reservation.destino,
    origin: firstJourney ? firstJourney.from : null,
    start: reservation.fecha_inicio, end: reservation.fecha_fin,
    tripDays: reservation.fecha_inicio && reservation.fecha_fin ? (dayDifference(reservation.fecha_inicio, reservation.fecha_fin) ?? 0) + 1 : 0,
    travelerCount: travelers.length || counted,
    prereservation: Boolean(reservation.prerreserva),
    stage, timing, milestones: milestones(stage, hasFlights),
    nextStep: nextStepFor({ stage, balance: finance.balance, travelersReviewed: reviewed, hasFlights, timing }),
    estimate: travel?.estimateApproved && ticketing === "processing" ? { min: travel.estimateMinHours ?? 24, max: travel.estimateMaxHours ?? 48 } : null,
    hasFlights, ticketing, travelersReviewed: reviewed,
    supplierConfirmed: ["confirmada", "emitida"].includes(reservation.supplier_status ?? ""),
    journeys, hotels, ferries, services: extras,
    timeline: timeline.entries, undated: timeline.undated,
    baggage: baggageViews(services), separateTickets: services.vuelos.boletosSeparados,
    travelers, finance, receipts, documents, customerDocuments,
  };
}

// The view of a stored reservation for documents that show no money (itinerary PDF, itinerary email).
export function reservationTripView(r: { id: string; codigo: string; destino: string; estado: string; prerreserva?: boolean; supplier_status?: string | null; fecha_inicio: string | null; fecha_fin: string | null; moneda: "USD" | "HNL"; accepted_snapshot?: { quotation?: { detalles?: unknown } } | null }, travel: PublicTravel | null, today: string) {
  return buildTripView({
    reservation: { id: r.id, codigo: r.codigo, destino: r.destino, estado: r.estado, prerreserva: r.prerreserva, supplier_status: r.supplier_status, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, moneda: r.moneda, total: 0 },
    details: r.accepted_snapshot?.quotation?.detalles ?? null, travel, payments: [], receipts: [], documents: [], today,
  });
}

// "SAP – MIA · MIA – SAP": one route per journey, for subjects and compact summaries.
export function routeLabel(view: Pick<TripView, "journeys">) {
  return view.journeys.map(journey => `${journey.from.code} – ${journey.to.code}`).join(" · ");
}
