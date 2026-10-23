// Where a traveller can see their booking on the airline's own website, for the Mi viaje confirmation
// card and the itinerary PDF. Pure, so it can be tested without a network.
//
// Every URL below was taken from the airline's own website on 2026-10-22: a "manage" URL is the
// reservation lookup page linked from that airline's home page (loaded in a browser and checked to ask for
// the booking code and surname, or titled as the trip lookup); a "site" URL is the airline's official home
// page, used when no lookup page could be verified (the site blocks automated checks or the lookup lives
// behind a script). Nothing here is built from a reservation: no booking code or surname is ever put in a
// URL, so the traveller types them on the airline's page.
//
// Review this list when an airline changes its website; an airline that is missing simply gets the neutral
// wording ("con este código y su apellido en el sitio de la aerolínea") and no button.

export type AirlineLink = { name: string; iata: string; aliases: string[]; manage: string | null; site: string };

export const airlineLinksVerifiedOn = "2026-10-22";

export const airlineLinks: AirlineLink[] = [
  { name: "Avianca", iata: "AV", aliases: ["avianca", "taca", "avianca el salvador", "avianca costa rica"], manage: "https://www.avianca.com/es/mi-reserva/servicios/gestiona-tu-reserva", site: "https://www.avianca.com/" },
  // Copa: "My Trips" in copaair.com's own navigation; verified in a visible browser on 2026-10-23 (title "Mis Viajes", asks for booking code and surname).
  { name: "Copa Airlines", iata: "CM", aliases: ["copa", "copa airlines"], manage: "https://mytrips.copaair.com/", site: "https://www.copaair.com/" },
  { name: "American Airlines", iata: "AA", aliases: ["american", "american airlines"], manage: "https://www.aa.com/reservation/view/find-your-trip", site: "https://www.aa.com/" },
  { name: "United Airlines", iata: "UA", aliases: ["united", "united airlines"], manage: null, site: "https://www.united.com/" },
  { name: "Delta Air Lines", iata: "DL", aliases: ["delta", "delta air lines", "delta airlines"], manage: null, site: "https://www.delta.com/" },
  { name: "JetBlue", iata: "B6", aliases: ["jetblue", "jet blue", "jetblue airways"], manage: "https://www.jetblue.com/manage-trips", site: "https://www.jetblue.com/" },
  { name: "Southwest Airlines", iata: "WN", aliases: ["southwest", "southwest airlines"], manage: "https://www.southwest.com/air/manage-reservation/", site: "https://www.southwest.com/" },
  { name: "Frontier Airlines", iata: "F9", aliases: ["frontier", "frontier airlines"], manage: "https://www.flyfrontier.com/travel/my-trips/manage-trip/", site: "https://www.flyfrontier.com/" },
  { name: "Aeroméxico", iata: "AM", aliases: ["aeromexico", "aeromexico connect", "aerovias de mexico"], manage: null, site: "https://www.aeromexico.com/" },
  { name: "Volaris", iata: "Y4", aliases: ["volaris"], manage: "https://www.volaris.com/mytrips", site: "https://www.volaris.com/" },
  { name: "Viva Aerobus", iata: "VB", aliases: ["viva aerobus", "vivaaerobus", "viva"], manage: "https://www.vivaaerobus.com/es-mx/manage/find-booking", site: "https://www.vivaaerobus.com/" },
  { name: "Iberia", iata: "IB", aliases: ["iberia"], manage: null, site: "https://www.iberia.com/" },
  { name: "Air Europa", iata: "UX", aliases: ["air europa"], manage: "https://www.aireuropa.com/es/es/mytrips", site: "https://www.aireuropa.com/" },
  { name: "Air Canada", iata: "AC", aliases: ["air canada", "air canada rouge", "air canada express"], manage: null, site: "https://www.aircanada.com/" },
  { name: "KLM", iata: "KL", aliases: ["klm", "klm royal dutch airlines"], manage: "https://www.klm.com/trip", site: "https://www.klm.com/" },
  { name: "Air France", iata: "AF", aliases: ["air france"], manage: "https://wwws.airfrance.us/trip", site: "https://wwws.airfrance.us/" },
  { name: "British Airways", iata: "BA", aliases: ["british airways", "british"], manage: "https://www.britishairways.com/travel/managebooking/public/es_pr", site: "https://www.britishairways.com/" },
  { name: "Lufthansa", iata: "LH", aliases: ["lufthansa"], manage: null, site: "https://www.lufthansa.com/" },
  { name: "Turkish Airlines", iata: "TK", aliases: ["turkish", "turkish airlines"], manage: null, site: "https://www.turkishairlines.com/" },
];

const normalized = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// "Avianca", "AVIANCA EL SALVADOR", "AV" or a flight number like "AV 621" all find Avianca. An unknown or
// empty name finds nothing; a partial word never matches ("Air" alone is not Air Canada).
export function airlineFor(name: string | null | undefined): AirlineLink | null {
  const value = normalized(name ?? "");
  if (!value) return null;
  const code = /^([a-z0-9]{2})(?: ?\d{1,4}[a-z]?)?$/.exec(value)?.[1];
  return airlineLinks.find(airline => airline.aliases.includes(value) || normalized(airline.name) === value || (code !== undefined && airline.iata.toLowerCase() === code)) ?? null;
}

// The button a traveller sees: a verified lookup page ("Ver reserva en Avianca"), else the airline's home
// page ("Ir al sitio de Copa Airlines"), else nothing.
export type AirlineAction = { kind: "manage" | "site"; url: string; airline: string };
export function airlineAction(name: string | null | undefined): AirlineAction | null {
  const airline = airlineFor(name);
  if (!airline) return null;
  return airline.manage ? { kind: "manage", url: airline.manage, airline: airline.name } : { kind: "site", url: airline.site, airline: airline.name };
}
