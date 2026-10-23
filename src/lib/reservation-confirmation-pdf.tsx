/* eslint-disable jsx-a11y/alt-text -- react-pdf Image is not an HTML image and has no alt prop. */
import "server-only";

import { Document, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { sanitizeDetails } from "@/lib/quotation-details";
import type { Invoice, Payment, Reservation, ReservationItem } from "@/lib/reservation-types";
import { buildTripView, type TripView } from "@/lib/trip-view";
import { hondurasToday } from "@/lib/portal-summary";
import { formatAmount, formatClock, formatDateRange, formatTripDate } from "@/lib/trip-format";
import { tripCopy } from "@/lib/trip-copy";
import { agencyContact, pdfColors as c, pdfFont, pdfLogo, registerPdfFont } from "@/lib/pdf-kit";

// Reservation confirmation: "what you purchased". Reference, customer, travelers, the reserved services
// with their current status, the payment position and the accepted conditions. Its identity is a white
// page with a status panel and service ledger: not a sales proposal, not an itinerary, not a receipt.

export type ConfirmationHeadline = { title: string; body: string; tone: "success" | "brand" | "muted" };

// Status in customer words, from agency and supplier states. A prereservation is never shown as confirmed.
export function confirmationHeadline(r: Pick<Reservation, "estado" | "prerreserva" | "supplier_status">): ConfirmationHeadline {
  if (r.estado === "cancelada") return { title: r.prerreserva ? "Prerreservación cancelada" : "Reserva cancelada", body: "Esta reserva fue cancelada. Si tiene preguntas, comuníquese con su asesor.", tone: "muted" };
  if (r.prerreserva) return { title: "Prerreservación registrada", body: "Registramos su solicitud. Su asesor confirmará la disponibilidad y las condiciones antes de reservar con los proveedores.", tone: "brand" };
  if (["confirmada", "emitida"].includes(r.supplier_status ?? "")) return { title: "Su viaje está reservado", body: "Los proveedores confirmaron los servicios de su reserva.", tone: "success" };
  return { title: "Su reserva está registrada", body: "Recibimos su reserva y estamos confirmando cada servicio con la aerolínea y los demás proveedores. Este documento no confirma la emisión de boletos.", tone: "brand" };
}

const supplierLabel = (status: string | undefined, ticketing: TripView["ticketing"]) =>
  ticketing === "issued" ? "Boleto emitido" : ticketing === "processing" ? "En emisión" : ({ confirmada: "Confirmado", emitida: "Confirmado", parcial: "Confirmación parcial" } as Record<string, string>)[status ?? ""] ?? "Por confirmar";

const s = StyleSheet.create({
  page: { fontFamily: pdfFont, fontSize: 9.5, color: c.ink, paddingTop: 36, paddingBottom: 56, paddingHorizontal: 44 },
  body: {},
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.line },
  logo: { width: 108, height: 34, objectFit: "contain" },
  docLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1.4, color: c.brand, textAlign: "right" },
  ref: { fontSize: 14, fontWeight: 800, textAlign: "right", marginTop: 2, lineHeight: 1.3 },
  panel: { marginTop: 20, padding: 18, borderRadius: 12, borderWidth: 1.5 },
  panelTitle: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.3 },
  label: { fontSize: 7.5, fontWeight: 700, color: c.inkSoft, letterSpacing: 0.8 },
  grid: { flexDirection: "row", marginTop: 16, gap: 12 },
  cell: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: c.surface },
  section: { fontSize: 12.5, fontWeight: 800, marginTop: 22, marginBottom: 6 },
  thead: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 1.5, borderBottomColor: c.ink },
  tr: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.line },
  th: { fontSize: 7.5, fontWeight: 700, color: c.inkSoft, letterSpacing: 0.6 },
  pill: { fontSize: 8, fontWeight: 700, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" },
  muted: { color: c.inkSoft },
  small: { fontSize: 8.5 },
  totals: { marginTop: 8, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  footerRule: { position: "absolute", bottom: 38, left: 44, right: 44, height: 1, backgroundColor: c.line },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7.5, color: c.inkSoft },
});

type ServiceRow = { kind: string; title: string; detail: string; status: string };

function serviceRows(view: TripView, supplierStatus: string | undefined, t: ReturnType<typeof tripCopy>): ServiceRow[] {
  const flightStatus = supplierLabel(supplierStatus, view.ticketing);
  const generic = supplierLabel(supplierStatus, "none");
  return [
    ...view.journeys.map(journey => ({ kind: journey.kind === "tramo" ? t("flight.tramo", { number: journey.index + 1 }) : t(`flight.${journey.kind}`), title: `${journey.from.city} (${journey.from.code}) – ${journey.to.city} (${journey.to.code})`, detail: [capital(formatTripDate(journey.date, "es", "weekday")), journey.time ? `sale ${formatClock(journey.time)}` : "", journey.airlines.join(", "), journey.stops ? t("flight.stops", { count: journey.stops }) : t("flight.direct")].filter(Boolean).join(" · "), status: flightStatus })),
    ...view.hotels.map(hotel => ({ kind: "Hotel", title: hotel.name, detail: [formatDateRange(hotel.checkIn, hotel.checkOut), hotel.nights ? t("nights", { count: hotel.nights }) : "", hotel.mealPlan, hotel.rooms.map(room => `${room.count > 1 ? `${room.count} × ` : ""}${room.category}`).filter(Boolean).join(", ")].filter(Boolean).join(" · "), status: generic })),
    ...view.ferries.map(ferry => ({ kind: "Ferry", title: `${ferry.fromPort} – ${ferry.toPort}`, detail: [formatTripDate(ferry.date, "es", "medium"), formatClock(ferry.time), ferry.operator].filter(Boolean).join(" · "), status: generic })),
    ...view.services.map(service => ({ kind: t(`service.${service.kind}`), title: service.title, detail: [service.description, service.date ? formatTripDate(service.date, "es", "medium") : "", service.time ? formatClock(service.time) : "", service.place].filter(Boolean).join(" · "), status: generic })),
  ];
}

const capital = (text: string) => text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text;

export function ConfirmationDocument({ reservation, items, payments, invoices = [], issuedAt }: { reservation: Reservation; items: ReservationItem[]; payments: Payment[]; invoices?: Pick<Invoice, "estado" | "total" | "moneda">[]; issuedAt: string }) {
  const t = tripCopy();
  const snapshot = reservation.accepted_snapshot!;
  const details = sanitizeDetails(snapshot.quotation.detalles);
  const view = buildTripView({ reservation: { ...reservation, total: Number(reservation.total) }, details: snapshot.quotation.detalles, travel: null, payments, invoices, receipts: [], documents: [], today: hondurasToday() });
  const headline = confirmationHeadline(reservation);
  const cancelled = reservation.estado === "cancelada";
  // Only a supplier-confirmed reservation is titled a confirmation; otherwise it is a reservation summary.
  const docName = view.supplierConfirmed && !reservation.prerreserva && reservation.estado !== "cancelada" ? "Confirmación de reserva" : "Resumen de reserva";
  const tone = { success: { border: c.success, bg: c.successTint, text: c.success }, brand: { border: c.brand, bg: c.brandTint, text: c.brandDeep }, muted: { border: c.line, bg: c.surface, text: c.inkSoft } }[headline.tone];
  const rows = serviceRows(view, reservation.supplier_status, t);
  // Line amounts only when they add up to the total shown (not for packages with hidden prices or adjusted totals).
  const showLinePrices = (!details.paquete.componentes.length || details.paquete.mostrarPrecios) && !view.finance.adjusted;
  // Accepted conditions, without the quotation-only clause that it "is not a reservation".
  const conditions = details.condiciones.filter(clause => clause.trim() && !/^Esta cotización no constituye/i.test(clause.trim()));
  const payment = details.pago;
  const pax = details.pasajeros;
  const paxText = [pax.adultos ? `${pax.adultos} ${pax.adultos === 1 ? "adulto" : "adultos"}` : "", pax.ninos ? `${pax.ninos} ${pax.ninos === 1 ? "niño" : "niños"}` : "", pax.infantes ? `${pax.infantes} ${pax.infantes === 1 ? "infante" : "infantes"}` : ""].filter(Boolean).join(", ");

  return <Document title={`${docName} ${reservation.codigo}`} author="viatour" subject={docName} language="es">
    <Page size="LETTER" style={s.page}>
      <View style={s.body}>
      <View style={s.header}>
        <Image src={pdfLogo("black")} style={s.logo} />
        <View><Text style={s.docLabel}>{docName.toLocaleUpperCase("es")}</Text><Text style={s.ref}>{reservation.codigo}</Text><Text style={{ ...s.small, ...s.muted, textAlign: "right" }}>Emitida el {formatTripDate(issuedAt.slice(0, 10), "es", "long")}</Text></View>
      </View>

      <View style={{ ...s.panel, borderColor: tone.border, backgroundColor: tone.bg }} wrap={false}>
        <Text style={{ ...s.label, color: tone.text }}>ESTADO DE SU RESERVA</Text>
        <Text style={{ ...s.panelTitle, color: headline.tone === "muted" ? c.ink : tone.text, marginTop: 2 }}>{headline.title}</Text>
        <Text style={{ marginTop: 4 }}>{headline.body}</Text>
      </View>

      <View style={s.grid} wrap={false}>
        <View style={s.cell}><Text style={s.label}>CLIENTE</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{reservation.cliente_nombre}</Text></View>
        <View style={s.cell}><Text style={s.label}>DESTINO</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{reservation.destino}</Text></View>
        <View style={s.cell}><Text style={s.label}>FECHAS</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{formatDateRange(reservation.fecha_inicio, reservation.fecha_fin) || "Por confirmar"}</Text></View>
        <View style={s.cell}><Text style={s.label}>VIAJEROS</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{paxText || "Por confirmar"}</Text></View>
      </View>

      <Text style={s.section}>Servicios reservados</Text>
      <View style={s.thead}><Text style={{ ...s.th, width: 92 }}>SERVICIO</Text><Text style={{ ...s.th, flex: 1 }}>DETALLE</Text><Text style={{ ...s.th, width: 96, textAlign: "right" }}>ESTADO</Text></View>
      {rows.length ? rows.map((row, index) => <View key={index} style={s.tr} wrap={false}>
        <Text style={{ width: 92, fontWeight: 700, ...s.small }}>{row.kind}</Text>
        <View style={{ flex: 1, paddingRight: 8 }}><Text style={{ fontWeight: 700 }}>{row.title}</Text>{row.detail ? <Text style={{ ...s.small, ...s.muted }}>{row.detail}</Text> : null}</View>
        <View style={{ width: 96, alignItems: "flex-end" }}><Text style={{ ...s.pill, backgroundColor: /Confirmado|emitido/.test(row.status) ? c.successTint : c.surface, color: /Confirmado|emitido/.test(row.status) ? c.success : c.inkSoft }}>{row.status}</Text></View>
      </View>) : <Text style={s.muted}>Los servicios se detallan en la versión aceptada de su cotización.</Text>}
      {reservation.supplier_reference && ["confirmada", "emitida", "parcial"].includes(reservation.supplier_status ?? "") ? <Text style={{ ...s.small, ...s.muted, marginTop: 4 }}>Referencia del proveedor: {reservation.supplier_reference}</Text> : null}

      <View wrap={false}>
        <Text style={s.section}>Resumen de pago</Text>
        {items.filter(item => item.descripcion).map((item, index) => <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
          <Text style={{ flex: 1 }}>{item.descripcion}{item.cantidad > 1 ? ` × ${item.cantidad}` : ""}</Text>
          {showLinePrices ? <Text style={{ width: 110, textAlign: "right" }}>{formatAmount(Number(item.precio_unitario) * Number(item.cantidad), reservation.moneda)}</Text> : null}
        </View>)}
        <View style={s.totals}>
          <View style={{ ...s.totalRow, borderTopWidth: 1.5, borderTopColor: c.ink, paddingTop: 6 }}><Text style={{ fontWeight: 700 }}>Total de la reserva</Text><Text style={{ fontWeight: 800 }}>{formatAmount(view.finance.total, view.finance.currency)}</Text></View>
          <View style={s.totalRow}><Text style={s.muted}>Pagos recibidos</Text><Text>{formatAmount(view.finance.paid, view.finance.currency)}</Text></View>
          {cancelled ? null : <View style={{ ...s.totalRow, borderTopWidth: 1, borderTopColor: c.line }}><Text style={{ fontWeight: 700 }}>{view.finance.balance > 0 ? "Saldo pendiente" : "Saldo"}</Text><Text style={{ fontWeight: 800, color: view.finance.balance > 0 ? c.brandDeep : c.success }}>{view.finance.balance > 0 ? formatAmount(view.finance.balance, view.finance.currency) : "Pagada"}</Text></View>}
        </View>
        {/* A cancelled reservation shows no balance due or deadline: same rule as Mi viaje. */}
        {cancelled ? <Text style={{ ...s.small, marginTop: 4 }}>Esta reserva fue cancelada. Su asesor le informará sobre cualquier pago o reembolso, según las condiciones de cada proveedor.</Text> : null}
        {!cancelled && payment.saldoFecha && view.finance.balance > 0 ? <Text style={{ ...s.small, marginTop: 4 }}>Fecha límite para el saldo: {formatTripDate(payment.saldoFecha, "es", "long")}</Text> : null}
        {!cancelled && payment.instrucciones ? <Text style={{ ...s.small, ...s.muted, marginTop: 2 }}>{payment.instrucciones}</Text> : null}
        {view.finance.otherCurrency ? <Text style={{ ...s.small, ...s.muted, marginTop: 2 }}>Hay pagos registrados en otra moneda; su asesor los aplicará al saldo.</Text> : null}
      </View>

      {conditions.length ? <View>
        <Text style={s.section}>Condiciones de su reserva</Text>
        {conditions.map((clause, index) => <View key={index} style={{ flexDirection: "row", marginBottom: 3 }} wrap={false}><Text style={{ width: 12, color: c.brand, fontWeight: 700 }}>{index + 1}.</Text><Text style={{ flex: 1, ...s.small }}>{clause}</Text></View>)}
        <Text style={{ ...s.small, ...s.muted, marginTop: 4 }}>Corresponden a la cotización {snapshot.quotation.codigo}{snapshot.quotation.version ? ` (versión ${snapshot.quotation.version})` : ""} aceptada por usted. Cambios, cancelaciones y reembolsos se rigen por las condiciones de cada proveedor.</Text>
      </View> : null}

      <View style={{ marginTop: 20, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: c.line, flexDirection: "row", justifyContent: "space-between" }} wrap={false}>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: 700 }}>Su asesor de viaje</Text><Text style={{ ...s.small, ...s.muted, marginTop: 2 }}>Para preguntas, cambios o pagos, indique su reserva {reservation.codigo}. Su itinerario, recibos y documentos están en Mi viaje.</Text><Link src={agencyContact.portal} style={{ ...s.small, color: c.brand, marginTop: 2 }}>{agencyContact.portal}</Link></View>
        <View style={{ width: 150, alignItems: "flex-end" }}><Text style={s.small}>WhatsApp {agencyContact.whatsapp}</Text><Text style={s.small}>{agencyContact.email}</Text></View>
      </View>

      </View>
      <View fixed style={s.footerRule} />
      <Text fixed style={s.footer} render={({ pageNumber, totalPages }) => `viatour · ${agencyContact.web} · ${docName} ${reservation.codigo}. No es un comprobante fiscal. · Página ${pageNumber} de ${totalPages}`} />
    </Page>
  </Document>;
}

export async function renderReservationConfirmationPdf(reservation: Reservation, items: ReservationItem[], payments: Payment[], invoices: Pick<Invoice, "estado" | "total" | "moneda">[] = [], issuedAt = new Date().toISOString()) {
  registerPdfFont();
  return renderToBuffer(<ConfirmationDocument reservation={reservation} items={items} payments={payments} invoices={invoices} issuedAt={issuedAt} />);
}
