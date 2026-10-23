import { emptySegment, datePattern, timePattern, validateItinerary, type FlightJourney, type FlightSegment, type ItineraryIssue, type JourneyKind } from "@/lib/flight-itinerary";
import { zoneOffsetMinutes } from "@/lib/flight-reference";
import { isDiscount, lineCents } from "@/lib/money";

// Structured content of a quotation (quotations.detalles, docs/sql/quotations_v5.sql). Everything the
// browser sends is passed through sanitizeDetails(): unknown keys are dropped, strings are trimmed and
// capped, numbers are bounded and arrays are limited, so a crafted request cannot store arbitrary JSON.

// "combinado" (V6) builds a package from ordered service components. "paquete" is the V5 package; it is no
// longer offered for new quotations, but existing ones keep opening, editing and printing as before.
export const quotationKinds = ["vuelo", "hotel", "ferry", "paquete", "combinado", "general"] as const;
export type QuotationKind = (typeof quotationKinds)[number];
export const quotationKindLabels: Record<QuotationKind, string> = { vuelo: "Vuelo", hotel: "Hotel", ferry: "Ferry", paquete: "Paquete o combinado", combinado: "Paquete combinado", general: "Otros servicios" };
// Kinds offered when creating a quotation, and the names shown in the admin lists (the PDF keeps quotationKindLabels).
export const creatableKinds: QuotationKind[] = ["vuelo", "hotel", "ferry", "combinado", "general"];
export const quotationKindAdminLabels: Record<QuotationKind, string> = { ...quotationKindLabels, paquete: "Paquete (formato anterior)" };

export const defaultZone = "America/Tegucigalpa";
export const expiryPresets = [2, 6, 12, 24, 48] as const;

export type BaggageState = "incluido" | "no_incluido" | "con_cargo" | "";
export type BaggagePiece = { estado: BaggageState; piezas: number | null; peso: string; medidas: string };
export type BaggageAllowance = { id: string; alcance: string; personal: BaggagePiece; mano: BaggagePiece; documentado: BaggagePiece; adicional: string; notas: string };
export type Refundability = "reembolsable" | "no_reembolsable" | "parcial" | "";
// plantilla / plantillaId: the saved fare preset the advisor started from (airline catalog). The values
// themselves are a copy: editing the preset later never changes this quotation.
export type FareRules = { id: string; alcance: string; aerolinea: string; operadoPor: string; cabina: string; tipoTarifa: string; claseReserva: string; cambios: string; cancelacion: string; reembolso: Refundability; restricciones: string; asientos: string; plantilla: string; plantillaId: string };
export type HotelRoom = { id: string; categoria: string; camas: string; cantidad: number; adultos: number; ninos: number; edadesNinos: string };
export type HotelPhoto = { path: string; leyenda: string; ancho: number; alto: number };
export type TaxState = "incluidos" | "no_incluidos" | "parcial" | "";
// What a stay or a crossing includes. Each line has an explicit state chosen by the advisor; nothing is
// assumed from the hotel's or operator's name, category or advertised facilities.
export type InclusionState = "incluido" | "no_incluido" | "con_cargo" | "";
export type Inclusion = { id: string; nombre: string; estado: InclusionState; detalle: string };
// catalogoId: the hotel catalog record it was filled from, if any. The stay is a snapshot: later catalog
// edits never change a quotation.
export type HotelStay = { id: string; nombre: string; destino: string; direccion: string; checkIn: string; checkOut: string; habitaciones: HotelRoom[]; planComidas: string; amenidades: string; inclusiones: Inclusion[]; inclusionesConfirmadas: boolean; impuestos: TaxState; cargoResort: string; cancelacion: string; reembolso: Refundability; condiciones: string; fotos: HotelPhoto[]; catalogoId: string };
export type FerryLeg = { id: string; tipo: "ida" | "regreso" | "tramo"; operador: string; embarcacion: string; origenPuerto: string; destinoPuerto: string; salidaFecha: string; salidaHora: string; llegadaFecha: string; llegadaHora: string; duracionMin: number | null };
export type FerryVehicle = { id: string; tipo: string; cantidad: number };
export type FerryDetails = { legs: FerryLeg[]; clase: string; asiento: string; cabina: string; vehiculos: FerryVehicle[]; equipajeIncluido: string; equipajeAdicional: string; inclusiones: Inclusion[]; inclusionesConfirmadas: boolean; cambios: string; cancelacion: string; reembolso: Refundability; embarque: string; documentos: string; confirmado: boolean };
export type IncludedService = { id: string; tipo: string; descripcion: string };

// ----- combined package (V6) -----
// A package is an ordered list of service components. Flights, hotels and ferries reuse the V5 structures
// (and therefore the V5 editors, checks and PDF blocks); transfers, tours and other services share one
// simple structure. Any combination, in any order, with repeats (two hotels, several flights) is valid:
// no service type is required.
//
// Service-type registry. Adding a type (for example car rental or cruise) is one entry here, plus an icon
// in package-section.tsx; the editor, readiness checks, PDF and pricing pick it up from these fields:
// - data: which structure and editor it uses ("vuelo", "hotel" and "ferry" are the V5 editors;
//   "servicio" is the general form for transfers, tours, insurance and similar).
// - variante: wording of the general form and its PDF card ("traslado": pickup time and place;
//   "cobertura": validity dates and provider; "general": date, time and meeting point).
// - itemType: price-line type suggested for it (one of itemTypes).
type ServiceTypeDefinition = { label: string; descripcion: string; data: "vuelo" | "hotel" | "ferry" | "servicio"; variante?: "general" | "traslado" | "cobertura"; itemType: string; sugerencias?: string[] };
export const packageServiceTypes = {
  vuelo: { label: "Vuelo", descripcion: "Itinerario pegado o manual, tarifa y equipaje.", data: "vuelo", itemType: "Tarifa aérea" },
  hotel: { label: "Hotel", descripcion: "Estadía, habitaciones, fotos e inclusiones; desde el catálogo o a mano.", data: "hotel", itemType: "Hotel" },
  ferry: { label: "Ferry", descripcion: "Trayectos, clase, vehículos y condiciones de la naviera.", data: "ferry", itemType: "Ferry" },
  traslado: { label: "Traslado", descripcion: "Aeropuerto, hotel o puerto; compartido o privado.", data: "servicio", variante: "traslado", itemType: "Traslado", sugerencias: ["Equipaje", "Asistencia en el aeropuerto", "Silla para niños", "Espera por retraso del vuelo", "Propinas"] },
  tour: { label: "Tour o excursión", descripcion: "Fecha, punto de encuentro, duración y lo que incluye.", data: "servicio", variante: "general", itemType: "Tour", sugerencias: ["Transporte", "Guía", "Entradas", "Almuerzo", "Bebidas", "Propinas"] },
  actividad: { label: "Actividad", descripcion: "Buceo, parques, espectáculos u otra actividad.", data: "servicio", variante: "general", itemType: "Tour", sugerencias: ["Equipo", "Instructor", "Transporte", "Entradas", "Fotos", "Propinas"] },
  seguro: { label: "Seguro de viaje", descripcion: "Vigencia, aseguradora y coberturas confirmadas.", data: "servicio", variante: "cobertura", itemType: "Seguro", sugerencias: ["Gastos médicos", "Equipaje", "Cancelación del viaje", "Asistencia 24 horas"] },
  asistencia: { label: "Asistencia al viajero", descripcion: "Vigencia, proveedor y lo que cubre.", data: "servicio", variante: "cobertura", itemType: "Asistencia", sugerencias: ["Gastos médicos", "Asistencia 24 horas", "Equipaje", "Traslado médico"] },
  auto: { label: "Auto de alquiler", descripcion: "Rentadora, retiro, devolución y lo que incluye.", data: "servicio", variante: "general", itemType: "Otro", sugerencias: ["Kilometraje ilimitado", "Seguro básico", "Conductor adicional", "Asiento para niño"] },
  otro: { label: "Otro servicio", descripcion: "Cualquier otro servicio con su propia descripción.", data: "servicio", variante: "general", itemType: "Otro", sugerencias: [] },
} as const satisfies Record<string, ServiceTypeDefinition>;
export type PackageServiceKind = keyof typeof packageServiceTypes;
export const packageServiceKinds = Object.keys(packageServiceTypes) as PackageServiceKind[];
export const serviceType = (kind: PackageServiceKind): ServiceTypeDefinition => packageServiceTypes[kind];
export const packageServiceLabels = Object.fromEntries(packageServiceKinds.map(kind => [kind, packageServiceTypes[kind].label])) as Record<PackageServiceKind, string>;
// Price-line type suggested for each component (one of itemTypes).
export const packageServiceItemTypes = Object.fromEntries(packageServiceKinds.map(kind => [kind, packageServiceTypes[kind].itemType])) as Record<PackageServiceKind, string>;
export type FlightService = { vuelos: { journeys: FlightJourney[]; textoOriginal: string; confirmado: boolean; boletosSeparados: boolean }; tarifas: FareRules[]; equipaje: BaggageAllowance[]; equipajeConfirmado: boolean };
export type ServiceMode = "" | "compartido" | "privado";
export type GeneralService = { descripcion: string; operador: string; fecha: string; hora: string; fechaFin: string; lugar: string; duracion: string; modalidad: ServiceMode; inclusiones: Inclusion[]; inclusionesConfirmadas: boolean; cancelacion: string };
export type PackageComponent = { id: string; tipo: PackageServiceKind; titulo: string; notas: string; vuelo: FlightService | null; hotel: HotelStay | null; ferry: FerryDetails | null; servicio: GeneralService | null };
// mostrarPrecios: whether the customer's PDF shows each price line (itemized) or only the package total.
// lineas[i] is the component id the i-th price line belongs to ("" = the whole package).
export type PackageDetails = { nombre: string; componentes: PackageComponent[]; mostrarPrecios: boolean; lineas: string[] };
export const maxPackageComponents = 16;

export type QuotationDetails = {
  version: 1;
  origen: string;
  fechaSalida: string;
  fechaRegreso: string;
  pasajeros: { adultos: number; ninos: number; infantes: number; edadesNinos: string };
  vuelos: { journeys: FlightJourney[]; textoOriginal: string; confirmado: boolean; boletosSeparados: boolean };
  tarifas: FareRules[];
  equipaje: BaggageAllowance[];
  equipajeConfirmado: boolean;
  hoteles: HotelStay[];
  ferry: FerryDetails;
  servicios: IncludedService[];
  pago: { deposito: string; depositoFecha: string; saldoFecha: string; instrucciones: string; precioPorPasajero: boolean };
  validez: { venceEn: string; zona: string; nota: string; limitePago: string; limiteEmision: string };
  condiciones: string[];
  notasInternas: string;
  // One-time token from the editor that created the quotation; a retried "create" finds it instead of inserting twice.
  refCreacion: string;
  // Who approved these exact conditions for this quotation, and a fingerprint of the approved text. Any
  // later change to a clause no longer matches the fingerprint and blocks sending until re-approved.
  aprobacionCondiciones: { huella: string; por: string; en: string } | null;
  // Code of the accepted quotation this one amends, when it was created as an amendment.
  enmiendaDe: string;
  // Only used by "combinado" quotations; empty for every other kind.
  paquete: PackageDetails;
};

export const hotelInclusionSuggestions = ["Desayuno", "Almuerzo", "Cena", "Plan todo incluido", "Bebidas", "Wi-Fi", "Piscina", "Acceso a playa", "Estacionamiento", "Traslados", "Transporte aeropuerto-hotel", "Impuestos", "Propinas", "Actividades recreativas", "Gimnasio", "Spa", "Club infantil", "Servicio a la habitación"];
export const ferryInclusionSuggestions = ["Equipaje", "Asiento asignado", "Cabina", "Transporte de vehículo", "Comidas", "Bebidas", "Servicios a bordo"];
export const inclusionStateLabels = { incluido: "Incluido", no_incluido: "No incluido", con_cargo: "Con cargo adicional" } as const;
export const mealPlans = ["Solo alojamiento", "Desayuno incluido", "Media pensión", "Pensión completa", "Todo incluido"];
// Price-line types. The database only accepts these (and six legacy codes), see quotation_items_tipo_check
// in docs/sql/quotations_v5.sql, so the editor offers a fixed list instead of free text.
export const itemTypes = ["Tarifa aérea", "Impuestos y tasas", "Hotel", "Ferry", "Paquete", "Traslado", "Tour", "Seguro", "Asistencia", "Equipaje", "Cargo por servicio", "Descuento", "Otro"];
const legacyItemTypes: Record<string, string> = { vuelo: "Tarifa aérea", hotel: "Hotel", tour: "Tour", traslado: "Traslado", paquete: "Paquete", otro: "Otro" };
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// The canonical type for a value typed or stored before (case and accents ignored), or null if unknown.
export function canonicalItemType(value: string) {
  const folded = fold(value);
  if (!folded) return null;
  return itemTypes.find(type => fold(type) === folded) ?? legacyItemTypes[folded] ?? null;
}
export const baggageLabels = { personal: "Artículo personal", mano: "Equipaje de mano", documentado: "Equipaje documentado" } as const;

// Draft wording supplied by the owner on 2026-10-12 as an example; pending legal review before it is
// treated as approved. Each quotation stores its own copy, so later edits here never change an issued one.
export const termsPendingReview = true;
const baseTerms = {
  noReserva: "Esta cotización no constituye una reserva confirmada. Las tarifas están sujetas a disponibilidad y cambios hasta que el proveedor confirme la reserva o se emita el boleto, según corresponda.",
  incluye: "El precio incluye únicamente los servicios, impuestos y cargos expresamente detallados en la cotización.",
  cambios: "Los cambios de fecha, ruta, alojamiento u otros servicios están sujetos a las políticas del proveedor y podrían generar penalidades o diferencias de tarifa.",
  extras: "Los servicios adicionales, incluyendo equipaje documentado, selección de asientos, comidas y otros extras, están incluidos únicamente cuando se indiquen expresamente.",
  requisitos: "Cada viajero es responsable de verificar los requisitos migratorios, sanitarios, de tránsito y documentación aplicables a su nacionalidad, itinerario y destino.",
  pago: "El pago y la aceptación de esta cotización están sujetos a las condiciones y al período de validez indicados. La disponibilidad y el precio final deben confirmarse antes de la emisión o reserva.",
  politicas: "Las políticas de cancelación, modificación y reembolso serán las correspondientes a los servicios y tarifas específicamente cotizados.",
};
export const termsTemplates: Record<QuotationKind, string[]> = {
  vuelo: [baseTerms.noReserva, baseTerms.incluye, baseTerms.cambios, baseTerms.extras, baseTerms.requisitos, baseTerms.pago, baseTerms.politicas],
  hotel: [
    "Esta cotización no constituye una reserva confirmada. Las tarifas están sujetas a disponibilidad y cambios hasta que el hotel o proveedor confirme la reserva.",
    baseTerms.incluye,
    "Los cambios de fechas, tipo de habitación u ocupación están sujetos a las políticas del hotel y podrían generar penalidades o diferencias de tarifa.",
    "Los consumos, comidas, cargos de resort o impuestos locales que no se detallen en la cotización no están incluidos.",
    baseTerms.requisitos, baseTerms.pago, baseTerms.politicas,
  ],
  paquete: [baseTerms.noReserva, baseTerms.incluye, baseTerms.cambios, baseTerms.extras, baseTerms.requisitos, baseTerms.pago, baseTerms.politicas],
  combinado: [baseTerms.noReserva, baseTerms.incluye, baseTerms.cambios, baseTerms.extras, baseTerms.requisitos, baseTerms.pago, baseTerms.politicas],
  ferry: [
    "Esta cotización no constituye una reserva confirmada. Las tarifas y la disponibilidad están sujetas a cambios hasta que la naviera confirme la reserva o emita los boletos.",
    baseTerms.incluye,
    "Los cambios de fecha, horario, ruta, clase o vehículo están sujetos a las políticas de la naviera y podrían generar penalidades o diferencias de tarifa.",
    "El equipaje adicional, el transporte de vehículos, las cabinas, las comidas y otros servicios a bordo están incluidos únicamente cuando se indiquen expresamente.",
    "Cada pasajero debe presentarse al embarque con la anticipación y los documentos que exija la naviera y las autoridades del puerto.",
    baseTerms.pago, baseTerms.politicas,
  ],
  general: [baseTerms.noReserva, baseTerms.incluye, baseTerms.cambios, baseTerms.requisitos, baseTerms.pago, baseTerms.politicas],
};
export const separateTicketsClause = "Esta cotización combina boletos emitidos por separado. Cada boleto tiene sus propias condiciones de cambio, cancelación y equipaje, y un cambio o retraso en un boleto no modifica el otro.";

const emptyPiece = (): BaggagePiece => ({ estado: "", piezas: null, peso: "", medidas: "" });
export const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 12);
export const emptyBaggage = (id = newId()): BaggageAllowance => ({ id, alcance: "Todos los vuelos", personal: emptyPiece(), mano: emptyPiece(), documentado: emptyPiece(), adicional: "", notas: "" });
export const emptyFare = (id = newId()): FareRules => ({ id, alcance: "Todos los vuelos", aerolinea: "", operadoPor: "", cabina: "", tipoTarifa: "", claseReserva: "", cambios: "", cancelacion: "", reembolso: "", restricciones: "", asientos: "", plantilla: "", plantillaId: "" });
export const emptyRoom = (id = newId()): HotelRoom => ({ id, categoria: "", camas: "", cantidad: 1, adultos: 2, ninos: 0, edadesNinos: "" });
export const emptyHotel = (id = newId()): HotelStay => ({ id, nombre: "", destino: "", direccion: "", checkIn: "", checkOut: "", habitaciones: [emptyRoom()], planComidas: "", amenidades: "", inclusiones: [], inclusionesConfirmadas: false, impuestos: "", cargoResort: "", cancelacion: "", reembolso: "", condiciones: "", fotos: [], catalogoId: "" });
export const emptyFerryLeg = (tipo: FerryLeg["tipo"] = "ida", id = newId()): FerryLeg => ({ id, tipo, operador: "", embarcacion: "", origenPuerto: "", destinoPuerto: "", salidaFecha: "", salidaHora: "", llegadaFecha: "", llegadaHora: "", duracionMin: null });
export const emptyFerry = (withLeg = false): FerryDetails => ({ legs: withLeg ? [emptyFerryLeg()] : [], clase: "", asiento: "", cabina: "", vehiculos: [], equipajeIncluido: "", equipajeAdicional: "", inclusiones: [], inclusionesConfirmadas: false, cambios: "", cancelacion: "", reembolso: "", embarque: "", documentos: "", confirmado: false });
export const emptyPackage = (): PackageDetails => ({ nombre: "", componentes: [], mostrarPrecios: false, lineas: [] });
export const emptyService = (): GeneralService => ({ descripcion: "", operador: "", fecha: "", hora: "", fechaFin: "", lugar: "", duracion: "", modalidad: "", inclusiones: [], inclusionesConfirmadas: false, cancelacion: "" });
export const emptyFlightService = (): FlightService => ({ vuelos: { journeys: [], textoOriginal: "", confirmado: false, boletosSeparados: false }, tarifas: [emptyFare()], equipaje: [emptyBaggage()], equipajeConfirmado: false });

export function emptyComponent(tipo: PackageServiceKind, id = newId()): PackageComponent {
  const { data } = serviceType(tipo);
  return {
    id, tipo, titulo: "", notas: "",
    vuelo: data === "vuelo" ? emptyFlightService() : null,
    hotel: data === "hotel" ? emptyHotel() : null,
    ferry: data === "ferry" ? emptyFerry(true) : null,
    servicio: data === "servicio" ? emptyService() : null,
  };
}

// A copy with fresh ids, for "Duplicar servicio". Confirmations are cleared: the copy must be reviewed.
export function duplicateComponent(component: PackageComponent): PackageComponent {
  const fresh = <T extends { id: string }>(item: T) => ({ ...item, id: newId() });
  return {
    ...component, id: newId(),
    vuelo: component.vuelo ? { ...component.vuelo, vuelos: { ...component.vuelo.vuelos, confirmado: false, journeys: component.vuelo.vuelos.journeys.map(journey => ({ ...fresh(journey), segmentos: journey.segmentos.map(segment => ({ ...fresh(segment), revisar: [...segment.revisar] })) })) }, tarifas: component.vuelo.tarifas.map(fresh), equipaje: component.vuelo.equipaje.map(fresh), equipajeConfirmado: false } : null,
    hotel: component.hotel ? { ...fresh(component.hotel), habitaciones: component.hotel.habitaciones.map(fresh), inclusiones: component.hotel.inclusiones.map(fresh), inclusionesConfirmadas: false, fotos: component.hotel.fotos.map(photo => ({ ...photo })) } : null,
    ferry: component.ferry ? { ...component.ferry, legs: component.ferry.legs.map(fresh), vehiculos: component.ferry.vehiculos.map(fresh), inclusiones: component.ferry.inclusiones.map(fresh), inclusionesConfirmadas: false, confirmado: false } : null,
    servicio: component.servicio ? { ...component.servicio, inclusiones: component.servicio.inclusiones.map(fresh), inclusionesConfirmadas: false } : null,
  };
}

export function componentLabel(component: PackageComponent, index: number) {
  return `Servicio ${index + 1} (${packageServiceLabels[component.tipo]})`;
}

// Customer-facing heading of a component: the advisor's title, else a description built from its data.
export function componentTitle(component: PackageComponent) {
  if (component.titulo) return component.titulo;
  if (component.hotel?.nombre) return component.hotel.nombre;
  if (component.servicio?.descripcion) return component.servicio.descripcion;
  if (component.vuelo) {
    const journeys = component.vuelo.vuelos.journeys.filter(journey => journey.segmentos.length);
    const first = journeys[0]?.segmentos[0];
    const last = journeys[0]?.segmentos.at(-1);
    if (first && last) return `${first.origen} – ${last.destino}${journeys.length === 2 ? " – " + (journeys[1].segmentos.at(-1)?.destino ?? "") : ""}`;
  }
  if (component.ferry?.legs[0]) return [component.ferry.legs[0].origenPuerto, component.ferry.legs[0].destinoPuerto].filter(Boolean).join(" – ");
  return packageServiceLabels[component.tipo];
}

// Every flight, hotel and ferry crossing of a quotation in one view: for a combined package the
// components' data in their order, otherwise the quotation's own sections. Used for trip dates, photos
// and hotel suggestions; it is never saved.
export function expandedDetails(details: QuotationDetails): QuotationDetails {
  const components = details.paquete.componentes;
  if (!components.length) return details;
  return {
    ...details,
    vuelos: { ...details.vuelos, journeys: [...details.vuelos.journeys, ...components.flatMap(component => component.vuelo?.vuelos.journeys ?? [])] },
    hoteles: [...details.hoteles, ...components.flatMap(component => component.hotel ? [component.hotel] : [])],
    ferry: { ...details.ferry, legs: [...details.ferry.legs, ...components.flatMap(component => component.ferry?.legs ?? [])] },
  };
}

export function defaultDetails(kind: QuotationKind): QuotationDetails {
  return {
    version: 1, origen: "", fechaSalida: "", fechaRegreso: "",
    pasajeros: { adultos: 1, ninos: 0, infantes: 0, edadesNinos: "" },
    vuelos: { journeys: [], textoOriginal: "", confirmado: false, boletosSeparados: false },
    tarifas: kind === "vuelo" || kind === "paquete" ? [emptyFare()] : [],
    equipaje: kind === "vuelo" || kind === "paquete" ? [emptyBaggage()] : [],
    equipajeConfirmado: false,
    hoteles: kind === "hotel" || kind === "paquete" ? [emptyHotel()] : [],
    ferry: emptyFerry(kind === "ferry"),
    servicios: [],
    pago: { deposito: "", depositoFecha: "", saldoFecha: "", instrucciones: "", precioPorPasajero: false },
    validez: { venceEn: "", zona: defaultZone, nota: "", limitePago: "", limiteEmision: "" },
    condiciones: [...termsTemplates[kind]],
    notasInternas: "",
    refCreacion: "",
    aprobacionCondiciones: null,
    enmiendaDe: "",
    paquete: emptyPackage(),
  };
}

// ----- sanitizing -----

type Source = Record<string, unknown>;
const record = (value: unknown): Source => (value && typeof value === "object" && !Array.isArray(value) ? value as Source : {});
const list = (value: unknown, max: number) => (Array.isArray(value) ? value.slice(0, max) : []);
// Control characters are removed (newlines and tabs are kept only where multi-line text is allowed).
const text = (value: unknown, max: number, multiline = false) => String(typeof value === "string" || typeof value === "number" ? value : "")
  .replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, multiline ? "" : " ")
  .trim().slice(0, max);
const integer = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
};
const optionalInteger = (value: unknown, min: number, max: number) => (value === null || value === "" || value === undefined ? null : integer(value, min, max, -1) === -1 ? null : Number(value));
const date = (value: unknown) => { const result = text(value, 10); const parsed = Date.parse(`${result}T00:00:00Z`); return datePattern.test(result) && !Number.isNaN(parsed) && new Date(parsed).toISOString().startsWith(result) ? result : ""; };
const time = (value: unknown) => { const result = text(value, 5); return timePattern.test(result) ? result : ""; };
const iso = (value: unknown) => { const result = text(value, 40); return result && !Number.isNaN(Date.parse(result)) && /^\d{4}-\d{2}-\d{2}T/.test(result) ? new Date(result).toISOString() : ""; };
const choice = <T extends string>(value: unknown, options: readonly T[]): T => (options.includes(value as T) ? value as T : "" as T);
const id = (value: unknown) => { const result = text(value, 40); return /^[A-Za-z0-9_-]{1,40}$/.test(result) ? result : newId(); };
const upper = (value: unknown, max: number) => text(value, max).toUpperCase();
const money = (value: unknown) => { const result = text(value, 14); return /^\d{1,9}(\.\d{1,2})?$/.test(result) ? result : ""; };
// Photos are re-encoded as JPEG in the browser before upload (react-pdf cannot embed WebP).
export const photoPathPattern = /^hotel\/[0-9a-f]{32}\.jpg$/;

const segmentFields = ["origen", "destino", "salidaFecha", "salidaHora", "llegadaFecha", "llegadaHora", "aerolinea", "vuelo", "operadoPor", "aeronave", "cabina", "claseReserva", "duracionMin"];

function sanitizeSegment(value: unknown): FlightSegment {
  const source = record(value);
  return {
    ...emptySegment(id(source.id)),
    origen: upper(source.origen, 3), origenNombre: text(source.origenNombre, 160), destino: upper(source.destino, 3), destinoNombre: text(source.destinoNombre, 160),
    salidaFecha: date(source.salidaFecha), salidaHora: time(source.salidaHora), llegadaFecha: date(source.llegadaFecha), llegadaHora: time(source.llegadaHora),
    aerolinea: text(source.aerolinea, 80), vuelo: upper(source.vuelo, 10), operadoPor: text(source.operadoPor, 120), aeronave: text(source.aeronave, 80),
    cabina: text(source.cabina, 60), claseReserva: upper(source.claseReserva, 2), duracionMin: optionalInteger(source.duracionMin, 1, 72 * 60),
    revisar: list(source.revisar, 20).map(field => String(field)).filter(field => segmentFields.includes(field)),
  };
}

function sanitizeJourney(value: unknown): FlightJourney {
  const source = record(value);
  return { id: id(source.id), tipo: choice<JourneyKind>(source.tipo, ["ida", "regreso", "tramo"]) || "tramo", segmentos: list(source.segmentos, 12).map(sanitizeSegment) };
}

function sanitizePiece(value: unknown): BaggagePiece {
  const source = record(value);
  return { estado: choice<BaggageState>(source.estado, ["incluido", "no_incluido", "con_cargo"]), piezas: optionalInteger(source.piezas, 0, 9), peso: text(source.peso, 40), medidas: text(source.medidas, 60) };
}

function sanitizeInclusion(value: unknown): Inclusion {
  const source = record(value);
  return { id: id(source.id), nombre: text(source.nombre, 80), estado: choice<InclusionState>(source.estado, ["incluido", "no_incluido", "con_cargo"]), detalle: text(source.detalle, 200) };
}

function sanitizeFerry(value: unknown): FerryDetails {
  const source = record(value);
  return {
    legs: list(source.legs, 8).map(item => { const leg = record(item); return { id: id(leg.id), tipo: choice<FerryLeg["tipo"]>(leg.tipo, ["ida", "regreso", "tramo"]) || "tramo", operador: text(leg.operador, 120), embarcacion: text(leg.embarcacion, 120), origenPuerto: text(leg.origenPuerto, 120), destinoPuerto: text(leg.destinoPuerto, 120), salidaFecha: date(leg.salidaFecha), salidaHora: time(leg.salidaHora), llegadaFecha: date(leg.llegadaFecha), llegadaHora: time(leg.llegadaHora), duracionMin: optionalInteger(leg.duracionMin, 1, 72 * 60) }; }),
    clase: text(source.clase, 80), asiento: text(source.asiento, 120), cabina: text(source.cabina, 120),
    vehiculos: list(source.vehiculos, 6).map(item => { const vehicle = record(item); return { id: id(vehicle.id), tipo: text(vehicle.tipo, 80), cantidad: integer(vehicle.cantidad, 1, 20, 1) }; }).filter(vehicle => vehicle.tipo),
    equipajeIncluido: text(source.equipajeIncluido, 300), equipajeAdicional: text(source.equipajeAdicional, 300),
    inclusiones: list(source.inclusiones, 30).map(sanitizeInclusion).filter(item => item.nombre), inclusionesConfirmadas: source.inclusionesConfirmadas === true,
    cambios: text(source.cambios, 400, true), cancelacion: text(source.cancelacion, 600, true), reembolso: choice<Refundability>(source.reembolso, ["reembolsable", "no_reembolsable", "parcial"]),
    embarque: text(source.embarque, 800, true), documentos: text(source.documentos, 600, true), confirmado: source.confirmado === true,
  };
}

function sanitizeHotel(value: unknown): HotelStay {
  const source = record(value);
  return {
    id: id(source.id), nombre: text(source.nombre, 160), destino: text(source.destino, 160), direccion: text(source.direccion, 300),
    checkIn: date(source.checkIn), checkOut: date(source.checkOut),
    habitaciones: list(source.habitaciones, 10).map(item => { const room = record(item); return { id: id(room.id), categoria: text(room.categoria, 120), camas: text(room.camas, 120), cantidad: integer(room.cantidad, 1, 50, 1), adultos: integer(room.adultos, 0, 20, 2), ninos: integer(room.ninos, 0, 20, 0), edadesNinos: text(room.edadesNinos, 60) }; }),
    planComidas: text(source.planComidas, 80), amenidades: text(source.amenidades, 1500, true), impuestos: choice<TaxState>(source.impuestos, ["incluidos", "no_incluidos", "parcial"]),
    cargoResort: text(source.cargoResort, 300), cancelacion: text(source.cancelacion, 1000, true), reembolso: choice<Refundability>(source.reembolso, ["reembolsable", "no_reembolsable", "parcial"]),
    condiciones: text(source.condiciones, 1500, true),
    inclusiones: list(source.inclusiones, 40).map(sanitizeInclusion).filter(item => item.nombre),
    inclusionesConfirmadas: source.inclusionesConfirmadas === true,
    fotos: list(source.fotos, 12).map(item => { const photo = record(item); return { path: text(photo.path, 80), leyenda: text(photo.leyenda, 140), ancho: integer(photo.ancho, 0, 20000, 0), alto: integer(photo.alto, 0, 20000, 0) }; }).filter(photo => photoPathPattern.test(photo.path)),
    catalogoId: uuidText(source.catalogoId),
  };
}

const uuidText = (value: unknown) => { const result = text(value, 36).toLowerCase(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result) ? result : ""; };

function sanitizeFare(value: unknown): FareRules {
  const fare = record(value);
  return { id: id(fare.id), alcance: text(fare.alcance, 80), aerolinea: text(fare.aerolinea, 80), operadoPor: text(fare.operadoPor, 120), cabina: text(fare.cabina, 60), tipoTarifa: text(fare.tipoTarifa, 80), claseReserva: upper(fare.claseReserva, 2), cambios: text(fare.cambios, 400, true), cancelacion: text(fare.cancelacion, 400, true), reembolso: choice<Refundability>(fare.reembolso, ["reembolsable", "no_reembolsable", "parcial"]), restricciones: text(fare.restricciones, 600, true), asientos: text(fare.asientos, 300), plantilla: text(fare.plantilla, 120), plantillaId: uuidText(fare.plantillaId) };
}

export function sanitizeBaggage(value: unknown): BaggageAllowance {
  const bag = record(value);
  return { id: id(bag.id), alcance: text(bag.alcance, 80), personal: sanitizePiece(bag.personal), mano: sanitizePiece(bag.mano), documentado: sanitizePiece(bag.documentado), adicional: text(bag.adicional, 300), notas: text(bag.notas, 600, true) };
}

function sanitizeFlights(value: unknown): QuotationDetails["vuelos"] {
  const flights = record(value);
  return { journeys: list(flights.journeys, 8).map(sanitizeJourney), textoOriginal: text(flights.textoOriginal, 20000, true), confirmado: flights.confirmado === true, boletosSeparados: flights.boletosSeparados === true };
}

export function sanitizeInclusions(value: unknown, max = 40) {
  return list(value, max).map(sanitizeInclusion).filter(item => item.nombre);
}

function sanitizeService(value: unknown): GeneralService {
  const source = record(value);
  return {
    descripcion: text(source.descripcion, 400), operador: text(source.operador, 120), fecha: date(source.fecha), hora: time(source.hora), fechaFin: date(source.fechaFin),
    lugar: text(source.lugar, 200), duracion: text(source.duracion, 80), modalidad: choice<ServiceMode>(source.modalidad, ["compartido", "privado"]),
    inclusiones: sanitizeInclusions(source.inclusiones, 30), inclusionesConfirmadas: source.inclusionesConfirmadas === true, cancelacion: text(source.cancelacion, 800, true),
  };
}

// Each component keeps only the data of its own type.
function sanitizeComponent(value: unknown): PackageComponent | null {
  const source = record(value);
  const tipo = choice<PackageServiceKind>(source.tipo, packageServiceKinds);
  if (!tipo) return null;
  const { data } = serviceType(tipo);
  const flight = record(source.vuelo);
  return {
    id: id(source.id), tipo, titulo: text(source.titulo, 160), notas: text(source.notas, 1000, true),
    vuelo: data === "vuelo" ? { vuelos: sanitizeFlights(flight.vuelos), tarifas: list(flight.tarifas, 6).map(sanitizeFare), equipaje: list(flight.equipaje, 6).map(sanitizeBaggage), equipajeConfirmado: flight.equipajeConfirmado === true } : null,
    hotel: data === "hotel" ? sanitizeHotel(source.hotel) : null,
    ferry: data === "ferry" ? sanitizeFerry(source.ferry) : null,
    servicio: data === "servicio" ? sanitizeService(source.servicio) : null,
  };
}

function sanitizePackage(value: unknown): PackageDetails {
  const source = record(value);
  const componentes = list(source.componentes, maxPackageComponents).map(sanitizeComponent).filter((item): item is PackageComponent => item !== null);
  // Component ids must be unique for price lines to point at one of them.
  const seen = new Set<string>();
  for (const component of componentes) { while (seen.has(component.id)) component.id = newId(); seen.add(component.id); }
  return {
    nombre: text(source.nombre, 160), componentes, mostrarPrecios: source.mostrarPrecios === true,
    lineas: list(source.lineas, 50).map(item => { const value = text(item, 40); return seen.has(value) ? value : ""; }),
  };
}

export function sanitizeDetails(value: unknown): QuotationDetails {
  const source = record(value);
  const passengers = record(source.pasajeros);
  const payment = record(source.pago);
  const validity = record(source.validez);
  const zone = text(validity.zona, 60);
  return {
    version: 1,
    origen: text(source.origen, 120), fechaSalida: date(source.fechaSalida), fechaRegreso: date(source.fechaRegreso),
    pasajeros: { adultos: integer(passengers.adultos, 0, 99, 0), ninos: integer(passengers.ninos, 0, 99, 0), infantes: integer(passengers.infantes, 0, 99, 0), edadesNinos: text(passengers.edadesNinos, 60) },
    vuelos: sanitizeFlights(source.vuelos),
    tarifas: list(source.tarifas, 6).map(sanitizeFare),
    equipaje: list(source.equipaje, 6).map(sanitizeBaggage),
    equipajeConfirmado: source.equipajeConfirmado === true,
    hoteles: list(source.hoteles, 6).map(sanitizeHotel),
    ferry: sanitizeFerry(source.ferry),
    servicios: list(source.servicios, 30).map(item => { const service = record(item); return { id: id(service.id), tipo: text(service.tipo, 60), descripcion: text(service.descripcion, 400) }; }).filter(service => service.descripcion),
    pago: { deposito: money(payment.deposito), depositoFecha: date(payment.depositoFecha), saldoFecha: date(payment.saldoFecha), instrucciones: text(payment.instrucciones, 800, true), precioPorPasajero: payment.precioPorPasajero === true },
    validez: { venceEn: iso(validity.venceEn), zona: zone && zoneOffsetMinutes(zone, "2026-01-01") !== null ? zone : defaultZone, nota: text(validity.nota, 300), limitePago: iso(validity.limitePago), limiteEmision: iso(validity.limiteEmision) },
    // Missing conditions stay empty: quotations saved before V5 never had them, and adding today's
    // template would change what an issued document said. New quotations start from defaultDetails().
    condiciones: list(source.condiciones, 20).map(item => text(item, 1000)).filter(Boolean),
    notasInternas: text(source.notasInternas, 5000, true),
    refCreacion: /^[A-Za-z0-9-]{8,64}$/.test(text(source.refCreacion, 64)) ? text(source.refCreacion, 64) : "",
    aprobacionCondiciones: (() => {
      const approval = record(source.aprobacionCondiciones);
      const huella = text(approval.huella, 16);
      return /^[0-9a-f]{14}$/.test(huella) ? { huella, por: text(approval.por, 40), en: iso(approval.en) } : null;
    })(),
    enmiendaDe: text(source.enmiendaDe, 40),
    paquete: sanitizePackage(source.paquete),
  };
}

// ----- validity -----

// "2026-10-13T18:00" on the clock of `zone` -> ISO instant.
export function zonedToIso(local: string, zone = defaultZone) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(local);
  if (!match) return "";
  const offset = zoneOffsetMinutes(zone, match[1], match[2]);
  if (offset === null) return "";
  return new Date(Date.parse(`${match[1]}T${match[2]}:00Z`) - offset * 60000).toISOString();
}

// ISO instant -> "2026-10-13T18:00" on the clock of `zone`, for datetime-local inputs.
export function isoToZoned(value: string, zone = defaultZone) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function expiryFromPreset(hours: number, now = new Date()) {
  return new Date(now.getTime() + hours * 3600000).toISOString();
}

export function zoneLabel(zone: string) {
  return zone === defaultZone ? "hora de Honduras" : zone.split("/").pop()?.replaceAll("_", " ") ?? zone;
}

export function formatInstant(value: string, zone = defaultZone, withZone = true) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  const formatted = new Intl.DateTimeFormat("es-HN", { timeZone: zone, day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  return withZone ? `${formatted} (${zoneLabel(zone)})` : formatted;
}

// Quotations created before vence_en existed only have a date: they expire at the end of that day in Honduras.
export function effectiveExpiry(venceEn: string | null | undefined, validez: string | null | undefined) {
  if (venceEn && !Number.isNaN(Date.parse(venceEn))) return new Date(venceEn).toISOString();
  return validez && datePattern.test(validez) ? zonedToIso(`${validez}T23:59`) : "";
}

export function isExpired(expiry: string, now = new Date()) {
  return Boolean(expiry) && Date.parse(expiry) <= now.getTime();
}

export function legacyValidityDate(expiry: string) {
  return isoToZoned(expiry).slice(0, 10);
}

// ----- pricing -----

export type PricingLine = { descripcion: string; tipo: string; cantidad: number; precio_unitario: number };

export function pricingSummary(items: PricingLine[], details: Pick<QuotationDetails, "pasajeros" | "pago">) {
  const charges = items.filter(item => !isDiscount(item.tipo)).reduce((sum, item) => sum + lineCents(item), 0);
  const discounts = items.filter(item => isDiscount(item.tipo)).reduce((sum, item) => sum - lineCents(item), 0);
  const total = charges - discounts;
  const travellers = details.pasajeros.adultos + details.pasajeros.ninos + details.pasajeros.infantes;
  const deposit = details.pago.deposito ? Math.round(Number(details.pago.deposito) * 100) : null;
  return {
    subtotal: charges / 100,
    descuentos: discounts / 100,
    total: total / 100,
    pasajeros: travellers,
    porPasajero: details.pago.precioPorPasajero && travellers > 0 ? Math.round(total / travellers) / 100 : null,
    deposito: deposit !== null ? deposit / 100 : null,
    saldo: deposit !== null ? (total - deposit) / 100 : null,
  };
}

// Amount of the price lines that belong to one package component (lineas[i] = component id of line i).
// Lines only count when the link list matches the lines; otherwise nothing is attributed (never guessed).
export function componentAmount(items: PricingLine[], lineas: string[], componentId: string) {
  if (lineas.length !== items.length) return null;
  const lines = items.filter((_, index) => lineas[index] === componentId);
  if (!lines.length) return null;
  return lines.reduce((sum, item) => sum + lineCents(item), 0) / 100;
}

// ----- readiness -----

export type ReadinessIssue = { nivel: "error" | "aviso"; mensaje: string; seccion: string };

// What must be true before a quotation is sent to the customer. Errors block sending; warnings do not.
type Push = (nivel: ReadinessIssue["nivel"], seccion: string, mensaje: string) => void;

function flightChecks(flights: FlightService, push: Push, prefix = "") {
  const itinerary: ItineraryIssue[] = validateItinerary(flights.vuelos.journeys);
  for (const issue of itinerary) if (issue.nivel !== "info") push(issue.nivel === "error" ? "error" : "aviso", "vuelos", `${prefix}${issue.mensaje}`);
  if (!flights.vuelos.confirmado) push("error", "vuelos", `${prefix}Confirme el itinerario después de revisarlo.`);
  if (!flights.equipaje.length) push("error", "equipaje", `${prefix}Indique la franquicia de equipaje.`);
  else if (!flights.equipajeConfirmado) push("error", "equipaje", `${prefix}Confirme la franquicia de equipaje con las condiciones de la tarifa.`);
  for (const bag of flights.equipaje) for (const key of ["personal", "mano", "documentado"] as const) if (!bag[key].estado) push("error", "equipaje", `${prefix}${bag.alcance || "Equipaje"}: indique si el ${baggageLabels[key].toLowerCase()} está incluido.`);
  if (!flights.tarifas.some(fare => fare.cabina)) push("aviso", "tarifa", `${prefix}Indique la cabina de la tarifa.`);
}

function hotelChecks(hotels: HotelStay[], push: Push, prefix = "") {
  if (!hotels.length) push("error", "hotel", `${prefix}Agregue al menos un hotel.`);
  hotels.forEach((hotel, index) => {
    const name = `${prefix}${hotel.nombre || `Hotel ${index + 1}`}`;
    if (!hotel.nombre) push("error", "hotel", `${prefix}Hotel ${index + 1}: indique el nombre.`);
    if (!hotel.checkIn || !hotel.checkOut) push("error", "hotel", `${name}: indique las fechas de entrada y salida.`);
    else if (hotel.checkOut <= hotel.checkIn) push("error", "hotel", `${name}: la salida debe ser posterior a la entrada.`);
    if (!hotel.habitaciones.length) push("error", "hotel", `${name}: agregue al menos una habitación.`);
    if (!hotel.planComidas) push("aviso", "hotel", `${name}: indique el plan de comidas.`);
    if (!hotel.impuestos) push("aviso", "hotel", `${name}: indique si los impuestos están incluidos.`);
    if (!hotel.cancelacion) push("aviso", "hotel", `${name}: indique la política de cancelación.`);
    checkInclusions(hotel.inclusiones, hotel.inclusionesConfirmadas, "hotel", `${name}: `, push);
  });
}

function ferryChecks(ferry: FerryDetails, push: Push, prefix = "") {
  if (!ferry.legs.length) push("error", "ferry", `${prefix}Agregue al menos un trayecto en ferry.`);
  ferry.legs.forEach((leg, index) => {
    const name = `${prefix}Trayecto ${index + 1}`;
    if (!leg.operador) push("error", "ferry", `${name}: indique la naviera.`);
    if (!leg.origenPuerto || !leg.destinoPuerto) push("error", "ferry", `${name}: indique el puerto de salida y el de llegada.`);
    if (!leg.salidaFecha || !leg.salidaHora) push("error", "ferry", `${name}: indique la fecha y hora de salida.`);
    if (leg.salidaFecha && leg.llegadaFecha && leg.llegadaFecha < leg.salidaFecha) push("error", "ferry", `${name}: la llegada no puede ser anterior a la salida.`);
    else if (leg.salidaFecha && leg.llegadaFecha === leg.salidaFecha && leg.salidaHora && leg.llegadaHora && leg.llegadaHora <= leg.salidaHora) push("error", "ferry", `${name}: la hora de llegada debe ser posterior a la salida.`);
    const previous = ferry.legs[index - 1];
    if (previous?.salidaFecha && leg.salidaFecha && leg.salidaFecha < previous.salidaFecha) push("error", "ferry", `${name}: sale antes del trayecto anterior.`);
  });
  if (ferry.legs.length && !ferry.confirmado) push("error", "ferry", `${prefix}Confirme los horarios y condiciones del ferry con la naviera.`);
  if (!ferry.equipajeIncluido) push("aviso", "ferry", `${prefix}Indique el equipaje incluido en el ferry.`);
  checkInclusions(ferry.inclusiones, ferry.inclusionesConfirmadas, "ferry", prefix || "Ferry: ", push);
}

function serviceChecks(service: GeneralService, push: Push, prefix: string) {
  if (!service.descripcion) push("error", "paquete", `${prefix}describa el servicio.`);
  if (!service.fecha) push("aviso", "paquete", `${prefix}indique la fecha del servicio.`);
  if (service.fecha && service.fechaFin && service.fechaFin < service.fecha) push("error", "paquete", `${prefix}la fecha de fin no puede ser anterior a la de inicio.`);
  checkInclusions(service.inclusiones, service.inclusionesConfirmadas, "paquete", prefix, push);
}

function packageChecks(details: QuotationDetails, items: PricingLine[], push: Push) {
  const { componentes, mostrarPrecios, lineas } = details.paquete;
  if (!componentes.length) push("error", "paquete", "Agregue al menos un servicio al paquete.");
  componentes.forEach((component, index) => {
    const prefix = `${componentLabel(component, index)}: `;
    if (component.vuelo) flightChecks(component.vuelo, push, prefix);
    if (component.hotel) hotelChecks([component.hotel], push, prefix);
    if (component.ferry) ferryChecks(component.ferry, push, prefix);
    if (component.servicio) serviceChecks(component.servicio, push, prefix);
  });
  if (mostrarPrecios && items.length && lineas.length === items.length) {
    for (const [index, component] of componentes.entries()) if (!lineas.includes(component.id)) push("aviso", "precio", `${componentLabel(component, index)}: no tiene un concepto de precio propio; en el PDF aparecerá sin precio.`);
  }
  stayVersusFlightChecks(componentes, push);
}

const calendarDay = (value: string) => new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));

// Hotels against the package's flights: a stay that starts before the customer lands, starts after it
// (a night without lodging) or ends after the return flight leaves. Warnings only: a late arrival or an
// extra night can be intentional.
function stayVersusFlightChecks(componentes: PackageComponent[], push: Push) {
  const journeys = componentes.flatMap(component => component.vuelo?.vuelos.journeys ?? []).filter(journey => journey.segmentos.length);
  const arrival = journeys[0]?.segmentos.at(-1)?.llegadaFecha ?? "";
  const homeward = journeys.length > 1 ? journeys.at(-1)?.segmentos[0]?.salidaFecha ?? "" : "";
  const stays = componentes.map((component, index) => ({ component, index })).filter(entry => entry.component.hotel);
  if (!stays.length || (!arrival && !homeward)) return;
  const sorted = stays.filter(entry => datePattern.test(entry.component.hotel!.checkIn)).sort((a, b) => a.component.hotel!.checkIn.localeCompare(b.component.hotel!.checkIn));
  const first = sorted[0];
  if (first && datePattern.test(arrival)) {
    const { checkIn } = first.component.hotel!;
    const prefix = `${componentLabel(first.component, first.index)}: `;
    if (checkIn < arrival) push("aviso", "paquete", `${prefix}la entrada (${calendarDay(checkIn)}) es antes de la llegada del vuelo (${calendarDay(arrival)}).`);
    else if (checkIn > arrival) push("aviso", "paquete", `${prefix}el vuelo llega el ${calendarDay(arrival)} y la entrada al hotel es el ${calendarDay(checkIn)}; revise el alojamiento de la primera noche.`);
  }
  if (datePattern.test(homeward)) {
    for (const { component, index } of stays) {
      const { checkOut } = component.hotel!;
      if (datePattern.test(checkOut) && checkOut > homeward) push("aviso", "paquete", `${componentLabel(component, index)}: la salida del hotel (${calendarDay(checkOut)}) es después del vuelo de regreso (${calendarDay(homeward)}).`);
    }
  }
}

export function quotationReadiness(kind: QuotationKind, details: QuotationDetails, items: PricingLine[], now = new Date()): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const push: Push = (nivel, seccion, mensaje) => issues.push({ nivel, seccion, mensaje });
  if (kind === "vuelo" || (kind === "paquete" && details.vuelos.journeys.length)) flightChecks(details, push);
  if (kind === "hotel" || (kind === "paquete" && details.hoteles.length)) hotelChecks(details.hoteles, push);
  if (kind === "ferry" || (kind === "paquete" && details.ferry.legs.length)) ferryChecks(details.ferry, push);
  if (kind === "combinado") packageChecks(details, items, push);
  if (!items.length) push("error", "precio", "Agregue al menos un concepto de precio.");
  const summary = pricingSummary(items, details);
  if (summary.total < 0) push("error", "precio", "Los descuentos superan el total.");
  if (summary.deposito !== null && summary.deposito > summary.total) push("error", "precio", "El anticipo no puede ser mayor que el total.");
  if (!details.validez.venceEn) push("error", "validez", "Indique hasta cuándo es válida la cotización.");
  else if (isExpired(details.validez.venceEn, now)) push("error", "validez", "La validez ya venció. Actualice la fecha y hora antes de enviar.");
  if (!details.condiciones.length) push("error", "condiciones", "Incluya las condiciones de la cotización.");
  else if (details.aprobacionCondiciones?.huella !== termsFingerprint(details.condiciones)) push("error", "condiciones", "Revise y apruebe las condiciones de esta cotización.");
  return issues;
}

function checkInclusions(list: Inclusion[], confirmed: boolean, section: string, prefix: string, push: Push) {
  const undecided = list.filter(item => !item.estado);
  if (undecided.length) push("error", section, `${prefix}indique si está incluido: ${undecided.map(item => item.nombre).join(", ")}.`);
  if (list.length && !confirmed) push("error", section, `${prefix}confirme lo que incluye y lo que no.`);
}

// Keeps the general trip dates in step with the itinerary and the hotels when the advisor left them empty.
export function derivedTripDates(source: QuotationDetails) {
  const details = expandedDetails(source);
  const segments = details.vuelos.journeys.flatMap(journey => journey.segmentos);
  const hotelDates = details.hoteles.flatMap(hotel => [hotel.checkIn, hotel.checkOut]).filter(Boolean).sort();
  const ferryDates = details.ferry.legs.map(leg => leg.salidaFecha).filter(Boolean);
  const start = details.fechaSalida || segments[0]?.salidaFecha || hotelDates[0] || ferryDates[0] || "";
  const lastJourney = details.vuelos.journeys.length > 1 ? details.vuelos.journeys.at(-1)?.segmentos[0]?.salidaFecha : "";
  const end = details.fechaRegreso || lastJourney || hotelDates.at(-1) || (ferryDates.length > 1 ? ferryDates.at(-1) : "") || "";
  return { salida: start, regreso: end };
}

export function nights(checkIn: string, checkOut: string) {
  if (!datePattern.test(checkIn) || !datePattern.test(checkOut)) return 0;
  return Math.max(0, Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000));
}

// Deterministic fingerprint (53-bit, hex) of the exact clause text, computed the same way in the browser
// and on the server. It detects any change to approved conditions; it is not a security signature.
export function termsFingerprint(clauses: string[]) {
  const input = clauses.map(clause => clause.trim()).join("␞");
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

// The approval a save may keep: only when the submitted fingerprint matches the clauses being saved.
// The approver and time come from the server session, never from the browser.
export function resolveTermsApproval(submitted: QuotationDetails, previous: QuotationDetails["aprobacionCondiciones"], userId: string, now: string) {
  const current = termsFingerprint(submitted.condiciones);
  if (!submitted.condiciones.length || submitted.aprobacionCondiciones?.huella !== current) return null;
  if (previous?.huella === current && previous.por) return previous;
  return { huella: current, por: userId, en: now };
}
