// Representative quotations for PDF tests and for visual review (scripts/render-quotation-samples.mjs).
// Flights, prices and hotels here are test data only; the photos are the site's own package photos.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { details as detailsModule, parser } from '../pdf-support.mjs';
import { load } from '../security-support.mjs';

const data = load('src/lib/quotation-data.ts', { 'server-only': {}, '@/lib/quotation-details': detailsModule });
const fixture = name => fs.readFileSync(`tests/fixtures/${name}`, 'utf8').replace(/\r\n/g, '\n');
const now = new Date('2026-10-12T15:00:00Z');
const expiry = detailsModule.expiryFromPreset(24, now);

function base(kind, overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000001', codigo: 'COT-20261012-4F2A', customer_id: null,
    cliente_nombre: 'Ana Lucía Pérez Martínez', cliente_email: 'ana.perez@example.com', cliente_telefono: '+504 9999-0000',
    destino: 'Monterrey, México', moneda: 'USD', validez: '2026-10-13', notas: null, total: 0, estado: 'borrador',
    agente_id: '00000000-0000-4000-8000-000000000002', created_at: '2026-10-12T15:00:00Z', tipo: kind, vence_en: expiry, version: 0, ...overrides,
  };
}

function record(kind, quotation, details, items) {
  const clean = detailsModule.sanitizeDetails({ condiciones: detailsModule.termsTemplates[kind], ...details, validez: { venceEn: expiry, zona: 'America/Tegucigalpa', ...(details.validez ?? {}) } });
  const total = items.reduce((sum, item) => sum + (item.tipo === 'Descuento' ? -1 : 1) * item.cantidad * item.precio_unitario, 0);
  return data.toRecord({ ...quotation, total, detalles: clean }, items.map((item, orden) => ({ ...item, orden })), true);
}

const flights = (text, referencia = '2026-10-12') => parser.parseItinerary(text, { referencia }).journeys;
const piece = (estado, piezas = null, peso = '', medidas = '') => ({ estado, piezas, peso, medidas });
const photo = (pkg, number, leyenda = '') => {
  const source = `public/paquetes/${pkg}/${number}.jpg`;
  return { path: `hotel/${createHash('md5').update(source).digest('hex')}.jpg`, leyenda, ancho: 1600, alto: 1067, source };
};

export function photoBuffers(record) {
  const map = new Map();
  for (const hotel of record.details.hoteles) for (const item of hotel.fotos) {
    const source = samplePhotoSources.get(item.path);
    if (source) map.set(item.path, { data: fs.readFileSync(source), format: 'jpg' });
  }
  return map;
}
const samplePhotoSources = new Map();
const photos = list => list.map(item => { samplePhotoSources.set(item.path, item.source); return { path: item.path, leyenda: item.leyenda, ancho: item.ancho, alto: item.alto }; });

export const samples = {
  'vuelo-directo-ida-y-vuelta': () => record('vuelo', base('vuelo', { destino: 'Miami, Estados Unidos' }), {
    origen: 'San Pedro Sula',
    pasajeros: { adultos: 2, ninos: 0, infantes: 0 },
    vuelos: { journeys: flights(`Departing flight Tue, Nov 10
8:05 AM
Ramón Villeda Morales International Airport (SAP)
Travel time: 2 hr 30 min
11:35 AM
Miami International Airport (MIA)
American · Economy · Boeing 737-800 · AA 1450
Returning flight Tue, Nov 17
4:10 PM
Miami International Airport (MIA)
Travel time: 2 hr 45 min
5:55 PM
Ramón Villeda Morales International Airport (SAP)
American · Economy · Boeing 737-800 · AA 1451`), confirmado: true },
    tarifas: [{ aerolinea: 'American Airlines', cabina: 'Económica', tipoTarifa: 'Main Cabin', claseReserva: 'V', cambios: 'Permitidos con diferencia de tarifa', cancelacion: 'Crédito para un viaje futuro, según condiciones de la aerolínea', reembolso: 'no_reembolsable', asientos: 'Selección estándar sin costo' }],
    equipaje: [{ alcance: 'Todos los vuelos', personal: piece('incluido', 1), mano: piece('incluido', 1, '', '56 x 36 x 23 cm'), documentado: piece('con_cargo'), adicional: 'Equipaje documentado desde USD 35 por maleta y trayecto, pagado a la aerolínea.' }],
    equipajeConfirmado: true,
    pago: { precioPorPasajero: true },
  }, [
    { descripcion: 'Tarifa aérea — Adulto', tipo: 'Tarifa aérea', cantidad: 2, precio_unitario: 312 },
    { descripcion: 'Impuestos y tasas aeroportuarias', tipo: 'Impuestos y tasas', cantidad: 2, precio_unitario: 118.4 },
    { descripcion: 'Cargo por servicio', tipo: 'Cargo por servicio', cantidad: 1, precio_unitario: 25 },
  ]),

  'vuelo-dos-conexiones': () => record('vuelo', base('vuelo', { destino: 'Buenos Aires, Argentina' }), {
    origen: 'Tegucigalpa',
    pasajeros: { adultos: 1, ninos: 1, infantes: 0, edadesNinos: '9 años' },
    vuelos: { journeys: flights(`  1  CM 412 Y 03NOV 2 TGUPTY HK2  0705 0930  03NOV  E
  2  CM 151 Y 03NOV 2 PTYBOG HK2  1105 1240  03NOV  E
  3  AV  85 Y 03NOV 2 BOGEZE HK2  1450 2310  03NOV  E
  4  AV  86 Y 15NOV 7 EZEBOG HK2  0105 0545  15NOV  E
  5  CM 152 Y 15NOV 7 BOGPTY HK2  0800 0935  15NOV  E
  6  CM 413 Y 15NOV 7 PTYTGU HK2  1105 1230  15NOV  E`).map(journey => ({ ...journey, segmentos: journey.segmentos.map(segment => ({ ...segment, cabina: 'Económica', revisar: [] })) })), confirmado: true },
    tarifas: [{ aerolinea: 'Copa Airlines y Avianca', cabina: 'Económica', tipoTarifa: 'Económica Clásica', cambios: 'Con penalidad más diferencia de tarifa', cancelacion: 'Con penalidad', reembolso: 'parcial' }],
    equipaje: [{ alcance: 'Todos los vuelos', personal: piece('incluido', 1), mano: piece('incluido', 1, '10 kg'), documentado: piece('incluido', 1, '23 kg') }],
    equipajeConfirmado: true,
    validez: { limiteEmision: '2026-10-14T00:00:00.000Z' },
  }, [
    { descripcion: 'Tarifa aérea — Adulto', tipo: 'Tarifa aérea', cantidad: 1, precio_unitario: 1185 },
    { descripcion: 'Tarifa aérea — Niño', tipo: 'Tarifa aérea', cantidad: 1, precio_unitario: 1010 },
    { descripcion: 'Impuestos y tasas', tipo: 'Impuestos y tasas', cantidad: 2, precio_unitario: 236.75 },
  ]),

  'vuelo-aerolineas-mixtas': () => record('vuelo', base('vuelo', { destino: 'Dallas, Estados Unidos', moneda: 'HNL' }), {
    origen: 'San Pedro Sula',
    pasajeros: { adultos: 1, ninos: 0, infantes: 0 },
    vuelos: { journeys: flights(fixture('frontier-avianca-messy.html')), confirmado: true, boletosSeparados: true },
    tarifas: [
      { alcance: 'Ida (Frontier)', aerolinea: 'Frontier Airlines', cabina: 'Económica', tipoTarifa: 'Basic', cambios: 'Con cargo', reembolso: 'no_reembolsable' },
      { alcance: 'Regreso (Avianca)', aerolinea: 'Avianca', operadoPor: 'Taca International Airlines', cabina: 'Económica', tipoTarifa: 'Classic', cambios: 'Con penalidad', reembolso: 'no_reembolsable' },
    ],
    equipaje: [
      { alcance: 'Ida (Frontier)', personal: piece('incluido', 1), mano: piece('con_cargo'), documentado: piece('con_cargo') },
      { alcance: 'Regreso (Avianca)', personal: piece('incluido', 1), mano: piece('incluido', 1, '10 kg'), documentado: piece('con_cargo') },
    ],
    equipajeConfirmado: true,
    condiciones: [...detailsModule.termsTemplates.vuelo, detailsModule.separateTicketsClause],
  }, [
    { descripcion: 'Boleto de ida (Frontier) — Adulto', tipo: 'Tarifa aérea', cantidad: 1, precio_unitario: 6150.5 },
    { descripcion: 'Boleto de regreso (Avianca) — Adulto', tipo: 'Tarifa aérea', cantidad: 1, precio_unitario: 7420 },
    { descripcion: 'Impuestos y tasas', tipo: 'Impuestos y tasas', cantidad: 1, precio_unitario: 2104.25 },
  ]),

  'hotel-con-fotos': () => record('hotel', base('hotel', { destino: 'Cancún, México', notas: 'Habitación con vista al mar sujeta a disponibilidad al momento del check-in.' }), {
    pasajeros: { adultos: 2, ninos: 0, infantes: 0 },
    hoteles: [{
      nombre: 'Hotel de prueba Riviera', destino: 'Cancún, Quintana Roo, México', direccion: 'Blvd. Kukulcán km 12.5, Zona Hotelera',
      checkIn: '2026-12-20', checkOut: '2026-12-26',
      habitaciones: [{ categoria: 'Habitación Deluxe vista al mar', camas: '1 cama king', cantidad: 1, adultos: 2, ninos: 0 }],
      planComidas: 'Todo incluido', amenidades: 'Wi-Fi\nPiscina\nGimnasio\nKids club\nAcceso a la playa\nRestaurantes a la carta',
      impuestos: 'incluidos', cargoResort: 'Impuesto de saneamiento ambiental pagadero en el hotel', cancelacion: 'Sin cargo hasta 7 días antes de la llegada; después se cobra una noche.', reembolso: 'parcial',
      inclusiones: [{ nombre: 'Plan todo incluido', estado: 'incluido', detalle: 'Comidas y bebidas nacionales' }, { nombre: 'Wi-Fi', estado: 'incluido', detalle: '' }, { nombre: 'Acceso a playa', estado: 'incluido', detalle: '' }, { nombre: 'Club infantil', estado: 'incluido', detalle: '4 a 12 años' }, { nombre: 'Spa', estado: 'con_cargo', detalle: 'Tratamientos desde USD 60' }, { nombre: 'Transporte aeropuerto-hotel', estado: 'no_incluido', detalle: '' }, { nombre: 'Propinas', estado: 'no_incluido', detalle: '' }],
      inclusionesConfirmadas: true,
      fotos: photos([photo('punta-cana-todo-incluido', 2, 'Vista general del hotel'), photo('punta-cana-todo-incluido', 3), photo('punta-cana-todo-incluido', 4), photo('punta-cana-todo-incluido', 5)]),
    }],
    servicios: [{ tipo: 'Traslado', descripcion: 'Aeropuerto – hotel – aeropuerto en servicio compartido' }],
    pago: { deposito: '450', depositoFecha: '2026-10-20', saldoFecha: '2026-11-20', instrucciones: 'Depósito o transferencia a la cuenta que le indique su asesor.' },
    condiciones: detailsModule.termsTemplates.hotel,
  }, [
    { descripcion: 'Hotel de prueba Riviera — 6 noches, Deluxe vista al mar', tipo: 'Hotel', cantidad: 1, precio_unitario: 1840 },
    { descripcion: 'Traslado aeropuerto – hotel – aeropuerto', tipo: 'Traslado', cantidad: 2, precio_unitario: 38 },
  ]),

  'hotel-habitaciones-complejas': () => record('hotel', base('hotel', { destino: 'Cartagena, Colombia y Ciudad de Panamá' }), {
    pasajeros: { adultos: 4, ninos: 3, infantes: 1, edadesNinos: '4, 8 y 11 años' },
    hoteles: [
      { nombre: 'Hotel de prueba Ciudad Amurallada', destino: 'Cartagena, Colombia', checkIn: '2027-01-05', checkOut: '2027-01-09',
        habitaciones: [
          { categoria: 'Habitación familiar', camas: '2 camas queen y sofá cama', cantidad: 1, adultos: 2, ninos: 2, edadesNinos: '4 y 8 años' },
          { categoria: 'Habitación doble superior', camas: '1 cama king', cantidad: 1, adultos: 2, ninos: 1, edadesNinos: '11 años' },
        ],
        planComidas: 'Desayuno incluido', amenidades: 'Wi-Fi\nPiscina en la terraza\nCuna disponible bajo solicitud', impuestos: 'parcial', cargoResort: 'Seguro hotelero obligatorio pagadero en el hotel', cancelacion: 'No reembolsable.', reembolso: 'no_reembolsable',
        fotos: photos([photo('cartagena-all-inclusive', 1, 'Centro histórico'), photo('cartagena-all-inclusive', 2)]) },
      { nombre: 'Hotel de prueba Cinta Costera', destino: 'Ciudad de Panamá, Panamá', checkIn: '2027-01-09', checkOut: '2027-01-12',
        habitaciones: [{ categoria: 'Suite de dos habitaciones', camas: '1 king y 2 dobles', cantidad: 1, adultos: 4, ninos: 3, edadesNinos: '4, 8 y 11 años' }],
        planComidas: 'Solo alojamiento', impuestos: 'incluidos', cancelacion: 'Sin cargo hasta 72 horas antes de la llegada.', reembolso: 'reembolsable',
        fotos: photos([photo('medellin-y-santa-marta', 3)]) },
    ],
    condiciones: detailsModule.termsTemplates.hotel,
  }, [
    { descripcion: 'Cartagena — 4 noches, 2 habitaciones', tipo: 'Hotel', cantidad: 1, precio_unitario: 1468 },
    { descripcion: 'Panamá — 3 noches, suite', tipo: 'Hotel', cantidad: 1, precio_unitario: 945.6 },
    { descripcion: 'Descuento por estadía combinada', tipo: 'Descuento', cantidad: 1, precio_unitario: 120 },
  ]),

  'paquete-vuelo-hotel': () => record('paquete', base('paquete', { destino: 'Monterrey, México' }), {
    origen: 'San Pedro Sula',
    pasajeros: { adultos: 2, ninos: 0, infantes: 0 },
    vuelos: { journeys: flights(fixture('aeromexico-google.txt')), confirmado: true, textoOriginal: 'TEXTO-PEGADO-PRIVADO ' + fixture('aeromexico-google.txt') },
    notasInternas: 'NOTA-INTERNA-PRIVADA comisión 12% proveedor neto 1,050',
    tarifas: [{ aerolinea: 'Aeroméxico', cabina: 'Económica', tipoTarifa: 'Económica Estándar', cambios: 'Con penalidad', reembolso: 'no_reembolsable' }],
    equipaje: [{ alcance: 'Todos los vuelos', personal: piece('incluido', 1), mano: piece('incluido', 1, '10 kg'), documentado: piece('no_incluido'), adicional: 'Equipaje adicional disponible con cargo.' }],
    equipajeConfirmado: true,
    hoteles: [{ nombre: 'Hotel de prueba Barrio Antiguo', destino: 'Monterrey, Nuevo León', checkIn: '2026-10-16', checkOut: '2026-10-25',
      habitaciones: [{ categoria: 'Habitación estándar', camas: '2 camas dobles', cantidad: 1, adultos: 2 }], planComidas: 'Desayuno incluido', impuestos: 'incluidos', cancelacion: 'Sin cargo hasta 3 días antes de la llegada.', reembolso: 'reembolsable',
      fotos: photos([photo('rio-de-janeiro-clasico', 2)]) }],
    servicios: [{ tipo: 'Seguro', descripcion: 'Asistencia al viajero durante todo el viaje' }, { tipo: 'Traslado', descripcion: 'Aeropuerto – hotel – aeropuerto' }],
    pago: { deposito: '600', depositoFecha: '2026-10-13', precioPorPasajero: true },
    condiciones: detailsModule.termsTemplates.paquete,
  }, [
    { descripcion: 'Vuelos SAP – MTY – SAP — Adulto', tipo: 'Tarifa aérea', cantidad: 2, precio_unitario: 489 },
    { descripcion: 'Impuestos y tasas', tipo: 'Impuestos y tasas', cantidad: 2, precio_unitario: 142.3 },
    { descripcion: 'Hotel — 9 noches con desayuno', tipo: 'Hotel', cantidad: 1, precio_unitario: 1215 },
    { descripcion: 'Asistencia al viajero', tipo: 'Seguro', cantidad: 2, precio_unitario: 39 },
    { descripcion: 'Traslados', tipo: 'Traslado', cantidad: 1, precio_unitario: 70 },
    { descripcion: 'Descuento de temporada', tipo: 'Descuento', cantidad: 1, precio_unitario: 50 },
  ]),

  'ferry-ida-y-vuelta': () => record('ferry', base('ferry', { destino: 'Roatán, Islas de la Bahía' }), {
    origen: 'La Ceiba',
    pasajeros: { adultos: 2, ninos: 1, infantes: 0, edadesNinos: '7 años' },
    ferry: {
      legs: [
        { tipo: 'ida', operador: 'Naviera de prueba', embarcacion: 'Embarcación de prueba', origenPuerto: 'Muelle de cabotaje, La Ceiba', destinoPuerto: 'Muelle de Dixon Cove, Roatán', salidaFecha: '2026-12-18', salidaHora: '09:30', llegadaFecha: '2026-12-18', llegadaHora: '11:10', duracionMin: 100 },
        { tipo: 'regreso', operador: 'Naviera de prueba', embarcacion: 'Embarcación de prueba', origenPuerto: 'Muelle de Dixon Cove, Roatán', destinoPuerto: 'Muelle de cabotaje, La Ceiba', salidaFecha: '2026-12-22', salidaHora: '14:00', llegadaFecha: '2026-12-22', llegadaHora: '15:40', duracionMin: 100 },
      ],
      clase: 'Primera', asiento: 'Asignado al abordar', vehiculos: [{ tipo: 'Automóvil', cantidad: 1 }],
      equipajeIncluido: '1 maleta de hasta 23 kg y 1 artículo personal por pasajero', equipajeAdicional: 'USD 5 por maleta adicional',
      inclusiones: [{ nombre: 'Equipaje', estado: 'incluido', detalle: '1 maleta de 23 kg' }, { nombre: 'Asiento asignado', estado: 'incluido', detalle: '' }, { nombre: 'Transporte de vehículo', estado: 'incluido', detalle: 'Automóvil hasta 5 m' }, { nombre: 'Comidas', estado: 'no_incluido', detalle: '' }, { nombre: 'Bebidas', estado: 'con_cargo', detalle: 'Cafetería a bordo' }],
      inclusionesConfirmadas: true,
      cambios: 'Con cargo, hasta 24 horas antes', cancelacion: 'Sin reembolso a menos de 24 horas de la salida.', reembolso: 'parcial',
      embarque: 'Presentarse en el muelle 60 minutos antes; los vehículos, 90 minutos antes.', documentos: 'Documento de identidad de cada pasajero y documentos del vehículo.', confirmado: true,
    },
    pago: { deposito: '100', depositoFecha: '2026-11-15' },
  }, [
    { descripcion: 'Pasaje en ferry — Adulto (ida y vuelta)', tipo: 'Ferry', cantidad: 2, precio_unitario: 82 },
    { descripcion: 'Pasaje en ferry — Niño (ida y vuelta)', tipo: 'Ferry', cantidad: 1, precio_unitario: 61.5 },
    { descripcion: 'Transporte de vehículo — Automóvil', tipo: 'Ferry', cantidad: 1, precio_unitario: 140 },
    { descripcion: 'Tasas portuarias', tipo: 'Impuestos y tasas', cantidad: 3, precio_unitario: 4.25 },
  ]),

  // A quotation saved before docs/sql/quotations_v5.sql: no tipo, no detalles, validity as a date.
  'cotizacion-anterior': () => data.toRecord({ ...base('general'), tipo: undefined, detalles: undefined, vence_en: undefined, version: undefined, validez: '2026-10-20', destino: 'Punta Cana', notas: 'Incluye traslados.', total: 1980 },
    [{ descripcion: 'Paquete Punta Cana 5 noches', tipo: 'Paquete', cantidad: 2, precio_unitario: 990, orden: 0 }], false),
};

export { now as sampleNow };
