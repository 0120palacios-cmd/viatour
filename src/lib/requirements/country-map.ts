/** Normalized destination names (no accents, lowercase) mapped to ISO-2 codes. */
export const destinationCountryMap: Readonly<Record<string, string>> = {
  "punta cana": "DO", "republica dominicana": "DO",
  cartagena: "CO", colombia: "CO", medellin: "CO", bogota: "CO", "santa marta": "CO", "san andres": "CO",
  dubai: "AE", "abu dhabi": "AE", emiratos: "AE", "emiratos arabes unidos": "AE",
  "rio de janeiro": "BR", brasil: "BR", "foz de iguazu": "BR",
  cancun: "MX", "ciudad de mexico": "MX", mexico: "MX", panama: "PA",
  argentina: "AR", "buenos aires": "AR", bariloche: "AR", peru: "PE", cusco: "PE", "machu picchu": "PE",
  chile: "CL", ecuador: "EC", galapagos: "EC", uruguay: "UY", bolivia: "BO", uyuni: "BO",
  espana: "ES", madrid: "ES", barcelona: "ES", francia: "FR", paris: "FR",
  italia: "IT", roma: "IT", florencia: "IT", venecia: "IT", "reino unido": "GB", londres: "GB", suiza: "CH",
  "paises bajos": "NL", amsterdam: "NL", belgica: "BE", alemania: "DE", grecia: "GR", atenas: "GR", santorini: "GR",
  portugal: "PT", lisboa: "PT", turquia: "TR", estambul: "TR", capadocia: "TR", egipto: "EG", "tierra santa": "IL", israel: "IL", jordania: "JO",
  tailandia: "TH", japon: "JP", china: "CN", india: "IN", singapur: "SG", bali: "ID", indonesia: "ID", maldivas: "MV", vietnam: "VN",
  marruecos: "MA", sudafrica: "ZA", kenia: "KE", tanzania: "TZ", australia: "AU", "nueva zelanda": "NZ",
  miami: "US", orlando: "US", "nueva york": "US", "los angeles": "US", "estados unidos": "US", canada: "CA",
  "costa rica": "CR", guatemala: "GT", belice: "BZ", aruba: "AW", curazao: "CW", bahamas: "BS", jamaica: "JM", cuba: "CU", varadero: "CU",
  salinitas: "SV", "el salvador": "SV",
};

export const regionDestinationKeys = new Set(["europa", "medio oriente", "cruceros", "otro"]);

export function normalizeDestination(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
