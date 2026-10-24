// Reads the machine-readable zone (MRZ) of a passport (TD3: 2 lines of 44) or an ID card (TD1: 3 lines of 30),
// entirely in the browser: the text is pasted or read from the photo on the device and never sent anywhere.
// Every field with a check digit is verified (ICAO 9303); a failed check is reported, never guessed.

export type MrzResult = {
  format: "TD3" | "TD1";
  documentType: "pasaporte" | "identidad";
  issuingCountry: string;
  lastName: string;
  firstName: string;
  middleName: string;
  documentNumber: string;
  nationality: string;
  birthDate: string;
  sex: "M" | "F" | "";
  expiryDate: string;
  checks: { documentNumber: boolean; birthDate: boolean; expiryDate: boolean; composite: boolean };
  valid: boolean;
};

const weights = [7, 3, 1];
const charValue = (char: string) => char === "<" ? 0 : /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 55;
export function checkDigit(value: string) {
  return String([...value].reduce((sum, char, index) => sum + charValue(char) * weights[index % 3], 0) % 10);
}

// OCR confusions are only undone where the field can only hold digits.
const digitsOnly = (value: string) => value.replace(/[OQD]/g, "0").replace(/[IL]/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/B/g, "8").replace(/G/g, "6");

function date(yymmdd: string, kind: "birth" | "expiry", today = new Date()) {
  if (!/^\d{6}$/.test(yymmdd)) return "";
  const yy = Number(yymmdd.slice(0, 2)), mm = yymmdd.slice(2, 4), dd = yymmdd.slice(4, 6);
  const current = today.getUTCFullYear() % 100;
  // Births are never in the future; documents expire within the next decades.
  const century = kind === "birth" ? (yy > current ? 1900 : 2000) : (yy < current - 50 ? 2100 : 2000);
  const iso = `${century + yy}-${mm}-${dd}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : "";
}

// OCR often reads the filler "<" of the name line as K, L or C. A run of those letters after a "<" that reaches the
// end of the line cannot be part of a name (it has no vowel), so it is filler again. Names have no check digit:
// the advisor always reviews them.
// The same goes for a single K, L or C between two fillers, and for a long run of them at the end with no "<".
export const nameFillers = (line: string) => line
  .replace(/<[KLC](?=<)/g, "<<")
  .replace(/<[<KLC]{2,}$/, match => "<".repeat(match.length))
  .replace(/[KLC]{6,}$/, match => "<".repeat(match.length));

function names(field: string) {
  const [surname = "", given = ""] = field.replace(/<+$/, "").split("<<");
  const clean = (value: string) => value.split("<").filter(Boolean).join(" ");
  const givenNames = clean(given).split(" ").filter(Boolean);
  return { lastName: clean(surname), firstName: givenNames[0] ?? "", middleName: givenNames.slice(1).join(" ") };
}

// Accepts the text as pasted or read: any case, spaces, extra lines; keeps the lines that look like MRZ.
export function normalizeMrz(text: string) {
  return text.toUpperCase().replace(/«/g, "<").split(/\r?\n/).map(line => line.replace(/\s+/g, "").replace(/[^A-Z0-9<]/g, "")).filter(line => line.length >= 28);
}

// The passport's two lines: the name line starts with P (OCR may add or drop fillers, so its length is loose; it
// is cut or padded to 44) and the data line follows it with exactly 44 characters: cutting a longer one could make
// its last check digit pass by chance.
function passportLines(lines: string[]) {
  const first = lines.findIndex(line => /^P[A-Z<]/.test(line) && line.length >= 38 && line.length <= 56);
  const second = first < 0 ? undefined : lines.slice(first + 1).find(line => line.length === 44);
  return first < 0 || !second ? null : [nameFillers(lines[first]).padEnd(44, "<").slice(0, 44), second.padEnd(44, "<").slice(0, 44)];
}

export function parseMrz(text: string, today = new Date()): MrzResult | null {
  const lines = normalizeMrz(text);
  const td3 = passportLines(lines);
  if (td3) {
    // Check digits cannot tell some OCR look-alikes apart (L and 1, or K and 0, have the same value in the
    // calculation), so the document number is kept exactly as read and the advisor compares it with the passport.
    const [a, b] = td3;
    const number = b.slice(0, 9), birth = digitsOnly(b.slice(13, 19)), expiry = digitsOnly(b.slice(21, 27));
    const checks = {
      documentNumber: checkDigit(number) === digitsOnly(b[9]),
      birthDate: checkDigit(birth) === digitsOnly(b[19]),
      expiryDate: checkDigit(expiry) === digitsOnly(b[27]),
      composite: checkDigit(b.slice(0, 10) + birth + digitsOnly(b[19]) + expiry + digitsOnly(b[27]) + b.slice(28, 43)) === digitsOnly(b[43]),
    };
    return build("TD3", "pasaporte", a.slice(2, 5), names(a.slice(5)), number, b.slice(10, 13), date(birth, "birth", today), b[20], date(expiry, "expiry", today), checks);
  }
  const td1 = lines.filter(line => line.length >= 29 && line.length <= 31).slice(-3).map(line => line.padEnd(30, "<").slice(0, 30));
  if (td1.length === 3 && /^[ACI]/.test(td1[0])) {
    const [a, b, c] = td1;
    const number = a.slice(5, 14), birth = digitsOnly(b.slice(0, 6)), expiry = digitsOnly(b.slice(8, 14));
    const checks = {
      documentNumber: checkDigit(number) === digitsOnly(a[14]),
      birthDate: checkDigit(birth) === digitsOnly(b[6]),
      expiryDate: checkDigit(expiry) === digitsOnly(b[14]),
      composite: checkDigit(a.slice(5, 30) + birth + digitsOnly(b[6]) + expiry + digitsOnly(b[14]) + b.slice(18, 29)) === digitsOnly(b[29]),
    };
    return build("TD1", "identidad", a.slice(2, 5), names(nameFillers(c)), number, b.slice(15, 18), date(birth, "birth", today), b[7], date(expiry, "expiry", today), checks);
  }
  return null;
}

function build(format: MrzResult["format"], documentType: MrzResult["documentType"], issuer: string, person: ReturnType<typeof names>, number: string, nationality: string, birthDate: string, sex: string, expiryDate: string, checks: MrzResult["checks"]): MrzResult {
  return {
    format, documentType, issuingCountry: issuer.replace(/</g, ""), ...person, documentNumber: number.replace(/</g, ""), nationality: nationality.replace(/</g, ""),
    birthDate, sex: sex === "M" || sex === "F" ? sex : "", expiryDate, checks,
    valid: Object.values(checks).every(Boolean) && Boolean(birthDate && expiryDate && person.lastName),
  };
}

// ICAO codes for the countries this agency's travellers most often hold; others are shown as the code.
const countryNames: Record<string, string> = {
  HND: "Honduras", USA: "Estados Unidos", GTM: "Guatemala", SLV: "El Salvador", NIC: "Nicaragua", CRI: "Costa Rica", PAN: "Panamá", MEX: "México",
  COL: "Colombia", ESP: "España", CAN: "Canadá", DOM: "República Dominicana", CUB: "Cuba", VEN: "Venezuela", PER: "Perú", ARG: "Argentina", CHL: "Chile",
  ECU: "Ecuador", BRA: "Brasil", ITA: "Italia", FRA: "Francia", DEU: "Alemania", GBR: "Reino Unido", D: "Alemania",
};
export const countryName = (code: string) => countryNames[code] ?? code;
