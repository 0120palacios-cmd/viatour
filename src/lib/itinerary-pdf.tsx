/* eslint-disable jsx-a11y/alt-text -- react-pdf Image is not an HTML image and has no alt prop. */
import "server-only";

import { Document, Image, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { PublicTravel } from "@/lib/travel-operations";
import type { Reservation } from "@/lib/reservation-types";
import { hondurasToday } from "@/lib/portal-summary";
import { reservationTripView, type HotelView, type JourneyView, type ServiceView, type TripEvent, type TripView } from "@/lib/trip-view";
import { formatClock, formatDateRange, formatMinutes, formatTripDate } from "@/lib/trip-format";
import { tripCopy } from "@/lib/trip-copy";
import { agencyContact, pdfColors as c, pdfFont, pdfLogo, registerPdfFont } from "@/lib/pdf-kit";

// The travel itinerary: an operational document to use during the trip. It carries no prices, no
// sales copy and no private traveller data (only names and categories from the public projection).
// Its identity: a deep-blue cover band, a day-by-day timeline and e-ticket style flight rows.

const s = StyleSheet.create({
  page: { fontFamily: pdfFont, fontSize: 9.5, color: c.ink, paddingTop: 40, paddingBottom: 56, paddingHorizontal: 40 },
  body: {},
  cover: { marginTop: -40, marginHorizontal: -40, backgroundColor: c.brandDeep, color: c.canvas, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 26 },
  coverTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 104, height: 32, objectFit: "contain" },
  coverLabel: { fontSize: 8.5, fontWeight: 700, letterSpacing: 1.6, color: "#C9D8FB" },
  destination: { fontSize: 30, fontWeight: 800, marginTop: 26, letterSpacing: -0.5, lineHeight: 1.2 },
  coverDates: { fontSize: 13, marginTop: 6, color: "#E3EBFD" },
  coverMeta: { flexDirection: "row", marginTop: 18, gap: 28 },
  coverMetaLabel: { fontSize: 7.5, color: "#C9D8FB", letterSpacing: 0.8, fontWeight: 600 },
  coverMetaValue: { fontSize: 10.5, fontWeight: 700, marginTop: 2 },
  overview: { flexDirection: "row", marginTop: 18, borderWidth: 1, borderColor: c.line, borderRadius: 10 },
  overviewCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: c.line },
  label: { fontSize: 7.5, fontWeight: 700, color: c.inkSoft, letterSpacing: 0.8 },
  value: { fontSize: 10.5, fontWeight: 700, marginTop: 3 },
  status: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: c.brandTint },
  statusTitle: { fontSize: 11, fontWeight: 700, color: c.brandDeep },
  sectionTitle: { fontSize: 14, fontWeight: 800, marginTop: 22, marginBottom: 8, letterSpacing: -0.2, lineHeight: 1.3 },
  muted: { color: c.inkSoft },
  small: { fontSize: 8.5 },
  travelerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.line },
  dayHeader: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 8, gap: 8 },
  dayBadge: { backgroundColor: c.ink, color: c.canvas, fontSize: 8.5, fontWeight: 700, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dayDate: { fontSize: 11, fontWeight: 700 },
  card: { borderWidth: 1, borderColor: c.line, borderRadius: 10, marginBottom: 8 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.surface, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  kicker: { fontSize: 7.5, fontWeight: 700, color: c.brand, letterSpacing: 0.8 },
  cardTitle: { fontSize: 11.5, fontWeight: 700, marginTop: 1, lineHeight: 1.3 },
  leg: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, alignItems: "flex-start" },
  legSide: { width: 150 },
  legSideRight: { width: 150, alignItems: "flex-end", textAlign: "right" },
  time: { fontSize: 15, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.25, marginBottom: 2 },
  code: { fontSize: 10.5, fontWeight: 700, marginTop: 1 },
  legMiddle: { flex: 1, alignItems: "center", paddingHorizontal: 8, paddingTop: 4 },
  rule: { flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 4 },
  ruleLine: { flex: 1, height: 1, backgroundColor: "#B9CCF6" },
  connection: { marginHorizontal: 12, marginBottom: 2, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.line, borderStyle: "dashed", borderRadius: 6, flexDirection: "row", justifyContent: "space-between" },
  free: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: c.line, borderStyle: "dashed", borderRadius: 8, marginTop: 4 },
  row: { flexDirection: "row", gap: 16 },
  infoItem: { flexDirection: "row", marginBottom: 5 },
  bullet: { width: 10, color: c.brand, fontWeight: 700 },
  contact: { marginTop: 20, padding: 14, borderRadius: 10, backgroundColor: c.ink, color: c.canvas, flexDirection: "row", justifyContent: "space-between" },
  header: { position: "absolute", top: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: c.inkSoft },
  footerRule: { position: "absolute", bottom: 36, left: 40, right: 40, height: 1, backgroundColor: c.line },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, fontSize: 7.5, color: c.inkSoft },
});

function PlaneIcon({ color = c.brand, size = 10 }: { color?: string; size?: number }) {
  return <Svg viewBox="0 0 24 24" width={size} height={size}><Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" stroke={color} strokeWidth={2} fill="none" /></Svg>;
}

const upper = (text: string) => text.toLocaleUpperCase("es");
const capital = (text: string) => text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text;

function Journey({ journey, t }: { journey: JourneyView; t: ReturnType<typeof tripCopy> }) {
  const title = journey.kind === "tramo" ? t("flight.tramo", { number: journey.index + 1 }) : t(`flight.${journey.kind}`);
  const summary = [journey.stops ? t("flight.stops", { count: journey.stops }) : t("flight.direct"), journey.durationMin !== null ? t("flight.totalDuration", { duration: formatMinutes(journey.durationMin) }) : ""].filter(Boolean).join(" · ");
  const header = <View style={s.cardHead}>
      <View><Text style={s.kicker}>{upper(title)}</Text><Text style={s.cardTitle}>{journey.from.city} – {journey.to.city}</Text></View>
      <Text style={{ ...s.small, fontWeight: 600, color: c.brandDeep }}>{summary}</Text>
    </View>;
  return <View style={s.card}>
    {journey.legs.map((leg, index) => {
      const connection = journey.connections[index];
      const arrivesLater = leg.dayShift > 0;
      return <View key={leg.id} wrap={false}>
        {index === 0 ? header : null}
        <View style={s.leg}>
          <View style={s.legSide}>
            <Text style={s.time}>{formatClock(leg.from.time) || "—"}</Text>
            <Text style={s.code}>{leg.from.code} · {leg.from.city}</Text>
            <Text style={{ ...s.small, ...s.muted }}>{leg.from.airport}</Text>
            <Text style={{ ...s.small, ...s.muted }}>{capital(formatTripDate(leg.from.date, "es", "weekday"))}</Text>
          </View>
          <View style={s.legMiddle}>
            <Text style={{ fontWeight: 700 }}>{[leg.airline, leg.flight].filter(Boolean).join(" · ")}</Text>
            <View style={s.rule}><View style={s.ruleLine} /><View style={{ paddingHorizontal: 4 }}><PlaneIcon /></View><View style={s.ruleLine} /></View>
            <Text style={{ ...s.small, ...s.muted, textAlign: "center" }}>{[leg.durationMin !== null ? formatMinutes(leg.durationMin) : "", leg.cabin, leg.bookingClass ? t("flight.class", { value: leg.bookingClass }) : ""].filter(Boolean).join(" · ")}</Text>
            {leg.operatedBy ? <Text style={{ ...s.small, ...s.muted, textAlign: "center" }}>{t("flight.operatedBy", { airline: leg.operatedBy })}</Text> : null}
          </View>
          <View style={s.legSideRight}>
            <Text style={s.time}>{formatClock(leg.to.time) || "—"}{arrivesLater ? <Text style={{ fontSize: 9, color: c.brand }}>  +{leg.dayShift}</Text> : null}</Text>
            <Text style={s.code}>{leg.to.city} · {leg.to.code}</Text>
            <Text style={{ ...s.small, ...s.muted, textAlign: "right" }}>{leg.to.airport}</Text>
            <Text style={{ ...s.small, ...s.muted }}>{capital(formatTripDate(leg.to.date, "es", "weekday"))}</Text>
          </View>
        </View>
        {connection ? <View style={{ ...s.connection, ...(connection.airportChange ? { borderColor: c.error } : {}) }}>
          <Text style={{ ...s.small, fontWeight: 700 }}>{t("flight.connection", { city: connection.city })}{connection.overnight ? ` · ${t("flight.overnight")}` : ""}</Text>
          <Text style={{ ...s.small, ...s.muted }}>{connection.airportChange ? t("flight.airportChange", { from: connection.code, to: connection.nextCode }) : connection.minutes !== null ? t("flight.wait", { duration: formatMinutes(connection.minutes) }) : ""}</Text>
        </View> : null}
      </View>;
    })}
  </View>;
}

function Hotel({ hotel, checkout, t }: { hotel: HotelView; checkout: boolean; t: ReturnType<typeof tripCopy> }) {
  if (checkout) return <View style={{ ...s.card, padding: 10 }} wrap={false}><Text style={s.kicker}>{upper(t("hotel.checkout"))}</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{hotel.name}</Text></View>;
  return <View style={s.card} wrap={false}>
    <View style={s.cardHead}><View><Text style={s.kicker}>{upper(t("hotel.checkin"))}</Text><Text style={s.cardTitle}>{hotel.name}</Text></View><Text style={{ ...s.small, fontWeight: 600, color: c.brandDeep }}>{t("nights", { count: hotel.nights })}</Text></View>
    <View style={{ padding: 12 }}>
      <View style={s.row}>
        <View style={{ flex: 1 }}><Text style={s.label}>{upper(t("hotel.checkin"))}</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{capital(formatTripDate(hotel.checkIn, "es", "weekday"))}</Text></View>
        <View style={{ flex: 1 }}><Text style={s.label}>{upper(t("hotel.checkout"))}</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{capital(formatTripDate(hotel.checkOut, "es", "weekday"))}</Text></View>
        <View style={{ flex: 1 }}><Text style={s.label}>{upper(t("hotel.meals"))}</Text><Text style={{ fontWeight: 700, marginTop: 2 }}>{hotel.mealPlan || "Por confirmar"}</Text></View>
      </View>
      {hotel.rooms.filter(room => room.category || room.adults).map((room, index) => <Text key={index} style={{ marginTop: 8 }}>{room.count > 1 ? `${room.count} × ` : ""}{room.category || t("hotel.room")}{room.beds ? ` · ${room.beds}` : ""} · {t("hotel.guests", { adults: room.adults, children: room.children })}</Text>)}
      {hotel.included.length ? <Text style={{ ...s.small, marginTop: 4 }}><Text style={{ fontWeight: 700 }}>{t("hotel.included")}: </Text>{hotel.included.join(" · ")}</Text> : null}
      {hotel.address || hotel.city ? <Text style={{ ...s.small, ...s.muted, marginTop: 4 }}>{[hotel.address, hotel.city].filter(Boolean).join(", ")}</Text> : null}
    </View>
  </View>;
}

function Service({ service, t }: { service: ServiceView; t: ReturnType<typeof tripCopy> }) {
  const facts = [service.time ? formatClock(service.time) : "", service.place ? `${t("service.place")}: ${service.place}` : "", service.duration ? `${t("service.duration")}: ${service.duration}` : "", service.mode ? t(`service.${service.mode as "compartido" | "privado"}`) : "", service.operator ? `${t("service.provider")}: ${service.operator}` : "", service.endDate && service.endDate !== service.date ? t("service.until", { date: formatTripDate(service.endDate, "es", "dayMonth") }) : ""].filter(Boolean);
  return <View style={{ ...s.card, padding: 12 }} wrap={false}>
    <Text style={s.kicker}>{upper(t(`service.${service.kind}`))}</Text>
    <Text style={{ fontWeight: 700, fontSize: 10.5, marginTop: 2 }}>{service.title}</Text>
    {service.description ? <Text style={{ marginTop: 2 }}>{service.description}</Text> : null}
    {facts.length ? <Text style={{ ...s.small, ...s.muted, marginTop: 3 }}>{facts.join(" · ")}</Text> : null}
    {service.included.length ? <Text style={{ ...s.small, marginTop: 3 }}><Text style={{ fontWeight: 700 }}>{t("hotel.included")}: </Text>{service.included.join(" · ")}</Text> : null}
  </View>;
}

// Rough printed height of an event in points, to keep a whole day on one page when it fits.
function eventHeight(event: TripEvent) {
  if (event.kind === "flight") return 60 + event.journey.legs.length * 120 + event.journey.connections.length * 35;
  return event.kind === "checkin" ? 170 : event.kind === "checkout" ? 55 : 95;
}

function Event({ event, t }: { event: TripEvent; t: ReturnType<typeof tripCopy> }) {
  if (event.kind === "flight") return <Journey journey={event.journey} t={t} />;
  if (event.kind === "checkin" || event.kind === "checkout") return <Hotel hotel={event.hotel} checkout={event.kind === "checkout"} t={t} />;
  if (event.kind === "ferry") return <View style={{ ...s.card, padding: 12 }} wrap={false}><Text style={s.kicker}>FERRY</Text><Text style={{ fontWeight: 700, fontSize: 10.5, marginTop: 2 }}>{event.ferry.fromPort} – {event.ferry.toPort}</Text><Text style={{ ...s.small, ...s.muted, marginTop: 3 }}>{[formatClock(event.ferry.time), event.ferry.arriveTime ? `llegada ${formatClock(event.ferry.arriveTime)}` : "", event.ferry.operator, event.ferry.vessel, event.ferry.className].filter(Boolean).join(" · ")}</Text></View>;
  return event.kind === "service" ? <Service service={event.service} t={t} /> : null;
}

const pieceState = (state: string, t: ReturnType<typeof tripCopy>) => state ? t(`baggage.${state as "incluido" | "no_incluido" | "con_cargo"}`) : t("baggage.unknown");

export function itineraryView(r: Reservation, travel: PublicTravel, today = hondurasToday()): TripView {
  return reservationTripView(r, travel, today);
}

export function ItineraryDocument({ view, customerName, revision }: { view: TripView; customerName: string; revision: number }) {
  const t = tripCopy();
  const ticketNote = view.hasFlights ? view.ticketing === "issued" ? "Boletos emitidos" : view.ticketing === "processing" ? "En proceso de emisión" : "Pendiente de emisión" : "";
  const status = view.stage === "cancelled" ? t("stage.cancelled") : t(`stage.${view.stage}`);
  const info = [
    t("itinerary.beforeDocuments"),
    "Verifique los requisitos de entrada, visas y permisos de su destino y de los países de conexión antes de viajar. La información de requisitos puede cambiar; confirme siempre con la autoridad oficial.",
    ...(view.hasFlights ? [t("itinerary.beforeCheckin"), t("itinerary.beforeAirport"), "Los horarios pueden cambiar por decisión de la aerolínea. Revise el estado de su vuelo antes de salir al aeropuerto."] : []),
    "Este itinerario es informativo. Sus boletos electrónicos y las confirmaciones de los proveedores son los documentos que acreditan cada servicio.",
  ];
  return <Document title={`Itinerario ${view.reference} · ${view.destination}`} author="viatour" subject="Itinerario de viaje" language="es">
    <Page size="LETTER" style={s.page}>
      <View fixed style={s.header} render={({ pageNumber }) => pageNumber > 1 ? <><Text>viatour · Itinerario de viaje · {view.destination}</Text><Text>Reserva {view.reference}</Text></> : null} />

      <View style={s.body}>
      <View style={s.cover}>
        <View style={s.coverTop}><Image src={pdfLogo("white")} style={s.logo} /><Text style={s.coverLabel}>ITINERARIO DE VIAJE</Text></View>
        <Text style={{ fontSize: 10, color: "#C9D8FB", marginTop: 22 }}>Su itinerario de viaje a</Text>
        <Text style={{ ...s.destination, marginTop: 2 }}>{view.destination}</Text>
        <Text style={s.coverDates}>{formatDateRange(view.start, view.end) || t("datesToConfirm")}</Text>
        <View style={s.coverMeta}>
          <View><Text style={s.coverMetaLabel}>PREPARADO PARA</Text><Text style={s.coverMetaValue}>{customerName}</Text></View>
          <View><Text style={s.coverMetaLabel}>RESERVA</Text><Text style={s.coverMetaValue}>{view.reference}</Text></View>
          {view.origin ? <View><Text style={s.coverMetaLabel}>SALIDA DESDE</Text><Text style={s.coverMetaValue}>{view.origin.city}</Text></View> : null}
        </View>
      </View>

      <View style={s.overview} wrap={false}>
        <View style={s.overviewCell}><Text style={s.label}>VIAJEROS</Text><Text style={s.value}>{view.travelerCount || "—"}</Text></View>
        <View style={s.overviewCell}><Text style={s.label}>DURACIÓN</Text><Text style={s.value}>{view.tripDays ? t("days", { count: view.tripDays }) : "—"}</Text></View>
        <View style={s.overviewCell}><Text style={s.label}>ESTADO DE LA RESERVA</Text><Text style={s.value}>{status}</Text></View>
        <View style={{ ...s.overviewCell, borderRightWidth: 0 }}><Text style={s.label}>BOLETOS</Text><Text style={s.value}>{ticketNote || "No aplica"}</Text></View>
      </View>
      <View style={s.status} wrap={false}>
        <Text style={s.statusTitle}>{t("next.title")}</Text>
        <Text style={{ marginTop: 2 }}>{view.nextStep === "balance" ? "Su asesor le confirmará los detalles de pago pendientes." : t(`next.${view.nextStep}`)}</Text>
        {view.estimate ? <Text style={{ ...s.small, ...s.muted, marginTop: 2 }}>{t("next.ticketingEstimate", view.estimate)}</Text> : null}
      </View>

      <Text style={s.sectionTitle}>Viajeros</Text>
      {view.travelers.length ? view.travelers.map(traveler => <View key={traveler.id} style={s.travelerRow} wrap={false}>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: 700 }}>{upper(traveler.name)}</Text><Text style={{ ...s.small, ...s.muted }}>{t(`travelers.${traveler.category}`)}</Text></View>
        <View style={{ alignItems: "flex-end" }}>
          {traveler.pnr ? <Text style={s.small}>{t("travelers.pnr")}{traveler.airline ? ` (${traveler.airline})` : ""}: <Text style={{ fontWeight: 700 }}>{traveler.pnr}</Text></Text> : null}
          {traveler.ticketNumber ? <Text style={s.small}>Boleto {traveler.ticketNumber}</Text> : <Text style={{ ...s.small, ...s.muted }}>{ticketNote}</Text>}
        </View>
      </View>) : <Text style={s.muted}>{t("travelers.pendingReview")}</Text>}
      <Text style={{ ...s.small, ...s.muted, marginTop: 4 }}>Los nombres deben coincidir con el documento de viaje de cada persona. Si encuentra una diferencia, avísenos de inmediato.</Text>

      <Text style={s.sectionTitle} break={view.travelers.length > 6} minPresenceAhead={260}>Itinerario día a día</Text>
      {view.hasFlights ? <Text style={{ ...s.small, ...s.muted, marginTop: -4, marginBottom: 2 }}>{t("itinerary.localTimes")}</Text> : null}
      {view.timeline.map(entry => entry.type === "free"
        ? <View key={`free-${entry.from}`} style={s.free} wrap={false}><Text style={{ ...s.small, fontWeight: 700 }}>{capital(t("itinerary.freeTime", { days: entry.days }))}</Text><Text style={{ ...s.small, ...s.muted }}>  ·  {formatDateRange(entry.from, entry.to)}. {t("itinerary.freeTimeNote")}</Text></View>
        : <View key={entry.date} wrap={entry.events.reduce((sum, event) => sum + eventHeight(event), 40) > 640}>
          <View style={s.dayHeader} wrap={false} minPresenceAhead={300}><Text style={s.dayBadge}>{upper(t("itinerary.day", { number: entry.dayNumber }))}</Text><Text style={s.dayDate}>{capital(formatTripDate(entry.date, "es", "full"))}</Text></View>
          {entry.events.map((event, index) => <Event key={index} event={event} t={t} />)}
        </View>)}
      {view.undated.length ? <><Text style={{ ...s.sectionTitle, fontSize: 12 }}>{t("itinerary.undated")}</Text>{view.undated.map((event, index) => <Event key={index} event={event} t={t} />)}</> : null}

      {view.baggage.length ? <View wrap={false}>
        <Text style={s.sectionTitle}>Equipaje</Text>
        {view.baggage.map((bag, index) => <View key={index} style={{ ...s.card, padding: 12 }}>
          {bag.scope ? <Text style={s.kicker}>{upper(bag.scope)}</Text> : null}
          {bag.pieces.map(piece => <View key={piece.kind} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Text style={{ fontWeight: 600 }}>{t(`baggage.${piece.kind}`)}</Text>
            <Text style={{ color: piece.state === "incluido" ? c.success : c.ink }}>{pieceState(piece.state, t)}{piece.state === "incluido" ? [piece.pieces ? t("baggage.pieces", { count: piece.pieces }) : "", piece.weight, piece.size].filter(Boolean).map(value => ` · ${value}`).join("") : ""}</Text>
          </View>)}
          {bag.notes ? <Text style={{ ...s.small, ...s.muted, marginTop: 4 }}>{bag.notes}</Text> : null}
        </View>)}
        {view.separateTickets ? <Text style={{ ...s.small, ...s.muted }}>{t("flight.separateTickets")}</Text> : null}
      </View> : null}

      <View wrap={false}>
        <Text style={s.sectionTitle}>Información importante</Text>
        {info.map(item => <View key={item} style={s.infoItem}><Text style={s.bullet}>•</Text><Text style={{ flex: 1 }}>{item}</Text></View>)}
      </View>

      <View style={s.contact} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: 700 }}>¿Necesita ayuda con su viaje?</Text>
          <Text style={{ ...s.small, color: "#C9D3DD", marginTop: 3 }}>Escríbanos e indique su reserva {view.reference}. Consulte sus documentos en Mi viaje con su código de reserva, su apellido y el código de verificación que recibe por correo.</Text>
          <Link src={agencyContact.portal} style={{ ...s.small, color: "#9DBBF8", marginTop: 4 }}>{agencyContact.portal}</Link>
        </View>
        <View style={{ width: 150, alignItems: "flex-end" }}>
          <Text style={{ ...s.small, color: "#C9D3DD" }}>WhatsApp</Text><Text style={{ fontWeight: 700 }}>{agencyContact.whatsapp}</Text>
          <Text style={{ ...s.small, color: "#C9D3DD", marginTop: 4 }}>Correo</Text><Text style={{ fontWeight: 700 }}>{agencyContact.email}</Text>
        </View>
      </View>

      </View>
      <View fixed style={s.footerRule} />
      <Text fixed style={s.footer} render={({ pageNumber, totalPages }) => `viatour · ${agencyContact.web} · Reserva ${view.reference} · Horarios locales de cada ciudad · Revisión ${revision} · Página ${pageNumber} de ${totalPages}`} />
    </Page>
  </Document>;
}

export async function renderItineraryPdf(r: Reservation, travel: PublicTravel, revision: number, today?: string) {
  if (!r.accepted_snapshot?.quotation?.detalles) throw Error("Falta el itinerario aceptado.");
  registerPdfFont();
  const view = itineraryView(r, travel, today);
  if (!view.timeline.length && !view.undated.length) throw Error("El itinerario no tiene servicios con datos suficientes.");
  return renderToBuffer(<ItineraryDocument view={view} customerName={r.cliente_nombre} revision={revision} />);
}
