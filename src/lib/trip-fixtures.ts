// Anonymized reservations for visual QA of the traveller surfaces (portal page, itinerary PDF, emails).
// They exercise the shapes real trips take: connections, overnight and next-day arrivals, an airport
// change, hotels, transfers, tours, many travelers with long names, partial payment and cancellation.
// No real customer data: every name, code and number here is invented test data.

import type { PublicTravel } from "@/lib/travel-operations";
import type { TripInput } from "@/lib/trip-view";

const leg = (id: string, origen: string, destino: string, salidaFecha: string, salidaHora: string, llegadaFecha: string, llegadaHora: string, aerolinea: string, vuelo: string, extra: Record<string, unknown> = {}) => ({ id, origen, origenNombre: "", destino, destinoNombre: "", salidaFecha, salidaHora, llegadaFecha, llegadaHora, aerolinea, vuelo, operadoPor: "", aeronave: "", cabina: "Económica", claseReserva: "", duracionMin: null, revisar: [], ...extra });
const piece = (estado: string, piezas: number | null = null, peso = "", medidas = "") => ({ estado, piezas, peso, medidas });
const traveler = (id: string, firstName: string, lastName: string, category: "adulto" | "nino" | "infante" = "adulto", middleName = "") => ({ id, firstName, middleName, lastName, category });
const reservation = (codigo: string, destino: string, fecha_inicio: string, fecha_fin: string, total: number, extra: Partial<TripInput["reservation"]> = {}): TripInput["reservation"] => ({ id: "00000000-0000-4000-8000-000000000000", codigo, destino, estado: "pendiente", prerreserva: false, supplier_status: "pendiente", fecha_inicio, fecha_fin, moneda: "USD", total, ...extra });

export type TripFixture = { label: string; customerName: string; input: TripInput; thread: { available: boolean; messages: { id: string; sender: "cliente" | "agencia"; topic: null | "vuelo" | "otro"; body: string; created_at: string; customer_read_at: string | null; agency_read_at: string | null }[] } };

export function tripFixtures(today = "2026-10-21"): Record<string, TripFixture> {
  const pending: PublicTravel = { passengers: [traveler("p1", "MARÍA JOSÉ", "PRUEBA CASTILLO"), traveler("p2", "JUAN CARLOS", "PRUEBA CASTILLO")], tickets: [], status: "pendiente", confirmedAt: "", estimateApproved: false, reviewed: true };
  return {
    "miami-pendiente": {
      label: "Vuelo con conexiones, reserva registrada, abono parcial",
      customerName: "María José Prueba Castillo",
      input: {
        reservation: reservation("VT-QA0001AB", "Miami", "2026-11-18", "2026-11-23", 1450),
        details: {
          pasajeros: { adultos: 2, ninos: 0, infantes: 0, edadesNinos: "" },
          vuelos: { journeys: [
            { id: "j1", tipo: "ida", segmentos: [leg("s1", "SAP", "SAL", "2026-11-18", "06:15", "2026-11-18", "07:10", "Avianca", "AV 621"), leg("s2", "SAL", "MIA", "2026-11-18", "08:40", "2026-11-18", "12:55", "Avianca", "AV 580")] },
            { id: "j2", tipo: "regreso", segmentos: [leg("s3", "MIA", "SAL", "2026-11-23", "18:20", "2026-11-23", "20:25", "Avianca", "AV 581"), leg("s4", "SAL", "SAP", "2026-11-23", "21:50", "2026-11-23", "22:40", "Avianca", "AV 626")] },
          ], textoOriginal: "", confirmado: true, boletosSeparados: false },
          equipaje: [{ id: "b1", alcance: "Todos los vuelos", personal: piece("incluido", 1), mano: piece("incluido", 1, "10 kg"), documentado: piece("no_incluido"), adicional: "", notas: "Equipaje documentado disponible con cargo adicional al hacer el check-in." }],
        },
        travel: pending,
        payments: [{ monto: 500, moneda: "USD", fecha_pago: "2026-10-15" }],
        receipts: [],
        documents: [],
        today,
      },
      thread: { available: true, messages: [
        { id: "m1", sender: "cliente", topic: "vuelo", body: "Buenas tardes, ¿el vuelo de regreso incluye maleta documentada?", created_at: "2026-10-19T22:10:00Z", customer_read_at: null, agency_read_at: "2026-10-20T13:00:00Z" },
        { id: "m2", sender: "agencia", topic: null, body: "Buenas tardes. La tarifa incluye artículo personal y equipaje de mano de 10 kg. Si desea agregar una maleta documentada, le cotizamos el cargo con la aerolínea.", created_at: "2026-10-20T13:05:00Z", customer_read_at: null, agency_read_at: null },
      ] },
    },
    "cancun-listo": {
      label: "Paquete combinado emitido: vuelo, hotel, traslado y tour, pagado",
      customerName: "Ana Lucía Ejemplo",
      input: {
        reservation: reservation("VT-QA0002CD", "Cancún, México", "2026-10-25", "2026-10-31", 2380, { estado: "confirmada", supplier_status: "emitida" }),
        details: {
          pasajeros: { adultos: 2, ninos: 1, infantes: 0, edadesNinos: "8" },
          paquete: { nombre: "Cancún todo incluido", mostrarPrecios: false, lineas: [], componentes: [
            { id: "c1", tipo: "vuelo", titulo: "", notas: "", hotel: null, ferry: null, servicio: null, vuelo: {
              vuelos: { journeys: [
                { id: "j1", tipo: "ida", segmentos: [leg("s1", "SAP", "MEX", "2026-10-25", "21:30", "2026-10-25", "23:55", "Aeroméxico", "AM 677"), leg("s2", "MEX", "CUN", "2026-10-26", "07:05", "2026-10-26", "10:20", "Aeroméxico", "AM 530", { operadoPor: "Aeroméxico Connect" })] },
                { id: "j2", tipo: "regreso", segmentos: [leg("s3", "CUN", "MEX", "2026-10-31", "13:10", "2026-10-31", "15:35", "Aeroméxico", "AM 531"), leg("s4", "MEX", "SAP", "2026-10-31", "17:45", "2026-10-31", "19:50", "Aeroméxico", "AM 676")] },
              ], textoOriginal: "", confirmado: true, boletosSeparados: false },
              tarifas: [], equipaje: [{ id: "b1", alcance: "Todos los vuelos", personal: piece("incluido", 1), mano: piece("incluido", 1, "10 kg"), documentado: piece("incluido", 1, "23 kg"), adicional: "", notas: "" }], equipajeConfirmado: true,
            } },
            { id: "c2", tipo: "traslado", titulo: "Traslado aeropuerto – hotel", notas: "", vuelo: null, hotel: null, ferry: null, servicio: { descripcion: "Traslado compartido desde el aeropuerto de Cancún", operador: "Operador local de prueba", fecha: "2026-10-26", hora: "11:00", fechaFin: "", lugar: "Terminal 3, salida de llegadas internacionales", duracion: "35 min", modalidad: "compartido", inclusiones: [], inclusionesConfirmadas: false, cancelacion: "" } },
            { id: "c3", tipo: "hotel", titulo: "", notas: "", vuelo: null, ferry: null, servicio: null, hotel: { id: "h1", nombre: "Hotel de prueba Playa Turquesa", destino: "Cancún, zona hotelera", direccion: "Blvd. Kukulcán km 10, zona hotelera", checkIn: "2026-10-26", checkOut: "2026-10-31", habitaciones: [{ id: "r1", categoria: "Habitación de lujo vista al mar", camas: "2 camas matrimoniales", cantidad: 1, adultos: 2, ninos: 1, edadesNinos: "8" }], planComidas: "Todo incluido", amenidades: "", inclusiones: [{ id: "i1", nombre: "Bebidas", estado: "incluido", detalle: "" }, { id: "i2", nombre: "Wi-Fi", estado: "incluido", detalle: "" }], inclusionesConfirmadas: true, impuestos: "incluidos", cargoResort: "", cancelacion: "", reembolso: "", condiciones: "", fotos: [], catalogoId: "" } },
            { id: "c4", tipo: "tour", titulo: "Tour a Chichén Itzá", notas: "", vuelo: null, hotel: null, ferry: null, servicio: { descripcion: "Chichén Itzá con almuerzo y cenote", operador: "", fecha: "2026-10-28", hora: "07:00", fechaFin: "", lugar: "Recepción del hotel", duracion: "12 h", modalidad: "compartido", inclusiones: [{ id: "t1", nombre: "Transporte", estado: "incluido", detalle: "" }, { id: "t2", nombre: "Almuerzo", estado: "incluido", detalle: "" }, { id: "t3", nombre: "Entradas", estado: "incluido", detalle: "" }], inclusionesConfirmadas: true, cancelacion: "" } },
          ] },
        },
        travel: { passengers: [traveler("p1", "ANA LUCÍA", "EJEMPLO"), traveler("p2", "ROBERTO", "EJEMPLO"), traveler("p3", "SOFÍA", "EJEMPLO", "nino")], tickets: ["p1", "p2", "p3"].map((id, index) => ({ passengerId: id, airline: "Aeroméxico", pnr: "QAPNR1", number: `139-000000000${index}`, issueDate: "2026-10-16", segments: "SAP-MEX-CUN-MEX-SAP" })), status: "emitida", confirmedAt: "2026-10-16", estimateApproved: false, reviewed: true },
        payments: [{ monto: 1000, moneda: "USD", fecha_pago: "2026-10-01" }, { monto: 1380, moneda: "USD", fecha_pago: "2026-10-15" }],
        receipts: [{ id: "r1", number: "REC-00000001", created_at: "2026-10-01T15:00:00Z", snapshot: { amount: 1000, currency: "USD", date: "2026-10-01" } }, { id: "r2", number: "REC-00000002", created_at: "2026-10-15T15:00:00Z", snapshot: { amount: 1380, currency: "USD", date: "2026-10-15" } }],
        documents: [{ path: "00000000-0000-4000-8000-000000000000/viatour/abcdef12-Voucher-hotel-Playa-Turquesa.pdf", name: "Voucher hotel Playa Turquesa.pdf", source: "agency", createdAt: "2026-10-17T15:00:00Z" }],
        today,
      },
      thread: { available: true, messages: [] },
    },
    "grupo-multidestino": {
      label: "Grupo de 9 con nombres largos, multidestino, cambio de aeropuerto, emisión en curso, saldo",
      customerName: "Guadalupe Fernanda de los Ángeles Prueba",
      input: {
        reservation: reservation("VT-QA0003EF", "Nueva York y Toronto", "2026-12-10", "2026-12-22", 14250.5, { estado: "confirmada", supplier_status: "confirmada" }),
        details: {
          pasajeros: { adultos: 7, ninos: 1, infantes: 1, edadesNinos: "10" },
          vuelos: { journeys: [
            { id: "j1", tipo: "tramo", segmentos: [leg("s1", "TGU", "MIA", "2026-12-10", "10:40", "2026-12-10", "14:55", "American Airlines", "AA 1258"), leg("s2", "MIA", "JFK", "2026-12-10", "17:30", "2026-12-10", "20:35", "American Airlines", "AA 2402", { aeronave: "Boeing 737-800" })] },
            { id: "j2", tipo: "tramo", segmentos: [leg("s3", "LGA", "YYZ", "2026-12-16", "06:00", "2026-12-16", "07:45", "Air Canada", "AC 7015", { operadoPor: "Jazz Aviation" })] },
            { id: "j3", tipo: "tramo", segmentos: [leg("s4", "YYZ", "IAH", "2026-12-22", "23:10", "2026-12-23", "02:05", "United Airlines", "UA 1702"), leg("s5", "IAH", "SAP", "2026-12-23", "09:30", "2026-12-23", "12:20", "United Airlines", "UA 1488")] },
          ], textoOriginal: "", confirmado: true, boletosSeparados: true },
          equipaje: [{ id: "b1", alcance: "American Airlines", personal: piece("incluido", 1), mano: piece("incluido", 1), documentado: piece("con_cargo"), adicional: "", notas: "" }, { id: "b2", alcance: "Air Canada y United", personal: piece("incluido", 1), mano: piece("incluido", 1), documentado: piece("incluido", 1, "23 kg", "158 cm lineales"), adicional: "", notas: "" }],
        },
        travel: { passengers: [
          traveler("p1", "GUADALUPE FERNANDA", "DE LOS ÁNGELES PRUEBA HERNÁNDEZ", "adulto", "MARÍA"), traveler("p2", "JOSÉ ANTONIO", "PRUEBA HERNÁNDEZ"), traveler("p3", "MARÍA FERNANDA", "PRUEBA LÓPEZ"), traveler("p4", "CARLOS EDUARDO", "PRUEBA LÓPEZ"), traveler("p5", "LUISA", "EJEMPLO MARTÍNEZ"), traveler("p6", "RAFAEL", "EJEMPLO MARTÍNEZ"), traveler("p7", "TERESA", "EJEMPLO RAMOS"), traveler("p8", "DIEGO", "PRUEBA LÓPEZ", "nino"), traveler("p9", "VALENTINA", "PRUEBA LÓPEZ", "infante"),
        ], tickets: [], status: "en_emision", confirmedAt: "2026-10-18", estimateApproved: true, estimateMinHours: 24, estimateMaxHours: 48, reviewed: true },
        payments: [{ monto: 7000, moneda: "USD", fecha_pago: "2026-10-10" }],
        receipts: [{ id: "r1", number: "REC-00000003", created_at: "2026-10-10T15:00:00Z", snapshot: { amount: 7000, currency: "USD", date: "2026-10-10" } }],
        documents: [{ path: "00000000-0000-4000-8000-000000000000/cliente/11111111-1111-4111-8111-111111111111.pdf", name: "x", source: "customer", createdAt: "2026-10-12T15:00:00Z" }],
        today,
      },
      thread: { available: false, messages: [] },
    },
    "cancelada": {
      label: "Reserva cancelada",
      customerName: "Cliente Prueba",
      input: {
        reservation: reservation("VT-QA0004GH", "Cartagena", "2026-11-05", "2026-11-09", 980, { estado: "cancelada" }),
        details: { pasajeros: { adultos: 1, ninos: 0, infantes: 0, edadesNinos: "" }, vuelos: { journeys: [{ id: "j1", tipo: "ida", segmentos: [leg("s1", "SAP", "PTY", "2026-11-05", "11:00", "2026-11-05", "13:55", "Copa Airlines", "CM 392"), leg("s2", "PTY", "CTG", "2026-11-05", "15:40", "2026-11-05", "17:30", "Copa Airlines", "CM 175")] }], textoOriginal: "", confirmado: true, boletosSeparados: false } },
        travel: { ...pending, passengers: [traveler("p1", "CLIENTE", "PRUEBA")] },
        payments: [], receipts: [], documents: [], today,
      },
      thread: { available: true, messages: [] },
    },
  };
}
