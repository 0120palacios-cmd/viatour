import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Circle, Document, Font, Image, Link, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { airportName, cityName, dayDifference, formatDuration, itineraryType, journeyAirlines, journeyDuration, journeyRoute, journeyTitle, layoverMinutes, segmentDuration, type FlightJourney, type FlightSegment } from "@/lib/flight-itinerary";
import { derivedTripDates, formatInstant, isExpired, nights, pricingSummary, quotationKindLabels, zoneLabel, type BaggageAllowance, type FareRules, type HotelStay } from "@/lib/quotation-details";
import type { QuotationRecord } from "@/lib/quotation-data";
import { isDiscount, lineAmount } from "@/lib/money";
import { formatQuotationAmount, quotationNotices } from "@/lib/quotation-types";
import { siteConfig } from "@/lib/site-config";
import { baggageLine, passengerSummary } from "@/lib/quotation-text";

export { baggageLine };

// Customer-facing quotation PDF. Only customer-facing fields are read here: internal notes and the
// pasted source text are never rendered. The layout aims for one Letter page; when the content does not
// fit, a compact spacing is tried and, failing that, the regular layout continues on further pages with
// a running header. renderQuotationPdf measures the real page count instead of estimating it, and the
// type is never shrunk below the compact sizes.

const fontDir = join(process.cwd(), "src", "assets", "fonts");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({ family: "Manrope", fonts: [400, 500, 600, 700, 800].map(weight => ({ src: join(fontDir, `manrope-${weight}.woff`), fontWeight: weight })) });
  // Words are never hyphenated; long airport names wrap at spaces.
  Font.registerHyphenationCallback(word => [word]);
  fontsReady = true;
}

const color = { ink: "#12161C", soft: "#5A6672", surface: "#F5F7F8", line: "#E4E8EB", brand: "#1656D6", deep: "#103FAE", tint: "#E9F0FE", success: "#16A34A", error: "#DC2626", white: "#FFFFFF", onDeep: "#C9D6F5" };

// react-pdf resolves an inherited unitless lineHeight against the parent's font size, so every text
// style carries its own absolute line height.
const tx = (size: number, extra: Record<string, unknown> = {}, ratio = 1.32) => ({ fontSize: size, lineHeight: `${Math.round(size * ratio * 10) / 10}pt`, ...extra });

function makeStyles(compact: boolean) {
  const gap = compact ? 6 : 10;
  const pad = compact ? 6 : 8;
  return StyleSheet.create({
    page: { paddingTop: compact ? 22 : 26, paddingBottom: 40, paddingHorizontal: 32, fontFamily: "Manrope", color: color.ink, ...tx(8.5) },
    running: { position: "absolute", top: 12, left: 32, right: 32, color: color.soft, ...tx(7) },
    logo: { width: 92, height: 30, objectFit: "contain", marginRight: 18 },
    preview: { backgroundColor: color.surface, borderLeft: `3 solid ${color.soft}`, paddingVertical: 4, paddingHorizontal: 8, color: color.soft, marginBottom: 7, ...tx(7.5) },
    expired: { backgroundColor: "#FDECEC", borderLeft: `3 solid ${color.error}`, paddingVertical: 5, paddingHorizontal: 8, color: color.error, fontWeight: 700, marginBottom: 7, ...tx(8) },
    meta: { flexDirection: "row", alignItems: "center", backgroundColor: color.deep, borderRadius: 6, paddingVertical: compact ? 7 : 9, paddingHorizontal: 14, marginBottom: gap },
    metaCell: { flex: 1, paddingRight: 8 },
    metaLabel: { color: color.onDeep, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, ...tx(6.5) },
    metaValue: { color: color.white, fontWeight: 600, ...tx(9) },
    metaAccent: { color: color.white, fontWeight: 800, ...tx(9.5) },
    metaNote: { color: color.onDeep, ...tx(7.2) },
    summary: { flexDirection: "row", gap: 10, marginBottom: gap },
    summaryBox: { flex: 1, border: `1 solid ${color.line}`, borderRadius: 6, padding: pad },
    totalBox: { width: 150, backgroundColor: color.tint, borderRadius: 6, padding: pad, justifyContent: "center" },
    label: { color: color.soft, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 1, ...tx(6.5) },
    strong: { fontWeight: 700, ...tx(10) },
    body: { ...tx(8) },
    bodyBold: { fontWeight: 700, ...tx(8) },
    small: { color: color.soft, ...tx(7.5) },
    totalValue: { fontWeight: 800, color: color.deep, letterSpacing: -0.2, ...tx(15, {}, 1.2) },
    section: { marginBottom: gap },
    sectionTitle: { fontWeight: 800, marginBottom: compact ? 3 : 4, paddingBottom: 2, borderBottom: `1 solid ${color.line}`, ...tx(10) },
    journey: { border: `1 solid ${color.line}`, borderRadius: 6, marginBottom: compact ? 5 : 7 },
    journeyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: color.surface, paddingVertical: compact ? 3 : 4, paddingHorizontal: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottom: `1 solid ${color.line}` },
    journeyTitle: { fontWeight: 800, color: color.deep, textTransform: "uppercase", letterSpacing: 0.6, ...tx(7.8) },
    journeyDate: { fontWeight: 600, ...tx(7.8) },
    journeyFacts: { color: color.soft, ...tx(7.3) },
    journeyBody: { paddingHorizontal: 10, paddingVertical: compact ? 2 : 4 },
    segment: { flexDirection: "row", alignItems: "center", paddingVertical: compact ? 1.5 : 2.5 },
    point: { flex: 1 },
    pointRight: { flex: 1, alignItems: "flex-end" },
    time: { fontWeight: 800, letterSpacing: -0.2, ...tx(compact ? 11.5 : 12.5, {}, 1.15) },
    plus: { fontWeight: 700, color: color.deep, ...tx(7) },
    city: { fontWeight: 700, ...tx(8) },
    code: { color: color.deep },
    airport: { color: color.soft, ...tx(6.8) },
    airportRight: { color: color.soft, textAlign: "right", ...tx(6.8) },
    middle: { width: 62, alignItems: "center" },
    duration: { color: color.soft, marginBottom: 1, ...tx(7) },
    track: { flexDirection: "row", alignItems: "center" },
    trackLine: { width: 20, height: 1, backgroundColor: color.line },
    flightMeta: { width: 142, marginLeft: 10, paddingLeft: 9, borderLeft: `1 solid ${color.line}` },
    flightNumber: { fontWeight: 800, color: color.deep, ...tx(9) },
    flightDetail: { color: color.soft, ...tx(7.2) },
    layover: { flexDirection: "row", alignItems: "center", gap: 5, marginVertical: compact ? 2 : 3, paddingVertical: 2.5, paddingHorizontal: 8, borderRadius: 4, border: `1 dashed ${color.line}`, backgroundColor: color.surface },
    layoverText: { ...tx(7.3) },
    columns: { flexDirection: "row", gap: 10 },
    card: { flex: 1, border: `1 solid ${color.line}`, borderRadius: 6, padding: pad },
    cardTitle: { fontWeight: 700, color: color.soft, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3, ...tx(6.8) },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: compact ? 0.6 : 1.3, borderBottom: `0.5 solid ${color.line}` },
    rowLast: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: compact ? 0.6 : 1.3 },
    grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 8 },
    gridCell: { width: "31%", paddingVertical: compact ? 1 : 1.8, borderBottom: `0.5 solid ${color.line}` },
    gridKey: { color: color.soft, ...tx(6.5) },
    gridValue: { fontWeight: 600, ...tx(7.6) },
    scope: { fontWeight: 700, color: color.deep, marginTop: 3, ...tx(7.4) },
    bag: { flexDirection: "row", gap: 5, alignItems: "flex-start", paddingVertical: compact ? 1 : 1.5 },
    bagIcon: { marginTop: 1.5 },
    bagText: { flex: 1, ...tx(7.8) },
    hotel: { flexDirection: "row", gap: 10, border: `1 solid ${color.line}`, borderRadius: 6, padding: pad, marginBottom: compact ? 5 : 7 },
    hotelPhoto: { width: compact ? 150 : 170, height: compact ? 100 : 116, borderRadius: 4, objectFit: "cover" },
    thumbs: { flexDirection: "row", gap: 4, marginTop: compact ? 3 : 4 },
    thumb: { width: compact ? 47 : 54, height: compact ? 32 : 38, borderRadius: 3, objectFit: "cover" },
    caption: { color: color.soft, marginTop: 2, width: compact ? 150 : 170, ...tx(6.5) },
    hotelName: { fontWeight: 800, ...tx(11, {}, 1.2) },
    stay: { flexDirection: "row", gap: 6, marginVertical: 4 },
    stayCell: { flex: 1, backgroundColor: color.surface, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6 },
    amenities: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 1 },
    amenity: { flexDirection: "row", alignItems: "center", gap: 3 },
    amenityText: { ...tx(7.4) },
    table: { borderTop: `1.2 solid ${color.ink}` },
    tableHead: { flexDirection: "row", paddingVertical: 2.5, borderBottom: `0.5 solid ${color.line}` },
    tableRow: { flexDirection: "row", paddingVertical: compact ? 2 : 3, borderBottom: `0.5 solid ${color.line}` },
    th: { color: color.soft, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, ...tx(6.3) },
    cConcept: { flex: 1, paddingRight: 6 },
    cQty: { width: 28, textAlign: "right" },
    cUnit: { width: 74, textAlign: "right" },
    cSub: { width: 78, textAlign: "right" },
    td: { ...tx(7.8) },
    tdStrong: { fontWeight: 700, ...tx(7.8) },
    tdSoft: { color: color.soft, ...tx(6.6) },
    totals: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 },
    totalLine: { flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", gap: 10 },
    totalLabel: { fontWeight: 700, ...tx(9) },
    grandTotal: { fontWeight: 800, letterSpacing: -0.2, ...tx(14, {}, 1.2) },
    notice: { flex: 1, backgroundColor: color.tint, borderRadius: 6, padding: pad },
    noticeTitle: { fontWeight: 800, color: color.deep, marginBottom: 2, ...tx(8.5) },
    noticeLine: { flexDirection: "row", marginBottom: compact ? 1 : 1.5 },
    bullet: { width: 7, ...tx(7.4) },
    noticeText: { flex: 1, ...tx(7.4) },
    terms: { flexDirection: "row", gap: 12 },
    termsColumn: { flex: 1.45 },
    term: { flexDirection: "row", marginBottom: compact ? 1 : 2 },
    termNumber: { width: 11, fontWeight: 700, color: color.deep, ...tx(7.1, {}, 1.26) },
    termText: { flex: 1, ...tx(7.1, {}, 1.26) },
    remarks: { backgroundColor: color.surface, borderRadius: 4, padding: 6, ...tx(7.8) },
    cta: { flexDirection: "row", alignItems: "center", gap: 7, borderTop: `1 solid ${color.line}`, paddingTop: compact ? 4 : 6 },
    ctaText: { fontWeight: 600, flex: 1, color: color.ink, textDecoration: "none", ...tx(8.2) },
    footerLeft: { position: "absolute", top: 762, left: 32, right: 32, borderTop: `0.5 solid ${color.line}`, paddingTop: 4, color: color.soft, ...tx(6.8) },
    footerRight: { position: "absolute", top: 766, right: 32, color: color.soft, ...tx(6.8) },
  });
}
type Styles = ReturnType<typeof makeStyles>;

// Lucide icon paths (24 x 24, stroke 2), the same icon family as the site.
function Icon({ name, size = 9, stroke = color.soft }: { name: "check" | "x" | "plus" | "clock" | "plane" | "message"; size?: number; stroke?: string }) {
  const common = { stroke, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    {name === "check" && <Path d="M20 6 9 17l-5-5" {...common} />}
    {name === "x" && <><Path d="M18 6 6 18" {...common} /><Path d="m6 6 12 12" {...common} /></>}
    {name === "plus" && <><Path d="M5 12h14" {...common} /><Path d="M12 5v14" {...common} /></>}
    {name === "clock" && <><Circle cx="12" cy="12" r="10" {...common} /><Path d="M12 6v6l4 2" {...common} /></>}
    {name === "plane" && <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" {...common} />}
    {name === "message" && <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" {...common} />}
  </Svg>;
}

const longDate = (value: string) => value ? new Intl.DateTimeFormat("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "";
const shortDate = (value: string) => value ? new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "";
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const expiryDate = (value: string, zone: string) => new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "long", year: "numeric", timeZone: zone }).format(new Date(value));
const expiryTime = (value: string, zone: string) => new Intl.DateTimeFormat("es-HN", { hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(value));

const refundLabel = { reembolsable: "Reembolsable", no_reembolsable: "No reembolsable", parcial: "Reembolso parcial", "": "" } as const;
const taxLabel = { incluidos: "Impuestos incluidos", no_incluidos: "Impuestos no incluidos", parcial: "Impuestos incluidos parcialmente", "": "" } as const;

function Segment({ segment, styles }: { segment: FlightSegment; styles: Styles }) {
  const days = dayDifference(segment.salidaFecha, segment.llegadaFecha) ?? 0;
  const duration = formatDuration(segmentDuration(segment));
  return <View style={styles.segment} wrap={false}>
    <View style={styles.point}>
      <Text style={styles.time}>{segment.salidaHora}</Text>
      <Text style={styles.city}>{cityName(segment.origen, segment.origenNombre)} <Text style={styles.code}>{segment.origen}</Text></Text>
      <Text style={styles.airport}>{airportName(segment.origen, segment.origenNombre)}</Text>
    </View>
    <View style={styles.middle}>
      {duration ? <Text style={styles.duration}>{duration}</Text> : null}
      <View style={styles.track}><View style={styles.trackLine} /><Icon name="plane" size={9} stroke={color.deep} /><View style={styles.trackLine} /></View>
    </View>
    <View style={styles.pointRight}>
      <Text style={styles.time}>{segment.llegadaHora}{days !== 0 ? <Text style={styles.plus}>{` ${days > 0 ? "+" : ""}${days}`}</Text> : null}</Text>
      <Text style={styles.city}>{cityName(segment.destino, segment.destinoNombre)} <Text style={styles.code}>{segment.destino}</Text></Text>
      <Text style={styles.airportRight}>{airportName(segment.destino, segment.destinoNombre)}</Text>
    </View>
    <View style={styles.flightMeta}>
      <Text style={styles.flightNumber}>{segment.vuelo || "Vuelo por confirmar"}</Text>
      <Text style={styles.flightDetail}>{[segment.aerolinea, segment.cabina].filter(Boolean).join(" · ")}</Text>
      {segment.aeronave ? <Text style={styles.flightDetail}>{segment.aeronave}</Text> : null}
      {segment.operadoPor && segment.operadoPor !== segment.aerolinea ? <Text style={styles.flightDetail}>Operado por {segment.operadoPor}</Text> : null}
      {days > 0 ? <Text style={styles.flightDetail}>Llega el {longDate(segment.llegadaFecha)}</Text> : null}
    </View>
  </View>;
}

function Journey({ journey, index, styles }: { journey: FlightJourney; index: number; styles: Styles }) {
  const stops = journey.segmentos.length - 1;
  const total = formatDuration(journeyDuration(journey));
  const facts = [journeyRoute(journey), stops ? plural(stops, "escala", "escalas") : "Directo", total ? `Duración total ${total}` : ""].filter(Boolean).join(" · ");
  return <View style={styles.journey} wrap={false}>
    <View style={styles.journeyHead}>
      <Text><Text style={styles.journeyTitle}>{journeyTitle(journey, index)}</Text><Text style={styles.journeyDate}>{`   ${longDate(journey.segmentos[0]?.salidaFecha ?? "")}`}</Text></Text>
      <Text style={styles.journeyFacts}>{facts}</Text>
    </View>
    <View style={styles.journeyBody}>
      {journey.segmentos.map((segment, position) => {
        const previous = journey.segmentos[position - 1];
        const wait = previous ? layoverMinutes(previous, segment) : null;
        const sameAirport = previous && previous.destino === segment.origen;
        return <View key={segment.id || position}>
          {previous ? <View style={styles.layover} wrap={false}>
            <Icon name="clock" size={8} />
            <Text style={styles.layoverText}>{sameAirport ? `Conexión en ${cityName(segment.origen, segment.origenNombre)} (${segment.origen})` : `Conexión con cambio de aeropuerto: de ${previous.destino} a ${segment.origen}`}{wait !== null && wait > 0 ? ` · espera de ${formatDuration(wait)}` : ""}</Text>
          </View> : null}
          <Segment segment={segment} styles={styles} />
        </View>;
      })}
    </View>
  </View>;
}

function FareCard({ fares, styles }: { fares: FareRules[]; styles: Styles }) {
  return <View style={[styles.card, { flex: 1.5 }]}>
    <Text style={styles.cardTitle}>Detalles de la tarifa</Text>
    {fares.map((fare, index) => {
      const rows = [["Aerolínea", fare.aerolinea], ["Operado por", fare.operadoPor], ["Cabina", fare.cabina], ["Tipo de tarifa", fare.tipoTarifa], ["Clase", fare.claseReserva], ["Cambios", fare.cambios], ["Cancelación", fare.cancelacion], ["Reembolso", refundLabel[fare.reembolso]], ["Asientos", fare.asientos], ["Restricciones", fare.restricciones]].filter(([, value]) => value);
      return <View key={fare.id}>
        {fares.length > 1 ? <Text style={styles.scope}>{fare.alcance || `Tarifa ${index + 1}`}</Text> : null}
        <View style={styles.grid}>{rows.map(([key, value]) => <View key={key} style={styles.gridCell} wrap={false}><Text style={styles.gridKey}>{key}</Text><Text style={styles.gridValue}>{value}</Text></View>)}</View>
      </View>;
    })}
  </View>;
}

function BaggageCard({ allowances, styles }: { allowances: BaggageAllowance[]; styles: Styles }) {
  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Franquicia de equipaje</Text>
    {allowances.map((bag, index) => <View key={bag.id}>
      {allowances.length > 1 ? <Text style={styles.scope}>{bag.alcance || `Equipaje ${index + 1}`}</Text> : null}
      {(["personal", "mano", "documentado"] as const).map(key => {
        const line = baggageLine(key, bag[key]);
        if (!line) return null;
        const state = bag[key].estado;
        return <View key={key} style={styles.bag}><View style={styles.bagIcon}><Icon name={state === "incluido" ? "check" : state === "con_cargo" ? "plus" : "x"} size={8} stroke={state === "incluido" ? color.success : color.soft} /></View><Text style={styles.bagText}>{line}</Text></View>;
      })}
      {bag.adicional ? <Text style={styles.small}>{bag.adicional}</Text> : null}
      {bag.notas ? <Text style={styles.small}>{bag.notas}</Text> : null}
    </View>)}
  </View>;
}

export type PdfPhoto = { data: Buffer; format: "jpg" | "png" };

function Hotel({ hotel, photos, styles }: { hotel: HotelStay; photos: Map<string, PdfPhoto>; styles: Styles }) {
  const available = hotel.fotos.filter(photo => photos.has(photo.path));
  const [primary, ...others] = available;
  const stay = nights(hotel.checkIn, hotel.checkOut);
  const amenities = hotel.amenidades.split("\n").map(line => line.trim()).filter(Boolean).slice(0, 12);
  const people = (adults: number, children: number, ages: string) => [adults ? plural(adults, "adulto", "adultos") : "", children ? `${plural(children, "niño", "niños")}${ages ? ` (${ages})` : ""}` : ""].filter(Boolean).join(" y ");
  return <View style={styles.hotel} wrap={false}>
    {primary ? <View>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt attribute */}
      <Image src={photos.get(primary.path)!} style={styles.hotelPhoto} />
      {primary.leyenda ? <Text style={styles.caption}>{primary.leyenda}</Text> : null}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt attribute */}
      {others.length ? <View style={styles.thumbs}>{others.slice(0, 3).map(photo => <Image key={photo.path} src={photos.get(photo.path)!} style={styles.thumb} />)}</View> : null}
    </View> : null}
    <View style={{ flex: 1 }}>
      <Text style={styles.hotelName}>{hotel.nombre || "Hotel por confirmar"}</Text>
      <Text style={styles.small}>{[hotel.destino, hotel.direccion].filter(Boolean).join(" · ")}</Text>
      <View style={styles.stay}>
        <View style={styles.stayCell}><Text style={styles.label}>Entrada</Text><Text style={styles.bodyBold}>{shortDate(hotel.checkIn) || "Por confirmar"}</Text></View>
        <View style={styles.stayCell}><Text style={styles.label}>Salida</Text><Text style={styles.bodyBold}>{shortDate(hotel.checkOut) || "Por confirmar"}</Text></View>
        <View style={styles.stayCell}><Text style={styles.label}>Estadía</Text><Text style={styles.bodyBold}>{stay ? plural(stay, "noche", "noches") : "Por confirmar"}</Text></View>
      </View>
      {hotel.habitaciones.map(room => <Text key={room.id} style={styles.body}><Text style={styles.bodyBold}>{room.cantidad} × {room.categoria || "Habitación"}</Text>{[room.camas, people(room.adultos, room.ninos, room.edadesNinos)].filter(Boolean).map(part => ` · ${part}`).join("")}</Text>)}
      {hotel.planComidas || hotel.impuestos || hotel.cargoResort || hotel.reembolso ? <Text style={[styles.body, { marginTop: 2 }]}>{[hotel.planComidas ? `Plan: ${hotel.planComidas}` : "", taxLabel[hotel.impuestos], hotel.cargoResort, refundLabel[hotel.reembolso]].filter(Boolean).join(" · ")}</Text> : null}
      {amenities.length ? <View style={[styles.amenities, { marginTop: 3 }]}>{amenities.map(item => <View key={item} style={styles.amenity}><Icon name="check" size={7} stroke={color.success} /><Text style={styles.amenityText}>{item}</Text></View>)}</View> : null}
      {hotel.cancelacion ? <Text style={[styles.small, { marginTop: 3 }]}><Text style={{ fontWeight: 700, color: color.ink }}>Cancelación: </Text>{hotel.cancelacion}</Text> : null}
      {hotel.condiciones ? <Text style={styles.small}>{hotel.condiciones}</Text> : null}
    </View>
  </View>;
}

function Pricing({ record, styles }: { record: QuotationRecord; styles: Styles }) {
  const { quotation, items, details } = record;
  const summary = pricingSummary(items, details);
  const money = (amount: number) => formatQuotationAmount(amount, quotation.moneda);
  const currencyName = quotation.moneda === "USD" ? "dólares estadounidenses (USD)" : "lempiras (HNL)";
  return <View>
    <View style={styles.table}>
      <View style={styles.tableHead}><Text style={[styles.th, styles.cConcept]}>Concepto</Text><Text style={[styles.th, styles.cQty]}>Cant.</Text><Text style={[styles.th, styles.cUnit]}>Precio unit.</Text><Text style={[styles.th, styles.cSub]}>Subtotal</Text></View>
      {items.map((item, index) => <View key={item.id ?? index} style={styles.tableRow} wrap={false}>
        <View style={styles.cConcept}><Text style={styles.td}>{item.descripcion}</Text>{item.tipo && item.tipo !== item.descripcion && !item.descripcion.startsWith(item.tipo) ? <Text style={styles.tdSoft}>{item.tipo}</Text> : null}</View>
        <Text style={[styles.td, styles.cQty]}>{Number(item.cantidad).toLocaleString("es-HN")}</Text>
        <Text style={[styles.td, styles.cUnit]}>{isDiscount(item.tipo) ? "– " : ""}{money(Number(item.precio_unitario))}</Text>
        <Text style={[styles.tdStrong, styles.cSub]}>{isDiscount(item.tipo) ? "– " : ""}{money(Math.abs(lineAmount(item)))}</Text>
      </View>)}
    </View>
    <View style={styles.totals}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.small}>Precios en {currencyName}.</Text>
        {summary.porPasajero !== null ? <Text style={styles.small}>Equivale a {money(summary.porPasajero)} por pasajero.</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {summary.descuentos > 0 ? <View style={styles.totalLine}><Text style={styles.small}>Subtotal</Text><Text style={styles.td}>{money(summary.subtotal)}</Text></View> : null}
        {summary.descuentos > 0 ? <View style={styles.totalLine}><Text style={styles.small}>Descuentos</Text><Text style={styles.td}>– {money(summary.descuentos)}</Text></View> : null}
        <View style={styles.totalLine}><Text style={styles.totalLabel}>Total</Text><Text style={styles.grandTotal}>{money(summary.total)}</Text></View>
        {summary.deposito !== null ? <View style={styles.totalLine}><Text style={styles.small}>Anticipo{details.pago.depositoFecha ? ` antes del ${shortDate(details.pago.depositoFecha)}` : ""}</Text><Text style={styles.tdStrong}>{money(summary.deposito)}</Text></View> : null}
        {summary.saldo !== null ? <View style={styles.totalLine}><Text style={styles.small}>Saldo{details.pago.saldoFecha ? ` antes del ${shortDate(details.pago.saldoFecha)}` : ""}</Text><Text style={styles.tdStrong}>{money(summary.saldo)}</Text></View> : null}
      </View>
    </View>
    {details.pago.instrucciones ? <Text style={[styles.remarks, { marginTop: 4 }]}><Text style={{ fontWeight: 700 }}>Pago: </Text>{details.pago.instrucciones}</Text> : null}
  </View>;
}

function Notices({ record, validUntil, styles }: { record: QuotationRecord; validUntil: string; styles: Styles }) {
  const { validez } = record.details;
  const lines = [
    validez.nota,
    validez.limitePago ? `Fecha límite de pago: ${formatInstant(validez.limitePago, validez.zona)}.` : "",
    validez.limiteEmision ? `Fecha límite de emisión: ${formatInstant(validez.limiteEmision, validez.zona)}.` : "",
    ...quotationNotices(validUntil || "la fecha indicada"),
  ].filter(Boolean);
  return <View style={styles.notice}>
    <Text style={styles.noticeTitle}>Importante</Text>
    {lines.map(line => <View key={line} style={styles.noticeLine}><Text style={styles.bullet}>•</Text><Text style={styles.noticeText}>{line}</Text></View>)}
  </View>;
}

// The approved "Importante" notes sit beside the numbered conditions. The block is never split across
// pages: react-pdf overlaps the text of side-by-side columns that break.
function Conditions({ record, validUntil, styles }: { record: QuotationRecord; validUntil: string; styles: Styles }) {
  const clauses = record.details.condiciones;
  return <View style={styles.section} wrap={false}>
    <Text style={styles.sectionTitle}>Condiciones de la cotización</Text>
    <View style={styles.terms}>
      <Notices record={record} validUntil={validUntil} styles={styles} />
      {clauses.length ? <View style={styles.termsColumn}>{clauses.map((clause, index) => <View key={index} style={styles.term}><Text style={styles.termNumber}>{index + 1}.</Text><Text style={styles.termText}>{clause}</Text></View>)}</View> : null}
    </View>
  </View>;
}

export type PdfOptions = { photos?: Map<string, PdfPhoto>; preview?: boolean; now?: Date; issuedAt?: string; versionNumber?: number };

function QuotationDocument({ record, options, compact }: { record: QuotationRecord; options: PdfOptions; compact: boolean }) {
  const styles = makeStyles(compact);
  const { quotation, details, kind, expiry } = record;
  const photos = options.photos ?? new Map<string, PdfPhoto>();
  const expired = isExpired(expiry, options.now ?? new Date());
  const zone = details.validez.zona;
  const validUntil = formatInstant(expiry, zone);
  const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo-white.png")).toString("base64")}`;
  const issued = new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "long", year: "numeric", timeZone: zone }).format(new Date(options.issuedAt ?? quotation.created_at));
  const journeys = details.vuelos.journeys.filter(journey => journey.segmentos.length);
  const showFlights = (kind === "vuelo" || kind === "paquete") && journeys.length > 0;
  const showHotels = (kind === "hotel" || kind === "paquete") && details.hoteles.length > 0;
  const trip = derivedTripDates(details);
  const summary = pricingSummary(record.items, details);
  const travellers = passengerSummary(details);
  const subtitle = [quotationKindLabels[kind], showFlights ? itineraryType(journeys) : ""].filter(Boolean).join(" · ");
  const airlinesText = showFlights ? Array.from(new Set(journeys.flatMap(journeyAirlines))).join(" / ") : "";
  const whatsapp = `+504 ${siteConfig.whatsappNumber.slice(3, 7)}-${siteConfig.whatsappNumber.slice(7)}`;
  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`Hola, quisiera confirmar la cotización ${quotation.codigo}.`)}`;
  return <Document title={`Cotización ${quotation.codigo}`} author="viatour" subject={`Cotización de viaje: ${quotation.destino}`} language="es-HN">
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.running} fixed render={({ pageNumber }) => pageNumber > 1 ? `Cotización ${quotation.codigo} · ${quotation.cliente_nombre} (continuación)` : ""} />
      <View style={styles.meta}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf images have no alt attribute */}
        <Image src={logo} style={styles.logo} />
        <View style={styles.metaCell}><Text style={styles.metaLabel}>Cotización de viaje</Text><Text style={styles.metaValue}>{quotation.codigo}</Text>{options.versionNumber ? <Text style={styles.metaNote}>Versión {options.versionNumber}</Text> : null}</View>
        <View style={styles.metaCell}><Text style={styles.metaLabel}>Fecha de emisión</Text><Text style={styles.metaValue}>{issued}</Text></View>
        <View style={[styles.metaCell, { flex: 1.5 }]}><Text style={styles.metaLabel}>Cotización válida hasta</Text><Text style={styles.metaAccent}>{expiry ? expiryDate(expiry, zone) : "Por confirmar"}</Text>{expiry ? <Text style={styles.metaNote}>{expiryTime(expiry, zone)} ({zoneLabel(zone)})</Text> : null}</View>
      </View>
      {options.preview ? <Text style={styles.preview}>Vista previa del borrador. Revise la información antes de enviarla al cliente.</Text> : null}
      {expired ? <Text style={styles.expired}>Esta cotización venció el {validUntil}. Solicite a su asesor una cotización actualizada.</Text> : null}
      <View style={styles.summary}>
        <View style={styles.summaryBox}>
          <Text style={styles.label}>Preparada para</Text>
          <Text style={styles.strong}>{quotation.cliente_nombre}</Text>
          <Text style={styles.small}>{[quotation.cliente_email, quotation.cliente_telefono].filter(Boolean).join(" · ")}</Text>
          {travellers ? <Text style={styles.small}>Pasajeros: {travellers}</Text> : null}
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.label}>{subtitle}</Text>
          <Text style={styles.strong}>{quotation.destino}</Text>
          <Text style={styles.small}>{[trip.salida ? shortDate(trip.salida) : "", trip.regreso ? shortDate(trip.regreso) : ""].filter(Boolean).join(" – ")}</Text>
          {details.origen || airlinesText ? <Text style={styles.small}>{[details.origen ? `Desde ${details.origen}` : "", airlinesText].filter(Boolean).join(" · ")}</Text> : null}
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.label}>Total ({quotation.moneda})</Text>
          <Text style={styles.totalValue}>{formatQuotationAmount(summary.total, quotation.moneda)}</Text>
          {summary.porPasajero !== null ? <Text style={styles.small}>{formatQuotationAmount(summary.porPasajero, quotation.moneda)} por pasajero</Text> : null}
        </View>
      </View>
      {showFlights ? <View style={styles.section}>
        <View wrap={false}>
          <Text style={styles.sectionTitle}>Itinerario de vuelo</Text>
          <Journey journey={journeys[0]} index={0} styles={styles} />
        </View>
        {journeys.slice(1).map((journey, index) => <Journey key={journey.id || index} journey={journey} index={index + 1} styles={styles} />)}
      </View> : null}
      {showFlights && (details.tarifas.length || details.equipaje.length) ? <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>Clase y equipaje</Text>
        <View style={styles.columns}>
          {details.tarifas.length ? <FareCard fares={details.tarifas} styles={styles} /> : null}
          {details.equipaje.length ? <BaggageCard allowances={details.equipaje} styles={styles} /> : null}
        </View>
      </View> : null}
      {showHotels ? <View style={styles.section}>
        <View wrap={false}>
          <Text style={styles.sectionTitle}>{details.hoteles.length > 1 ? "Alojamiento" : "Hotel"}</Text>
          <Hotel hotel={details.hoteles[0]} photos={photos} styles={styles} />
        </View>
        {details.hoteles.slice(1).map(hotel => <Hotel key={hotel.id} hotel={hotel} photos={photos} styles={styles} />)}
      </View> : null}
      {details.servicios.length ? <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>Servicios incluidos</Text>
        <View style={styles.amenities}>{details.servicios.map(service => <View key={service.id} style={[styles.amenity, { width: "48%", marginBottom: 1 }]}><Icon name="check" size={8} stroke={color.success} /><Text style={[styles.body, { flex: 1 }]}>{service.tipo ? <Text style={{ fontWeight: 700 }}>{service.tipo}: </Text> : null}{service.descripcion}</Text></View>)}</View>
      </View> : null}
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>Detalle de precio</Text>
        <Pricing record={record} styles={styles} />
      </View>
      <Conditions record={record} validUntil={validUntil} styles={styles} />
      {quotation.notas ? <View style={styles.section} wrap={false}><Text style={styles.sectionTitle}>Observaciones</Text><Text style={styles.remarks}>{quotation.notas}</Text></View> : null}
      <View style={styles.cta} wrap={false}>
        <Icon name="message" size={12} stroke={color.deep} />
        <Link src={whatsappHref} style={styles.ctaText}>Para confirmar esta cotización, escríbanos por WhatsApp al {whatsapp} e indique el código {quotation.codigo}.</Link>
      </View>
      {/* A fixed, absolutely positioned View is dropped by react-pdf here; fixed Text elements are kept. */}
      <Text style={styles.footerLeft} fixed>viatour | asesores de viaje · WhatsApp {whatsapp} · {siteConfig.supportEmail} · {siteConfig.domain}</Text>
      <Text style={styles.footerRight} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </Page>
  </Document>;
}

export function pdfPageCount(buffer: Buffer) {
  return (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

// Regular spacing when it fits on one page; otherwise compact spacing when that saves a page; otherwise
// the regular layout over more pages (never smaller type, never clipped content).
export async function renderQuotationPdf(record: QuotationRecord, options: PdfOptions = {}) {
  registerFonts();
  const regular = await renderToBuffer(<QuotationDocument record={record} options={options} compact={false} />);
  if (pdfPageCount(regular) <= 1) return regular;
  const compact = await renderToBuffer(<QuotationDocument record={record} options={options} compact />);
  return pdfPageCount(compact) < pdfPageCount(regular) ? compact : regular;
}

export function quotationPdfFilename(record: QuotationRecord, versionNumber?: number) {
  const slug = `${record.quotation.destino}-${record.quotation.cliente_nombre}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).toLowerCase();
  return `cotizacion-${record.quotation.codigo}${versionNumber ? `-v${versionNumber}` : ""}${slug ? `-${slug}` : ""}.pdf`;
}
