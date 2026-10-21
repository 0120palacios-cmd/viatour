// "950.5 USD" -> "Novecientos cincuenta dólares estadounidenses con 50/100": the amount written in words,
// as Honduran payment receipts show it. Pure; up to 999,999,999.99.

const units = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const tens = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const hundreds = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const h = Math.floor(n / 100), rest = n % 100;
  const restWords = rest < 30 ? units[rest] : `${tens[Math.floor(rest / 10)]}${rest % 10 ? ` y ${units[rest % 10]}` : ""}`;
  return [hundreds[h], restWords].filter(Boolean).join(" ");
}

// "uno" becomes "un" before a noun ("un mil" is not used: "mil"; "veintiún millones").
function apocope(words: string) { return words.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un"); }

export function integerInWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "cero";
  if (n > 999_999_999) throw new Error("Monto fuera de rango.");
  const millions = Math.floor(n / 1_000_000), thousands = Math.floor((n % 1_000_000) / 1000), rest = n % 1000;
  const parts = [
    millions ? (millions === 1 ? "un millón" : `${apocope(belowThousand(millions))} millones`) : "",
    thousands ? (thousands === 1 ? "mil" : `${apocope(belowThousand(thousands))} mil`) : "",
    belowThousand(rest),
  ];
  return parts.filter(Boolean).join(" ");
}

export function amountInWords(amount: number, currency: "USD" | "HNL") {
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const words = integerInWords(whole);
  const noun = currency === "USD" ? (whole === 1 ? "dólar estadounidense" : "dólares estadounidenses") : (whole === 1 ? "lempira" : "lempiras");
  const text = `${/(^|\s)(uno|veintiuno)$/.test(words) ? apocope(words) : words}${/(millón|millones)$/.test(words) ? " de" : ""} ${noun} con ${String(cents % 100).padStart(2, "0")}/100`;
  return text[0].toLocaleUpperCase("es") + text.slice(1);
}
