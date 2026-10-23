/* eslint-disable jsx-a11y/alt-text -- react-pdf Image is not an HTML image and has no alt prop. */
import "server-only";

import { Document, Image, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { PublicTravel } from "@/lib/travel-operations";
import type { Reservation } from "@/lib/reservation-types";
import { hondurasToday } from "@/lib/portal-summary";
import { reservationTripView, type HotelView, type JourneyView, type ServiceView, type TravelerView, type TripEvent, type TripView } from "@/lib/trip-view";
import { formatClock, formatDateRange, formatMinutes, formatTripDate } from "@/lib/trip-format";
import { tripCopy } from "@/lib/trip-copy";
import { agencyContact, pdfColors as c, pdfFont, pdfLogo, registerPdfFont } from "@/lib/pdf-kit";
import { destinationPhoto } from "@/lib/trip-data";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { airlineAction } from "@/lib/airline-links";
import { creditsFor } from "@/lib/photo-credits";

// The travel itinerary: the document a traveller prints, keeps on the phone or forwards to family.
// A cover (destination, dates, airline booking code, dated status), then one page that answers what is
// asked at a counter (who travels, each ticket, which flights, baggage), then the flight detail, the stay
// and contacts. It carries no prices and no private traveller data (only names and categories from the
// public projection). Its identity matches Mi viaje: the route in type on brand blue, flights as a line.

type Copy = ReturnType<typeof tripCopy>;

const s = StyleSheet.create({
  page: { fontFamily: pdfFont, fontSize: 9.5, color: c.ink, paddingTop: 52, paddingBottom: 60, paddingHorizontal: 48 },
  logo: { width: 96, height: 30, objectFit: "contain" },

  coverPage: { fontFamily: pdfFont, fontSize: 9.5, color: c.ink, paddingTop: 36, paddingBottom: 56, paddingHorizontal: 48 },
  coverTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coverLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1.6, color: c.inkSoft },
  coverVisual: { marginTop: 22, height: 292, width: "100%", objectFit: "cover", borderRadius: 4, overflow: "hidden", position: "relative" },
  photoCredit: { position: "absolute", right: 6, bottom: 6, fontSize: 6.5, color: "#FFFFFF", backgroundColor: "rgba(18,22,28,0.55)", paddingVertical: 2, paddingHorizontal: 5, borderRadius: 2 },
  coverFallback: { backgroundColor: c.brandDeep, justifyContent: "center", paddingHorizontal: 40 },
  coverRoute: { flexDirection: "row", alignItems: "center" },
  coverCode: { fontSize: 46, fontWeight: 800, letterSpacing: 1.5, color: c.canvas },
  coverCity: { fontSize: 10, color: "#C9D8FB", marginTop: 2 },
  routeLine: { flex: 1, flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 14 },
  dash: { flex: 1, borderTopWidth: 1, borderTopColor: "#7F9DE6", borderStyle: "dashed" },
  coverBody: { marginTop: 26 },
  coverEyebrow: { fontSize: 10.5, color: c.inkSoft },
  coverTitle: { fontSize: 38, fontWeight: 800, letterSpacing: -0.8, marginTop: 2 },
  coverDates: { fontSize: 14, color: c.ink, marginTop: 4 },
  coverFacts: { flexDirection: "row", marginTop: 20, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: c.ink },
  coverFact: { flex: 1, paddingRight: 10 },
  coverFactValue: { fontSize: 10.5, fontWeight: 700, marginTop: 3 },
  coverFooter: { position: "absolute", bottom: 28, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: c.inkSoft, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 },

  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, backgroundColor: c.surface },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },

  h2: { fontSize: 13, fontWeight: 800, letterSpacing: -0.2, marginTop: 18, marginBottom: 8 },
  label: { fontSize: 7.5, fontWeight: 700, color: c.inkSoft, letterSpacing: 0.6 },
  muted: { color: c.inkSoft },
  small: { fontSize: 8.5 },
  bold: { fontWeight: 700 },

  pnrBox: { flex: 1, borderWidth: 1, borderColor: "#C7D7FA", backgroundColor: c.brandTint, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
  pnr: { fontSize: 20, fontWeight: 800, letterSpacing: 2.4, marginTop: 2 },

  table: { borderTopWidth: 1, borderTopColor: c.ink },
  th: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: c.line },
  tr: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.line, alignItems: "flex-start" },

  journey: { marginBottom: 14 },
  journeyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 6, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: c.ink },
  kicker: { fontSize: 7.5, fontWeight: 700, color: c.brand, letterSpacing: 0.8 },
  journeyTitle: { fontSize: 12.5, fontWeight: 800, marginTop: 2 },
  line: { flexDirection: "row" },
  timeCol: { width: 70, textAlign: "right", paddingRight: 8 },
  railCol: { width: 14, alignItems: "center" },
  rail: { position: "absolute", left: 6, width: 2, backgroundColor: "#C7D7FA" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 3 },
  body: { flex: 1, paddingLeft: 8 },
  time: { fontSize: 11.5, fontWeight: 800 },
  connection: { backgroundColor: c.surface, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8, marginVertical: 6 },

  block: { borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 12, marginBottom: 8 },
  grid: { flexDirection: "row", marginTop: 8 },
  gridCell: { flex: 1, paddingRight: 8 },
  agendaRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line },
  agendaDate: { width: 48, alignItems: "center", paddingRight: 10 },

  note: { flexDirection: "row", marginBottom: 4 },
  bullet: { width: 10, color: c.brand, fontWeight: 700 },
  contact: { flexDirection: "row", marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.ink },

  header: { position: "absolute", top: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: c.inkSoft },
  footerRule: { position: "absolute", bottom: 40, left: 48, right: 48, height: 1, backgroundColor: c.line },
  footer: { position: "absolute", bottom: 26, left: 48, right: 48, fontSize: 7.5, color: c.inkSoft },
});

const upper = (text: string) => text.toLocaleUpperCase("es");
const capital = (text: string) => text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text;
// "Mié 18 nov": compact enough for the one-line flight summary.
const shortDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? capital(new Intl.DateTimeFormat("es-HN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(/\./g, "").replace(",", "")) : "";
// Clock times never break inside ("10:40 a. m." on one line).
const clock = (time: string) => formatClock(time).replace(/ /g, " ");
const ticketDisplay = (number: string) => /^\d{13}$/.test(number) ? `${number.slice(0, 3)} ${number.slice(3)}` : number;
const journeyTitle = (journey: JourneyView, t: Copy) => journey.kind === "tramo" ? t("flight.tramo", { number: journey.index + 1 }) : t(`flight.${journey.kind}`);

function PlaneIcon({ color = c.canvas, size = 12 }: { color?: string; size?: number }) {
  return <Svg viewBox="0 0 24 24" width={size} height={size}><Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" stroke={color} strokeWidth={2} fill="none" transform="rotate(45 12 12)" /></Svg>;
}

function ticketLabel(traveler: TravelerView) {
  return traveler.ticket === "issued" ? "Emitido" : traveler.ticket === "processing" ? "En emisión" : traveler.ticket === "pending" ? "Pendiente" : "";
}

// ---------------------------------------------------------------------------------------------------------

// The cover: a page of its own, like a printed travel dossier. The destination's real photo when the site
// has one; otherwise the route set in type on the brand blue. Then destination, dates, who it is for, the
// airline booking code and the dated status. Nothing on it changes once the trip is ticketed.
function Cover({ view, customerName, photo, photoCredit, today, t }: { view: TripView; customerName: string; photo: Buffer | null; photoCredit: string; today: string; t: Copy }) {
  const outbound = view.journeys[0];
  const facts = [
    { label: "PREPARADO PARA", value: customerName, wide: true },
    { label: "RESERVA", value: view.reference },
    view.travelerCount ? { label: "VIAJEROS", value: String(view.travelerCount) } : null,
    view.tripDays ? { label: "DURACIÓN", value: t("days", { count: view.tripDays }) } : null,
  ].filter(Boolean) as { label: string; value: string; wide?: boolean }[];
  return <Page size="LETTER" style={s.coverPage}>
    <View style={s.coverTop}><Image src={pdfLogo("black")} style={s.logo} /><Text style={s.coverLabel}>ITINERARIO DE VIAJE</Text></View>
    {photo ? <View style={s.coverVisual}><Image src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />{photoCredit ? <Text style={s.photoCredit}>{photoCredit}</Text> : null}</View> : <View style={{ ...s.coverVisual, ...s.coverFallback }}>
      {outbound ? <View style={s.coverRoute}>
        <View><Text style={s.coverCode}>{outbound.from.code}</Text><Text style={s.coverCity}>{outbound.from.city}</Text></View>
        <View style={s.routeLine}><View style={s.dash} /><View style={{ paddingHorizontal: 8 }}><PlaneIcon size={18} /></View><View style={s.dash} /></View>
        <View style={{ alignItems: "flex-end" }}><Text style={s.coverCode}>{outbound.to.code}</Text><Text style={s.coverCity}>{outbound.to.city}</Text></View>
      </View> : <Text style={{ ...s.coverCode, fontSize: 30 }}>{view.destination}</Text>}
    </View>}
    <View style={s.coverBody}>
      <Text style={s.coverEyebrow}>{t("eyebrow")}</Text>
      <Text style={s.coverTitle}>{view.destination}</Text>
      <Text style={s.coverDates}>{capital(formatDateRange(view.start, view.end)) || t("datesToConfirm")}</Text>
      {photo && outbound ? <Text style={{ ...s.small, ...s.muted, marginTop: 6 }}>{outbound.from.city} ({outbound.from.code}) – {outbound.to.city} ({outbound.to.code})</Text> : null}
      <View style={s.coverFacts}>{facts.map(fact => <View key={fact.label} style={{ ...s.coverFact, ...(fact.wide ? { flex: 2 } : {}) }}><Text style={s.label}>{fact.label}</Text><Text style={s.coverFactValue}>{fact.value}</Text></View>)}</View>
      <Confirmations view={view} t={t} />
      <StatusLine view={view} today={today} t={t} />
    </View>
    <View style={s.coverFooter} fixed>
      <Text>viatour · asesores de viaje</Text>
      <Text>WhatsApp {agencyContact.whatsapp} · {agencyContact.email} · {agencyContact.portal.replace("https://", "")}</Text>
    </View>
  </Page>;
}

// The state the document was printed with, dated: a printed itinerary must not look more final than it was.
function StatusLine({ view, today, t }: { view: TripView; today: string; t: Copy }) {
  const ready = ["ready", "in_progress", "completed"].includes(view.stage);
  const color = view.stage === "cancelled" ? c.error : ready ? c.success : c.brand;
  const tickets = view.hasFlights && !["cancelled", "ticketing"].includes(view.stage) ? view.ticketing === "issued" ? "Boletos emitidos" : view.ticketing === "processing" ? "Boletos en emisión" : "Boletos pendientes de emisión" : "";
  return <View style={s.statusRow} wrap={false}>
    <View style={{ ...s.statusDot, backgroundColor: color }} />
    <Text style={{ flex: 1 }}><Text style={s.bold}>{t(`stage.${view.stage}`)}</Text>{tickets ? `  ·  ${tickets}` : ""}</Text>
    <Text style={{ ...s.small, ...s.muted }}>Estado al {formatTripDate(today, "es", "long")}</Text>
  </View>;
}

function Confirmations({ view, t }: { view: TripView; t: Copy }) {
  if (!view.confirmations.length) return null;
  const shared = view.confirmations.length === 1;
  return <View wrap={false} style={{ marginTop: 12 }}>
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {view.confirmations.map(item => <View key={`${item.airline}-${item.pnr}`} style={{ ...s.pnrBox, ...(shared ? {} : { minWidth: 200 }) }}>
        <Text style={{ ...s.label, color: c.brandDeep }}>{upper(t("travelers.pnr"))}{item.airline ? ` · ${upper(item.airline)}` : ""}</Text>
        <Text style={s.pnr}>{item.pnr}</Text>
        <Text style={{ ...s.small, ...s.muted, marginTop: 2 }}>{shared ? t("travelers.pnrHelp") : t("travelers.pnrFor", { count: item.travelerIds.length })}</Text>
        <AirlineLink airline={item.airline || view.journeys[0]?.airlines[0] || ""} />
      </View>)}
    </View>
  </View>;
}

// Where to check the booking on the airline's own site: the verified lookup page, else its home page.
function AirlineLink({ airline }: { airline: string }) {
  const action = airlineAction(airline);
  if (!action) return null;
  const label = action.kind === "manage" ? `Consulte su reserva en ${action.airline}:` : `Sitio de ${action.airline}:`;
  return <Text style={{ ...s.small, marginTop: 3 }}>{label} <Link src={action.url} style={{ color: c.brand, textDecoration: "none" }}>{action.url.replace(/^https:\/\//, "").replace(/\/$/, "")}</Link></Text>;
}

function Travelers({ view, t }: { view: TripView; t: Copy }) {
  const perTravelerPnr = view.confirmations.length > 1;
  return <View>
    <Text style={s.h2} minPresenceAhead={80}>{view.hasFlights ? "Viajeros y boletos" : "Viajeros"}</Text>
    {view.travelers.length ? <View style={s.table}>
      <View style={s.th}>
        <Text style={{ ...s.label, width: 18 }}>#</Text>
        <Text style={{ ...s.label, flex: 1 }}>NOMBRE</Text>
        <Text style={{ ...s.label, width: 60 }}>TIPO</Text>
        {view.hasFlights ? <><Text style={{ ...s.label, width: 120 }}>NÚMERO DE BOLETO</Text><Text style={{ ...s.label, width: 62, textAlign: "right" }}>BOLETO</Text></> : null}
      </View>
      {view.travelers.map((traveler, index) => <View key={traveler.id} style={s.tr} wrap={false}>
        <Text style={{ width: 18, ...s.muted }}>{index + 1}</Text>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.bold}>{upper(traveler.name)}</Text>
          {perTravelerPnr && traveler.pnr ? <Text style={{ ...s.small, ...s.muted }}>{[traveler.airline, traveler.pnr].filter(Boolean).join(" · ")}</Text> : null}
        </View>
        <Text style={{ width: 60, ...s.muted }}>{t(`travelers.${traveler.category}`)}</Text>
        {view.hasFlights ? <>
          <Text style={{ width: 120, fontWeight: 700, letterSpacing: 0.4 }}>{traveler.ticketNumber ? ticketDisplay(traveler.ticketNumber) : "—"}</Text>
          <Text style={{ width: 62, textAlign: "right", fontWeight: 600, color: traveler.ticket === "issued" ? c.success : c.inkSoft }}>{ticketLabel(traveler)}</Text>
        </> : null}
      </View>)}
    </View> : <Text style={s.muted}>{t("travelers.pendingReview")}</Text>}
    {view.travelers.length ? <Text style={{ ...s.small, ...s.muted, marginTop: 6 }}>Los nombres deben coincidir con el pasaporte o documento de viaje de cada persona. Si encuentra una diferencia, avísenos antes de viajar.</Text> : null}
  </View>;
}

// One line per journey, so the whole trip reads at a glance before the detail pages.
function FlightSummary({ view, t }: { view: TripView; t: Copy }) {
  if (!view.journeys.length) return null;
  return <View wrap={false}>
    <Text style={s.h2}>Sus vuelos</Text>
    <View style={s.table}>
      <View style={s.th}>
        <Text style={{ ...s.label, width: 62 }}>TRAMO</Text>
        <Text style={{ ...s.label, width: 82 }}>FECHA</Text>
        <Text style={{ ...s.label, flex: 1 }}>SALIDA</Text>
        <Text style={{ ...s.label, flex: 1 }}>LLEGADA</Text>
        <Text style={{ ...s.label, width: 120 }}>VUELOS</Text>
      </View>
      {view.journeys.map(journey => <View key={journey.id} style={s.tr}>
        <Text style={{ width: 62, fontWeight: 700 }}>{journeyTitle(journey, t)}</Text>
        <Text style={{ width: 82 }}>{shortDate(journey.date)}</Text>
        <Text style={{ flex: 1 }}><Text style={s.bold}>{journey.from.code}</Text> {clock(journey.time)}</Text>
        <Text style={{ flex: 1 }}><Text style={s.bold}>{journey.to.code}</Text> {clock(journey.arriveTime)}{journey.arriveDate && journey.arriveDate !== journey.date ? <Text style={{ color: c.brand, fontWeight: 700 }}> +{journey.legs.reduce((sum, leg) => sum + leg.dayShift, 0) || 1}</Text> : null}</Text>
        <View style={{ width: 120 }}>
          <Text>{journey.legs.map(leg => leg.flight).filter(Boolean).join(", ")}</Text>
          <Text style={{ ...s.small, ...s.muted }}>{journey.stops ? `${t("flight.stops", { count: journey.stops })} (${journey.connections.map(item => item.code).join(", ")})` : t("flight.direct")}</Text>
        </View>
      </View>)}
    </View>
    <Text style={{ ...s.small, ...s.muted, marginTop: 6 }}>{t("itinerary.localTimes")}</Text>
  </View>;
}

// ---------------------------------------------------------------------------------------------------------
// Flight detail: the same vertical line as Mi viaje.

function Rail({ dot, span = "full", dashed = false }: { dot?: "solid" | "hollow"; span?: "full" | "start" | "end"; dashed?: boolean }) {
  const extent = span === "start" ? { top: 6, bottom: 0 } : span === "end" ? { top: 0, height: 7 } : { top: 0, bottom: 0 };
  return <View style={s.railCol}>
    <View style={{ ...s.rail, ...extent, ...(dashed ? { backgroundColor: c.line } : {}) }} />
    {dot ? <View style={{ ...s.dot, ...(dot === "solid" ? { backgroundColor: c.brand } : { backgroundColor: c.canvas, borderWidth: 2, borderColor: c.brand }) }} /> : null}
  </View>;
}

function JourneyDetail({ journey, t }: { journey: JourneyView; t: Copy }) {
  // `continued`: the departure after a connection at the same airport, already named on the arrival above.
  const stop = (time: string, place: JourneyView["legs"][number]["from"], date: string, edge: boolean, span: "full" | "start" | "end", continued = false) => <View style={s.line}>
    <View style={s.timeCol}><Text style={{ ...s.time, ...(edge ? {} : { fontSize: 10.5 }) }}>{clock(time) || "—"}</Text></View>
    <Rail dot={edge ? "solid" : "hollow"} span={span} />
    <View style={{ ...s.body, paddingBottom: 2 }}>
      <Text><Text style={{ fontWeight: 800, fontSize: edge ? 11.5 : 10.5 }}>{place.code}</Text>  <Text style={{ fontWeight: edge ? 700 : 400, fontSize: edge ? 11 : 10 }}>{continued ? "" : place.city}</Text></Text>
      {place.airport && !continued ? <Text style={{ ...s.small, ...s.muted }}>{place.airport}</Text> : null}
      {date && date !== journey.date ? <Text style={{ ...s.small, color: c.brandDeep, fontWeight: 700 }}>{capital(formatTripDate(date, "es", "weekday"))}</Text> : null}
    </View>
  </View>;
  return <View style={s.journey} wrap={false}>
    <View style={s.journeyHead}>
      <View>
        <Text style={s.kicker}>{upper(journeyTitle(journey, t))} · {upper(formatTripDate(journey.date, "es", "full"))}</Text>
        <Text style={s.journeyTitle}>{journey.from.city} – {journey.to.city}</Text>
      </View>
      <Text style={{ ...s.small, fontWeight: 600 }}>{[journey.stops ? t("flight.stops", { count: journey.stops }) : t("flight.direct"), journey.durationMin !== null ? t("flight.totalDuration", { duration: formatMinutes(journey.durationMin) }) : ""].filter(Boolean).join(" · ")}</Text>
    </View>
    {journey.legs.map((leg, index) => {
      const connection = journey.connections[index];
      const last = index === journey.legs.length - 1;
      return <View key={leg.id}>
        {stop(leg.from.time, leg.from, leg.from.date, index === 0, index === 0 ? "start" : "full", index > 0 && !journey.connections[index - 1]?.airportChange)}
        <View style={s.line}>
          <View style={s.timeCol} />
          <Rail />
          <View style={{ ...s.body, paddingVertical: 5 }}>
            <Text style={s.bold}>{[leg.airline, leg.flight].filter(Boolean).join(" · ")}</Text>
            <Text style={{ ...s.small, ...s.muted }}>{[leg.durationMin !== null ? t("flight.flightTime", { duration: formatMinutes(leg.durationMin) }) : "", leg.cabin, leg.bookingClass ? t("flight.class", { value: leg.bookingClass }) : "", leg.aircraft].filter(Boolean).join(" · ")}</Text>
            {leg.operatedBy ? <Text style={{ ...s.small, ...s.muted }}>{t("flight.operatedBy", { airline: leg.operatedBy })}</Text> : null}
          </View>
        </View>
        {stop(leg.to.time, leg.to, leg.to.date, last, last ? "end" : "full")}
        {connection ? <View style={s.line}>
          <View style={s.timeCol} />
          <Rail dashed />
          <View style={s.body}>
            <View style={{ ...s.connection, ...(connection.airportChange ? { borderWidth: 1, borderColor: c.error } : {}) }}>
              <Text style={s.small}><Text style={s.bold}>{t("flight.connection", { city: connection.city })}</Text>{connection.minutes !== null ? `  ·  ${t("flight.wait", { duration: formatMinutes(connection.minutes) })}` : ""}</Text>
              {connection.overnight ? <Text style={{ ...s.small, ...s.muted }}>{t("flight.overnight")}</Text> : null}
              {connection.airportChange ? <Text style={{ ...s.small, color: c.error, fontWeight: 700 }}>{t("flight.airportChange", { from: connection.code, to: connection.nextCode })}</Text> : null}
            </View>
          </View>
        </View> : null}
      </View>;
    })}
  </View>;
}

// ---------------------------------------------------------------------------------------------------------
// Stay and services.

function HotelBlock({ hotel, t }: { hotel: HotelView; t: Copy }) {
  return <View style={s.block} wrap={false}>
    <Text style={s.kicker}>HOTEL{hotel.nights ? ` · ${upper(t("nights", { count: hotel.nights }))}` : ""}</Text>
    <Text style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{hotel.name}</Text>
    {hotel.city ? <Text style={s.muted}>{hotel.city}</Text> : null}
    <View style={s.grid}>
      <View style={s.gridCell}><Text style={s.label}>ENTRADA</Text><Text style={{ ...s.bold, marginTop: 2 }}>{capital(formatTripDate(hotel.checkIn, "es", "weekday"))}</Text></View>
      <View style={s.gridCell}><Text style={s.label}>SALIDA</Text><Text style={{ ...s.bold, marginTop: 2 }}>{capital(formatTripDate(hotel.checkOut, "es", "weekday"))}</Text></View>
      <View style={s.gridCell}><Text style={s.label}>ALIMENTACIÓN</Text><Text style={{ ...s.bold, marginTop: 2 }}>{hotel.mealPlan || "Por confirmar"}</Text></View>
    </View>
    {hotel.rooms.filter(room => room.category || room.adults).map((room, index) => <Text key={index} style={{ marginTop: 8 }}>{room.count > 1 ? `${room.count} × ` : ""}{room.category || t("hotel.room")}{room.beds ? ` · ${room.beds}` : ""} · {t("hotel.guests", { adults: room.adults, children: room.children })}</Text>)}
    {hotel.included.length ? <Text style={{ ...s.small, marginTop: 4 }}><Text style={s.bold}>{t("hotel.included")}: </Text>{hotel.included.join(" · ")}</Text> : null}
    {hotel.address ? <Text style={{ ...s.small, ...s.muted, marginTop: 4 }}>{hotel.address}</Text> : null}
  </View>;
}

function AgendaRow({ event, t }: { event: Extract<TripEvent, { kind: "service" | "ferry" }>; t: Copy }) {
  const date = event.date;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? <View style={s.agendaDate}><Text style={{ fontSize: 14, fontWeight: 800 }}>{Number(date.slice(8, 10))}</Text><Text style={{ ...s.small, ...s.muted }}>{formatTripDate(date, "es", "short").split(" ").slice(1).join(" ")}</Text></View> : <View style={s.agendaDate} />;
  if (event.kind === "ferry") {
    const ferry = event.ferry;
    return <View style={s.agendaRow} wrap={false}>{day}<View style={{ flex: 1 }}>
      <Text style={s.kicker}>FERRY</Text>
      <Text style={{ ...s.bold, marginTop: 1 }}>{ferry.fromPort} – {ferry.toPort}</Text>
      <Text style={{ ...s.small, ...s.muted }}>{[formatClock(ferry.time), ferry.arriveTime ? `llegada ${formatClock(ferry.arriveTime)}` : "", ferry.operator, ferry.vessel, ferry.className].filter(Boolean).join(" · ")}</Text>
    </View></View>;
  }
  const service: ServiceView = event.service;
  const facts = [service.time ? formatClock(service.time) : "", service.place ? `${t("service.place")}: ${service.place}` : "", service.duration ? `${t("service.duration")}: ${service.duration}` : "", service.mode ? t(`service.${service.mode as "compartido" | "privado"}`) : "", service.operator ? `${t("service.provider")}: ${service.operator}` : "", service.endDate && service.endDate !== service.date ? t("service.until", { date: formatTripDate(service.endDate, "es", "dayMonth") }) : ""].filter(Boolean);
  return <View style={s.agendaRow} wrap={false}>{day}<View style={{ flex: 1 }}>
    <Text style={s.kicker}>{upper(t(`service.${service.kind}`))}</Text>
    <Text style={{ ...s.bold, marginTop: 1 }}>{service.title}</Text>
    {service.description ? <Text style={{ marginTop: 1 }}>{service.description}</Text> : null}
    {facts.length ? <Text style={{ ...s.small, ...s.muted, marginTop: 2 }}>{facts.join(" · ")}</Text> : null}
    {service.included.length ? <Text style={{ ...s.small, marginTop: 2 }}><Text style={s.bold}>{t("hotel.included")}: </Text>{service.included.join(" · ")}</Text> : null}
  </View></View>;
}

function Baggage({ view, t }: { view: TripView; t: Copy }) {
  if (!view.baggage.length) return null;
  const state = (value: string) => value ? t(`baggage.${value as "incluido" | "no_incluido" | "con_cargo"}`) : t("baggage.unknown");
  return <View wrap={false}>
    <Text style={s.h2}>Equipaje</Text>
    <View style={s.table}>
      <View style={s.th}>
        <Text style={{ ...s.label, width: 120 }}>APLICA A</Text>
        <Text style={{ ...s.label, flex: 1 }}>ARTÍCULO PERSONAL</Text>
        <Text style={{ ...s.label, flex: 1 }}>EQUIPAJE DE MANO</Text>
        <Text style={{ ...s.label, flex: 1 }}>EQUIPAJE DOCUMENTADO</Text>
      </View>
      {view.baggage.map((bag, index) => <View key={index} style={{ ...s.tr, flexWrap: "wrap" }}>
        <Text style={{ width: 120, fontWeight: 700, paddingRight: 8 }}>{bag.scope || "Todos los vuelos"}</Text>
        {bag.pieces.map(piece => <Text key={piece.kind} style={{ flex: 1, paddingRight: 6, color: piece.state === "incluido" ? c.ink : c.inkSoft, fontWeight: piece.state === "incluido" ? 600 : 400 }}>{state(piece.state)}{piece.state === "incluido" ? [piece.pieces ? t("baggage.pieces", { count: piece.pieces }) : "", piece.weight, piece.size].filter(Boolean).map(value => `, ${value}`).join("") : ""}</Text>)}
        {bag.notes ? <Text style={{ width: "100%", ...s.small, ...s.muted, marginTop: 3 }}>{bag.notes}</Text> : null}
      </View>)}
    </View>
    {view.separateTickets ? <Text style={{ ...s.small, ...s.muted, marginTop: 6 }}>{t("flight.separateTickets")}</Text> : null}
  </View>;
}

// ---------------------------------------------------------------------------------------------------------

export function itineraryView(r: Reservation, travel: PublicTravel, today = hondurasToday()): TripView {
  return reservationTripView(r, travel, today);
}

// `photo`: the bytes of the destination's photo from public/destinos, or null for the typographic cover.
export function ItineraryDocument({ view, customerName, revision, today = hondurasToday(), photo = null, photoCredit = "" }: { view: TripView; customerName: string; revision: number; today?: string; photo?: Buffer | null; photoCredit?: string }) {
  const t = tripCopy();
  const isAgenda = (event: TripEvent): event is Extract<TripEvent, { kind: "service" | "ferry" }> => event.kind === "service" || event.kind === "ferry";
  const agenda = [...view.timeline.flatMap(entry => entry.type === "day" ? entry.events.filter(isAgenda) : []), ...view.undated.filter(isAgenda)];
  const notes = [
    t("prepare.documents"),
    "Verifique los requisitos de entrada del destino y de los países de conexión, y confírmelos con la autoridad oficial.",
    ...(view.hasFlights ? ["Haga el check-in en línea cuando la aerolínea lo habilite y llegue al aeropuerto con tiempo.", "La aerolínea puede cambiar horarios. Revise el estado de su vuelo antes de salir."] : []),
    "Sus boletos electrónicos y las confirmaciones de los proveedores son los documentos que acreditan cada servicio.",
  ];
  return <Document title={`Itinerario ${view.reference} · ${view.destination}`} author="viatour" subject="Itinerario de viaje" language="es">
    <Cover view={view} customerName={customerName} photo={photo} photoCredit={photoCredit} today={today} t={t} />
    <Page size="LETTER" style={s.page}>
      <View fixed style={s.header}><Text>viatour · Itinerario · {view.destination}</Text><Text>Reserva {view.reference}</Text></View>

      <Travelers view={view} t={t} />
      <FlightSummary view={view} t={t} />
      <Baggage view={view} t={t} />
      <View wrap={false}>
        <Text style={s.h2}>Antes de viajar</Text>
        {notes.map(item => <View key={item} style={s.note}><Text style={s.bullet}>•</Text><Text style={{ flex: 1 }}>{item}</Text></View>)}
      </View>

      {view.journeys.length ? <View break>
        <Text style={{ ...s.h2, marginTop: 0 }}>Detalle de vuelos</Text>
        {view.journeys.map(journey => <JourneyDetail key={journey.id} journey={journey} t={t} />)}
      </View> : null}

      {view.hotels.length || agenda.length ? <View>
        {/* The heading travels with the first block (react-pdf ignores minPresenceAhead before an unbreakable view). */}
        <View wrap={false}>
          <Text style={s.h2}>Estadía y servicios</Text>
          {view.hotels[0] ? <HotelBlock hotel={view.hotels[0]} t={t} /> : null}
        </View>
        {view.hotels.slice(1).map(hotel => <HotelBlock key={hotel.id} hotel={hotel} t={t} />)}
        {agenda.length ? <View style={{ borderTopWidth: 1, borderTopColor: c.ink }}>{agenda.map((event, index) => <AgendaRow key={index} event={event} t={t} />)}</View> : null}
      </View> : null}

      <View style={s.contact} wrap={false}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: 800 }}>Asistencia antes y durante su viaje</Text>
          <Text style={{ ...s.small, ...s.muted, marginTop: 3 }}>Su asesor de viatour le acompaña en todo el viaje. Escríbanos por WhatsApp o desde Mensajes en Mi viaje e indique la reserva {view.reference}. Si un vuelo cambia o se retrasa, la aerolínea puede reacomodarle en el aeropuerto; avísenos también para ayudarle.</Text>
          <Link src={agencyContact.portal} style={{ ...s.small, color: c.brand, marginTop: 3, textDecoration: "none" }}>{agencyContact.portal.replace("https://", "")}</Link>
        </View>
        <View style={{ width: 92 }}><Text style={s.label}>WHATSAPP</Text><Text style={{ ...s.bold, marginTop: 2 }}>{agencyContact.whatsapp}</Text></View>
        <View style={{ width: 130 }}><Text style={s.label}>CORREO</Text><Text style={{ ...s.bold, marginTop: 2 }}>{agencyContact.email}</Text></View>
      </View>

      <View fixed style={s.footerRule} />
      <Text fixed style={s.footer} render={({ pageNumber, totalPages }) => `viatour · ${agencyContact.web} · Reserva ${view.reference} · Horarios locales de cada aeropuerto · Versión ${revision} · Página ${pageNumber} de ${totalPages}`} />
    </Page>
  </Document>;
}

export async function renderItineraryPdf(r: Reservation, travel: PublicTravel, revision: number, today?: string) {
  if (!r.accepted_snapshot?.quotation?.detalles) throw Error("Falta el itinerario aceptado.");
  registerPdfFont();
  const date = today ?? hondurasToday();
  const view = itineraryView(r, travel, date);
  if (!view.timeline.length && !view.undated.length) throw Error("El itinerario no tiene servicios con datos suficientes.");
  const photo = destinationPhoto(r.destino);
  // Licensed photos (CC BY / BY-SA) carry their author and license on the page where they appear.
  const credit = creditsFor([photo])[0];
  const photoCredit = credit ? `Foto: ${credit.autor} · ${credit.licencia} · Wikimedia Commons` : "";
  // Read as bytes, like the logo: react-pdf treats a Windows path ("C:\...") as a URL and drops the image.
  const bytes = photo ? (() => { try { return readFileSync(join(process.cwd(), "public", photo)); } catch { return null; } })() : null;
  return renderToBuffer(<ItineraryDocument view={view} customerName={r.cliente_nombre} revision={revision} today={date} photo={bytes} photoCredit={photoCredit} />);
}
