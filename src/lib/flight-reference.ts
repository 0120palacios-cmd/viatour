// Reference data for the flight itinerary parser and the quotation PDF. It only fills presentation gaps
// (Spanish city names, a clean airport name, the airline name behind a designator) and lets the parser
// check durations against real time zones. It never adds flights, times or fares: those always come from
// the pasted itinerary or the advisor. Unknown codes are left as written and flagged for review.

export type AirportInfo = { ciudad: string; nombre: string; zona: string };

export const airports: Record<string, AirportInfo> = {
  // Honduras
  SAP: { ciudad: "San Pedro Sula", nombre: "Aeropuerto Internacional Ramón Villeda Morales", zona: "America/Tegucigalpa" },
  TGU: { ciudad: "Tegucigalpa", nombre: "Aeropuerto Internacional Toncontín", zona: "America/Tegucigalpa" },
  XPL: { ciudad: "Comayagua", nombre: "Aeropuerto Internacional de Palmerola", zona: "America/Tegucigalpa" },
  RTB: { ciudad: "Roatán", nombre: "Aeropuerto Internacional Juan Manuel Gálvez", zona: "America/Tegucigalpa" },
  LCE: { ciudad: "La Ceiba", nombre: "Aeropuerto Internacional Golosón", zona: "America/Tegucigalpa" },
  // Central America
  SAL: { ciudad: "San Salvador", nombre: "Aeropuerto Internacional de El Salvador", zona: "America/El_Salvador" },
  GUA: { ciudad: "Ciudad de Guatemala", nombre: "Aeropuerto Internacional La Aurora", zona: "America/Guatemala" },
  FRS: { ciudad: "Flores", nombre: "Aeropuerto Internacional Mundo Maya", zona: "America/Guatemala" },
  MGA: { ciudad: "Managua", nombre: "Aeropuerto Internacional Augusto C. Sandino", zona: "America/Managua" },
  SJO: { ciudad: "San José", nombre: "Aeropuerto Internacional Juan Santamaría", zona: "America/Costa_Rica" },
  LIR: { ciudad: "Liberia", nombre: "Aeropuerto Internacional Daniel Oduber Quirós", zona: "America/Costa_Rica" },
  PTY: { ciudad: "Ciudad de Panamá", nombre: "Aeropuerto Internacional de Tocumen", zona: "America/Panama" },
  BZE: { ciudad: "Belice", nombre: "Aeropuerto Internacional Philip S. W. Goldson", zona: "America/Belize" },
  // Mexico
  MEX: { ciudad: "Ciudad de México", nombre: "Aeropuerto Internacional de la Ciudad de México", zona: "America/Mexico_City" },
  NLU: { ciudad: "Ciudad de México", nombre: "Aeropuerto Internacional Felipe Ángeles", zona: "America/Mexico_City" },
  CUN: { ciudad: "Cancún", nombre: "Aeropuerto Internacional de Cancún", zona: "America/Cancun" },
  MTY: { ciudad: "Monterrey", nombre: "Aeropuerto Internacional de Monterrey", zona: "America/Monterrey" },
  GDL: { ciudad: "Guadalajara", nombre: "Aeropuerto Internacional de Guadalajara", zona: "America/Mexico_City" },
  TIJ: { ciudad: "Tijuana", nombre: "Aeropuerto Internacional de Tijuana", zona: "America/Tijuana" },
  // United States and Canada
  MIA: { ciudad: "Miami", nombre: "Aeropuerto Internacional de Miami", zona: "America/New_York" },
  FLL: { ciudad: "Fort Lauderdale", nombre: "Aeropuerto Internacional de Fort Lauderdale-Hollywood", zona: "America/New_York" },
  MCO: { ciudad: "Orlando", nombre: "Aeropuerto Internacional de Orlando", zona: "America/New_York" },
  TPA: { ciudad: "Tampa", nombre: "Aeropuerto Internacional de Tampa", zona: "America/New_York" },
  ATL: { ciudad: "Atlanta", nombre: "Aeropuerto Internacional Hartsfield-Jackson", zona: "America/New_York" },
  CLT: { ciudad: "Charlotte", nombre: "Aeropuerto Internacional de Charlotte Douglas", zona: "America/New_York" },
  JFK: { ciudad: "Nueva York", nombre: "Aeropuerto Internacional John F. Kennedy", zona: "America/New_York" },
  LGA: { ciudad: "Nueva York", nombre: "Aeropuerto LaGuardia", zona: "America/New_York" },
  EWR: { ciudad: "Newark", nombre: "Aeropuerto Internacional Libertad de Newark", zona: "America/New_York" },
  IAD: { ciudad: "Washington D. C.", nombre: "Aeropuerto Internacional Washington Dulles", zona: "America/New_York" },
  BOS: { ciudad: "Boston", nombre: "Aeropuerto Internacional Logan", zona: "America/New_York" },
  IAH: { ciudad: "Houston", nombre: "Aeropuerto Intercontinental George Bush", zona: "America/Chicago" },
  HOU: { ciudad: "Houston", nombre: "Aeropuerto William P. Hobby", zona: "America/Chicago" },
  DFW: { ciudad: "Dallas", nombre: "Aeropuerto Internacional de Dallas-Fort Worth", zona: "America/Chicago" },
  ORD: { ciudad: "Chicago", nombre: "Aeropuerto Internacional O'Hare", zona: "America/Chicago" },
  MSY: { ciudad: "Nueva Orleans", nombre: "Aeropuerto Internacional Louis Armstrong", zona: "America/Chicago" },
  DEN: { ciudad: "Denver", nombre: "Aeropuerto Internacional de Denver", zona: "America/Denver" },
  PHX: { ciudad: "Phoenix", nombre: "Aeropuerto Internacional Sky Harbor", zona: "America/Phoenix" },
  LAS: { ciudad: "Las Vegas", nombre: "Aeropuerto Internacional Harry Reid", zona: "America/Los_Angeles" },
  LAX: { ciudad: "Los Ángeles", nombre: "Aeropuerto Internacional de Los Ángeles", zona: "America/Los_Angeles" },
  SFO: { ciudad: "San Francisco", nombre: "Aeropuerto Internacional de San Francisco", zona: "America/Los_Angeles" },
  YYZ: { ciudad: "Toronto", nombre: "Aeropuerto Internacional Toronto Pearson", zona: "America/Toronto" },
  YUL: { ciudad: "Montreal", nombre: "Aeropuerto Internacional Montréal-Trudeau", zona: "America/Toronto" },
  // Caribbean and South America
  HAV: { ciudad: "La Habana", nombre: "Aeropuerto Internacional José Martí", zona: "America/Havana" },
  PUJ: { ciudad: "Punta Cana", nombre: "Aeropuerto Internacional de Punta Cana", zona: "America/Santo_Domingo" },
  SDQ: { ciudad: "Santo Domingo", nombre: "Aeropuerto Internacional Las Américas", zona: "America/Santo_Domingo" },
  SJU: { ciudad: "San Juan", nombre: "Aeropuerto Internacional Luis Muñoz Marín", zona: "America/Puerto_Rico" },
  BOG: { ciudad: "Bogotá", nombre: "Aeropuerto Internacional El Dorado", zona: "America/Bogota" },
  MDE: { ciudad: "Medellín", nombre: "Aeropuerto Internacional José María Córdova", zona: "America/Bogota" },
  CTG: { ciudad: "Cartagena", nombre: "Aeropuerto Internacional Rafael Núñez", zona: "America/Bogota" },
  UIO: { ciudad: "Quito", nombre: "Aeropuerto Internacional Mariscal Sucre", zona: "America/Guayaquil" },
  LIM: { ciudad: "Lima", nombre: "Aeropuerto Internacional Jorge Chávez", zona: "America/Lima" },
  SCL: { ciudad: "Santiago", nombre: "Aeropuerto Internacional Arturo Merino Benítez", zona: "America/Santiago" },
  EZE: { ciudad: "Buenos Aires", nombre: "Aeropuerto Internacional Ministro Pistarini", zona: "America/Argentina/Buenos_Aires" },
  GRU: { ciudad: "São Paulo", nombre: "Aeropuerto Internacional de Guarulhos", zona: "America/Sao_Paulo" },
  // Europe and beyond
  MAD: { ciudad: "Madrid", nombre: "Aeropuerto Adolfo Suárez Madrid-Barajas", zona: "Europe/Madrid" },
  BCN: { ciudad: "Barcelona", nombre: "Aeropuerto Josep Tarradellas Barcelona-El Prat", zona: "Europe/Madrid" },
  CDG: { ciudad: "París", nombre: "Aeropuerto Charles de Gaulle", zona: "Europe/Paris" },
  FCO: { ciudad: "Roma", nombre: "Aeropuerto Leonardo da Vinci-Fiumicino", zona: "Europe/Rome" },
  AMS: { ciudad: "Ámsterdam", nombre: "Aeropuerto de Ámsterdam-Schiphol", zona: "Europe/Amsterdam" },
  LHR: { ciudad: "Londres", nombre: "Aeropuerto de Londres-Heathrow", zona: "Europe/London" },
  IST: { ciudad: "Estambul", nombre: "Aeropuerto de Estambul", zona: "Europe/Istanbul" },
};

export const airlines: Record<string, string> = {
  AM: "Aeroméxico", CM: "Copa Airlines", AV: "Avianca", TA: "Avianca", LR: "Avianca", GU: "Avianca", "2K": "Avianca",
  UA: "United Airlines", AA: "American Airlines", DL: "Delta Air Lines", F9: "Frontier Airlines", NK: "Spirit Airlines",
  B6: "JetBlue", WN: "Southwest Airlines", AS: "Alaska Airlines", G4: "Allegiant Air", SY: "Sun Country Airlines",
  Y4: "Volaris", Q6: "Volaris", N3: "Volaris", VB: "Viva Aerobus", "5U": "TAG Airlines", DM: "Arajet",
  IB: "Iberia", UX: "Air Europa", LA: "LATAM Airlines", KL: "KLM", AF: "Air France", BA: "British Airways",
  TK: "Turkish Airlines", AC: "Air Canada", CU: "Cubana de Aviación",
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
