// Reference data for the flight itinerary parser and the quotation PDF. It only fills presentation gaps
// (Spanish city names, a clean airport name, the airline name behind a designator) and lets the parser
// check durations against real time zones. It never adds flights, times or fares: those always come from
// the pasted itinerary or the advisor. Unknown codes are left as written and flagged for review.
//
// Curated list (V6, 2026-10-14): airports relevant to outbound travel from Honduras, each with its IANA
// time zone. Add an airport only with a verified zone; an airport that is missing is never guessed.

export type AirportInfo = { ciudad: string; nombre: string; zona: string };

const NY = "America/New_York";
const CHI = "America/Chicago";
const DEN = "America/Denver";
const LA = "America/Los_Angeles";
const MX = "America/Mexico_City";
const HN = "America/Tegucigalpa";

// [IATA, city, airport, IANA zone]
const list: [string, string, string, string][] = [
  // Honduras
  ["SAP", "San Pedro Sula", "Aeropuerto Internacional Ramón Villeda Morales", HN],
  ["TGU", "Tegucigalpa", "Aeropuerto Internacional Toncontín", HN],
  ["XPL", "Comayagua", "Aeropuerto Internacional de Palmerola", HN],
  ["RTB", "Roatán", "Aeropuerto Internacional Juan Manuel Gálvez", HN],
  ["LCE", "La Ceiba", "Aeropuerto Internacional Golosón", HN],
  // Central America
  ["SAL", "San Salvador", "Aeropuerto Internacional de El Salvador", "America/El_Salvador"],
  ["GUA", "Ciudad de Guatemala", "Aeropuerto Internacional La Aurora", "America/Guatemala"],
  ["FRS", "Flores", "Aeropuerto Internacional Mundo Maya", "America/Guatemala"],
  ["MGA", "Managua", "Aeropuerto Internacional Augusto C. Sandino", "America/Managua"],
  ["SJO", "San José", "Aeropuerto Internacional Juan Santamaría", "America/Costa_Rica"],
  ["LIR", "Liberia", "Aeropuerto Internacional Daniel Oduber Quirós", "America/Costa_Rica"],
  ["PTY", "Ciudad de Panamá", "Aeropuerto Internacional de Tocumen", "America/Panama"],
  ["BZE", "Belice", "Aeropuerto Internacional Philip S. W. Goldson", "America/Belize"],
  // Mexico
  ["MEX", "Ciudad de México", "Aeropuerto Internacional de la Ciudad de México", MX],
  ["NLU", "Ciudad de México", "Aeropuerto Internacional Felipe Ángeles", MX],
  ["CUN", "Cancún", "Aeropuerto Internacional de Cancún", "America/Cancun"],
  ["CZM", "Cozumel", "Aeropuerto Internacional de Cozumel", "America/Cancun"],
  ["MID", "Mérida", "Aeropuerto Internacional de Mérida", "America/Merida"],
  ["MTY", "Monterrey", "Aeropuerto Internacional de Monterrey", "America/Monterrey"],
  ["GDL", "Guadalajara", "Aeropuerto Internacional de Guadalajara", MX],
  ["PVR", "Puerto Vallarta", "Aeropuerto Internacional de Puerto Vallarta", MX],
  ["SJD", "Los Cabos", "Aeropuerto Internacional de Los Cabos", "America/Mazatlan"],
  ["MZT", "Mazatlán", "Aeropuerto Internacional de Mazatlán", "America/Mazatlan"],
  ["OAX", "Oaxaca", "Aeropuerto Internacional de Oaxaca", MX],
  ["HUX", "Huatulco", "Aeropuerto Internacional de Bahías de Huatulco", MX],
  ["ACA", "Acapulco", "Aeropuerto Internacional de Acapulco", MX],
  ["BJX", "León", "Aeropuerto Internacional del Bajío", MX],
  ["QRO", "Querétaro", "Aeropuerto Internacional de Querétaro", MX],
  ["TGZ", "Tuxtla Gutiérrez", "Aeropuerto Internacional Ángel Albino Corzo", MX],
  ["VSA", "Villahermosa", "Aeropuerto Internacional de Villahermosa", MX],
  ["TIJ", "Tijuana", "Aeropuerto Internacional de Tijuana", "America/Tijuana"],
  ["HMO", "Hermosillo", "Aeropuerto Internacional de Hermosillo", "America/Hermosillo"],
  // United States
  ["MIA", "Miami", "Aeropuerto Internacional de Miami", NY],
  ["FLL", "Fort Lauderdale", "Aeropuerto Internacional de Fort Lauderdale-Hollywood", NY],
  ["PBI", "West Palm Beach", "Aeropuerto Internacional de Palm Beach", NY],
  ["MCO", "Orlando", "Aeropuerto Internacional de Orlando", NY],
  ["TPA", "Tampa", "Aeropuerto Internacional de Tampa", NY],
  ["RSW", "Fort Myers", "Aeropuerto Internacional del Suroeste de Florida", NY],
  ["JAX", "Jacksonville", "Aeropuerto Internacional de Jacksonville", NY],
  ["ATL", "Atlanta", "Aeropuerto Internacional Hartsfield-Jackson", NY],
  ["CLT", "Charlotte", "Aeropuerto Internacional de Charlotte Douglas", NY],
  ["RDU", "Raleigh-Durham", "Aeropuerto Internacional de Raleigh-Durham", NY],
  ["CHS", "Charleston", "Aeropuerto Internacional de Charleston", NY],
  ["SAV", "Savannah", "Aeropuerto Internacional de Savannah/Hilton Head", NY],
  ["JFK", "Nueva York", "Aeropuerto Internacional John F. Kennedy", NY],
  ["LGA", "Nueva York", "Aeropuerto LaGuardia", NY],
  ["EWR", "Newark", "Aeropuerto Internacional Libertad de Newark", NY],
  ["PHL", "Filadelfia", "Aeropuerto Internacional de Filadelfia", NY],
  ["BOS", "Boston", "Aeropuerto Internacional Logan", NY],
  ["BDL", "Hartford", "Aeropuerto Internacional Bradley", NY],
  ["PVD", "Providence", "Aeropuerto Internacional T. F. Green", NY],
  ["IAD", "Washington D. C.", "Aeropuerto Internacional Washington Dulles", NY],
  ["DCA", "Washington D. C.", "Aeropuerto Nacional Ronald Reagan", NY],
  ["BWI", "Baltimore", "Aeropuerto Internacional de Baltimore-Washington", NY],
  ["PIT", "Pittsburgh", "Aeropuerto Internacional de Pittsburgh", NY],
  ["CLE", "Cleveland", "Aeropuerto Internacional Hopkins de Cleveland", NY],
  ["CMH", "Columbus", "Aeropuerto Internacional John Glenn de Columbus", NY],
  ["CVG", "Cincinnati", "Aeropuerto Internacional de Cincinnati/Norte de Kentucky", NY],
  ["DTW", "Detroit", "Aeropuerto Metropolitano de Detroit", "America/Detroit"],
  ["IND", "Indianápolis", "Aeropuerto Internacional de Indianápolis", "America/Indiana/Indianapolis"],
  ["ORD", "Chicago", "Aeropuerto Internacional O'Hare", CHI],
  ["MDW", "Chicago", "Aeropuerto Internacional Midway", CHI],
  ["MSP", "Minneapolis", "Aeropuerto Internacional de Minneapolis-Saint Paul", CHI],
  ["STL", "San Luis", "Aeropuerto Internacional Lambert de San Luis", CHI],
  ["MCI", "Kansas City", "Aeropuerto Internacional de Kansas City", CHI],
  ["BNA", "Nashville", "Aeropuerto Internacional de Nashville", CHI],
  ["MEM", "Memphis", "Aeropuerto Internacional de Memphis", CHI],
  ["MSY", "Nueva Orleans", "Aeropuerto Internacional Louis Armstrong", CHI],
  ["IAH", "Houston", "Aeropuerto Intercontinental George Bush", CHI],
  ["HOU", "Houston", "Aeropuerto William P. Hobby", CHI],
  ["DFW", "Dallas", "Aeropuerto Internacional de Dallas-Fort Worth", CHI],
  ["DAL", "Dallas", "Aeropuerto Love Field de Dallas", CHI],
  ["AUS", "Austin", "Aeropuerto Internacional Austin-Bergstrom", CHI],
  ["SAT", "San Antonio", "Aeropuerto Internacional de San Antonio", CHI],
  ["DEN", "Denver", "Aeropuerto Internacional de Denver", DEN],
  ["SLC", "Salt Lake City", "Aeropuerto Internacional de Salt Lake City", DEN],
  ["ELP", "El Paso", "Aeropuerto Internacional de El Paso", DEN],
  ["PHX", "Phoenix", "Aeropuerto Internacional Sky Harbor", "America/Phoenix"],
  ["LAS", "Las Vegas", "Aeropuerto Internacional Harry Reid", LA],
  ["LAX", "Los Ángeles", "Aeropuerto Internacional de Los Ángeles", LA],
  ["BUR", "Burbank", "Aeropuerto Hollywood Burbank", LA],
  ["ONT", "Ontario", "Aeropuerto Internacional de Ontario", LA],
  ["SNA", "Santa Ana", "Aeropuerto John Wayne", LA],
  ["SAN", "San Diego", "Aeropuerto Internacional de San Diego", LA],
  ["SFO", "San Francisco", "Aeropuerto Internacional de San Francisco", LA],
  ["OAK", "Oakland", "Aeropuerto Internacional de Oakland", LA],
  ["SJC", "San José (California)", "Aeropuerto Internacional Mineta de San José", LA],
  ["SMF", "Sacramento", "Aeropuerto Internacional de Sacramento", LA],
  ["SEA", "Seattle", "Aeropuerto Internacional de Seattle-Tacoma", LA],
  ["PDX", "Portland", "Aeropuerto Internacional de Portland", LA],
  ["ANC", "Anchorage", "Aeropuerto Internacional Ted Stevens de Anchorage", "America/Anchorage"],
  ["HNL", "Honolulu", "Aeropuerto Internacional Daniel K. Inouye", "Pacific/Honolulu"],
  ["SJU", "San Juan", "Aeropuerto Internacional Luis Muñoz Marín", "America/Puerto_Rico"],
  // Canada
  ["YYZ", "Toronto", "Aeropuerto Internacional Toronto Pearson", "America/Toronto"],
  ["YUL", "Montreal", "Aeropuerto Internacional Montréal-Trudeau", "America/Toronto"],
  ["YOW", "Ottawa", "Aeropuerto Internacional Macdonald-Cartier de Ottawa", "America/Toronto"],
  ["YYC", "Calgary", "Aeropuerto Internacional de Calgary", "America/Edmonton"],
  ["YVR", "Vancouver", "Aeropuerto Internacional de Vancouver", "America/Vancouver"],
  // Caribbean
  ["HAV", "La Habana", "Aeropuerto Internacional José Martí", "America/Havana"],
  ["VRA", "Varadero", "Aeropuerto Internacional Juan Gualberto Gómez", "America/Havana"],
  ["PUJ", "Punta Cana", "Aeropuerto Internacional de Punta Cana", "America/Santo_Domingo"],
  ["SDQ", "Santo Domingo", "Aeropuerto Internacional Las Américas", "America/Santo_Domingo"],
  ["STI", "Santiago de los Caballeros", "Aeropuerto Internacional del Cibao", "America/Santo_Domingo"],
  ["MBJ", "Montego Bay", "Aeropuerto Internacional Sangster", "America/Jamaica"],
  ["KIN", "Kingston", "Aeropuerto Internacional Norman Manley", "America/Jamaica"],
  ["NAS", "Nasáu", "Aeropuerto Internacional Lynden Pindling", "America/Nassau"],
  ["GCM", "Gran Caimán", "Aeropuerto Internacional Owen Roberts", "America/Cayman"],
  ["AUA", "Aruba", "Aeropuerto Internacional Reina Beatrix", "America/Aruba"],
  ["CUR", "Curazao", "Aeropuerto Internacional Hato", "America/Curacao"],
  ["SXM", "San Martín", "Aeropuerto Internacional Princesa Juliana", "America/Lower_Princes"],
  ["BGI", "Barbados", "Aeropuerto Internacional Grantley Adams", "America/Barbados"],
  ["POS", "Puerto España", "Aeropuerto Internacional de Piarco", "America/Port_of_Spain"],
  // South America
  ["BOG", "Bogotá", "Aeropuerto Internacional El Dorado", "America/Bogota"],
  ["MDE", "Medellín", "Aeropuerto Internacional José María Córdova", "America/Bogota"],
  ["CTG", "Cartagena", "Aeropuerto Internacional Rafael Núñez", "America/Bogota"],
  ["CLO", "Cali", "Aeropuerto Internacional Alfonso Bonilla Aragón", "America/Bogota"],
  ["BAQ", "Barranquilla", "Aeropuerto Internacional Ernesto Cortissoz", "America/Bogota"],
  ["ADZ", "San Andrés", "Aeropuerto Internacional Gustavo Rojas Pinilla", "America/Bogota"],
  ["CCS", "Caracas", "Aeropuerto Internacional Simón Bolívar", "America/Caracas"],
  ["UIO", "Quito", "Aeropuerto Internacional Mariscal Sucre", "America/Guayaquil"],
  ["GYE", "Guayaquil", "Aeropuerto Internacional José Joaquín de Olmedo", "America/Guayaquil"],
  ["LIM", "Lima", "Aeropuerto Internacional Jorge Chávez", "America/Lima"],
  ["CUZ", "Cusco", "Aeropuerto Internacional Alejandro Velasco Astete", "America/Lima"],
  ["LPB", "La Paz", "Aeropuerto Internacional El Alto", "America/La_Paz"],
  ["VVI", "Santa Cruz de la Sierra", "Aeropuerto Internacional Viru Viru", "America/La_Paz"],
  ["SCL", "Santiago", "Aeropuerto Internacional Arturo Merino Benítez", "America/Santiago"],
  ["EZE", "Buenos Aires", "Aeropuerto Internacional Ministro Pistarini", "America/Argentina/Buenos_Aires"],
  ["AEP", "Buenos Aires", "Aeroparque Jorge Newbery", "America/Argentina/Buenos_Aires"],
  ["MVD", "Montevideo", "Aeropuerto Internacional de Carrasco", "America/Montevideo"],
  ["ASU", "Asunción", "Aeropuerto Internacional Silvio Pettirossi", "America/Asuncion"],
  ["GRU", "São Paulo", "Aeropuerto Internacional de Guarulhos", "America/Sao_Paulo"],
  ["GIG", "Río de Janeiro", "Aeropuerto Internacional del Galeão", "America/Sao_Paulo"],
  ["BSB", "Brasilia", "Aeropuerto Internacional de Brasilia", "America/Sao_Paulo"],
  // Europe
  ["MAD", "Madrid", "Aeropuerto Adolfo Suárez Madrid-Barajas", "Europe/Madrid"],
  ["BCN", "Barcelona", "Aeropuerto Josep Tarradellas Barcelona-El Prat", "Europe/Madrid"],
  ["AGP", "Málaga", "Aeropuerto de Málaga-Costa del Sol", "Europe/Madrid"],
  ["PMI", "Palma de Mallorca", "Aeropuerto de Palma de Mallorca", "Europe/Madrid"],
  ["LIS", "Lisboa", "Aeropuerto Humberto Delgado", "Europe/Lisbon"],
  ["OPO", "Oporto", "Aeropuerto Francisco Sá Carneiro", "Europe/Lisbon"],
  ["CDG", "París", "Aeropuerto Charles de Gaulle", "Europe/Paris"],
  ["ORY", "París", "Aeropuerto de París-Orly", "Europe/Paris"],
  ["FCO", "Roma", "Aeropuerto Leonardo da Vinci-Fiumicino", "Europe/Rome"],
  ["MXP", "Milán", "Aeropuerto de Milán-Malpensa", "Europe/Rome"],
  ["VCE", "Venecia", "Aeropuerto Marco Polo de Venecia", "Europe/Rome"],
  ["AMS", "Ámsterdam", "Aeropuerto de Ámsterdam-Schiphol", "Europe/Amsterdam"],
  ["BRU", "Bruselas", "Aeropuerto de Bruselas", "Europe/Brussels"],
  ["LHR", "Londres", "Aeropuerto de Londres-Heathrow", "Europe/London"],
  ["LGW", "Londres", "Aeropuerto de Londres-Gatwick", "Europe/London"],
  ["DUB", "Dublín", "Aeropuerto de Dublín", "Europe/Dublin"],
  ["FRA", "Fráncfort", "Aeropuerto de Fráncfort", "Europe/Berlin"],
  ["MUC", "Múnich", "Aeropuerto de Múnich", "Europe/Berlin"],
  ["ZRH", "Zúrich", "Aeropuerto de Zúrich", "Europe/Zurich"],
  ["VIE", "Viena", "Aeropuerto Internacional de Viena", "Europe/Vienna"],
  ["CPH", "Copenhague", "Aeropuerto de Copenhague", "Europe/Copenhagen"],
  ["PRG", "Praga", "Aeropuerto Václav Havel de Praga", "Europe/Prague"],
  ["ATH", "Atenas", "Aeropuerto Internacional de Atenas", "Europe/Athens"],
  ["IST", "Estambul", "Aeropuerto de Estambul", "Europe/Istanbul"],
  // Middle East and Asia
  ["DXB", "Dubái", "Aeropuerto Internacional de Dubái", "Asia/Dubai"],
  ["DOH", "Doha", "Aeropuerto Internacional Hamad", "Asia/Qatar"],
  ["TLV", "Tel Aviv", "Aeropuerto Internacional Ben Gurión", "Asia/Jerusalem"],
  ["DEL", "Nueva Delhi", "Aeropuerto Internacional Indira Gandhi", "Asia/Kolkata"],
  ["BKK", "Bangkok", "Aeropuerto de Bangkok-Suvarnabhumi", "Asia/Bangkok"],
  ["SIN", "Singapur", "Aeropuerto de Singapur-Changi", "Asia/Singapore"],
  ["HKG", "Hong Kong", "Aeropuerto Internacional de Hong Kong", "Asia/Hong_Kong"],
  ["PVG", "Shanghái", "Aeropuerto Internacional de Shanghái-Pudong", "Asia/Shanghai"],
  ["ICN", "Seúl", "Aeropuerto Internacional de Incheon", "Asia/Seoul"],
  ["NRT", "Tokio", "Aeropuerto Internacional de Narita", "Asia/Tokyo"],
  ["HND", "Tokio", "Aeropuerto de Tokio-Haneda", "Asia/Tokyo"],
];

export const airports: Record<string, AirportInfo> = Object.fromEntries(list.map(([code, ciudad, nombre, zona]) => [code, { ciudad, nombre, zona }]));

export const airlines: Record<string, string> = {
  AM: "Aeroméxico", CM: "Copa Airlines", AV: "Avianca", TA: "Avianca", LR: "Avianca", GU: "Avianca", "2K": "Avianca",
  UA: "United Airlines", AA: "American Airlines", DL: "Delta Air Lines", F9: "Frontier Airlines", NK: "Spirit Airlines",
  B6: "JetBlue", WN: "Southwest Airlines", AS: "Alaska Airlines", G4: "Allegiant Air", SY: "Sun Country Airlines",
  Y4: "Volaris", Q6: "Volaris", N3: "Volaris", VB: "Viva Aerobus", "5U": "TAG Airlines", DM: "Arajet",
  IB: "Iberia", UX: "Air Europa", LA: "LATAM Airlines", KL: "KLM", AF: "Air France", BA: "British Airways",
  TK: "Turkish Airlines", AC: "Air Canada", CU: "Cubana de Aviación",
  WS: "WestJet", P5: "Wingo", JA: "JetSMART", H2: "Sky Airline", AR: "Aerolíneas Argentinas", G3: "Gol", AD: "Azul",
  LH: "Lufthansa", LX: "Swiss", TP: "TAP Air Portugal", AZ: "ITA Airways", VY: "Vueling", EK: "Emirates", QR: "Qatar Airways",
  BW: "Caribbean Airlines",
};

export function airportInfo(code: string): AirportInfo | null {
  return airports[code.toUpperCase()] ?? null;
}

export function airlineName(designator: string): string | null {
  return airlines[designator.toUpperCase()] ?? null;
}

// UTC offset in minutes of an IANA zone on a local calendar date and time, e.g. -360 for Honduras.
// Uses Intl only, so it follows daylight-saving rules without bundling a time zone database.
export function zoneOffsetMinutes(zone: string, date: string, time = "12:00"): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) return null;
  try {
    const guess = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(clock[1]), Number(clock[2]));
    const offsetAt = (instant: number) => {
      const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date(instant)).find(item => item.type === "timeZoneName")?.value ?? "";
      const parsed = /GMT(?:([+-])(\d{2}):(\d{2}))?/.exec(part);
      if (!parsed) return null;
      return parsed[1] ? (parsed[1] === "-" ? -1 : 1) * (Number(parsed[2]) * 60 + Number(parsed[3])) : 0;
    };
    const first = offsetAt(guess);
    if (first === null) return null;
    // A second pass settles local times close to a daylight-saving change.
    return offsetAt(guess - first * 60000) ?? first;
  } catch {
    return null;
  }
}
