import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Font } from "@react-pdf/renderer";

// Shared plumbing for the customer documents (itinerary, reservation confirmation, receipt): the brand
// font, the palette from globals.css and the logos. Each document keeps its own layout and identity.
export const pdfColors = { ink: "#12161C", inkSoft: "#5A6672", canvas: "#FFFFFF", surface: "#F5F7F8", line: "#E4E8EB", brand: "#1656D6", brandDeep: "#103FAE", brandTint: "#E9F0FE", success: "#16A34A", successTint: "#E8F6EE", error: "#DC2626" } as const;
export const pdfFont = "ViatourManrope";

let registered = false;
export function registerPdfFont() {
  if (registered) return;
  Font.register({ family: pdfFont, fonts: [400, 500, 600, 700, 800].map(weight => ({ src: join(process.cwd(), "src/assets/fonts", `manrope-${weight}.woff`), fontWeight: weight })) });
  // Names, airports and references are never hyphenated.
  Font.registerHyphenationCallback(word => [word]);
  registered = true;
}

const logos = new Map<string, Buffer>();
export function pdfLogo(variant: "black" | "white") {
  if (!logos.has(variant)) logos.set(variant, readFileSync(join(process.cwd(), "public", `logo-${variant}.png`)));
  return logos.get(variant)!;
}

export const agencyContact = { whatsapp: "+504 8866-8704", email: "soporte@miviatour.com", web: "www.miviatour.com", portal: "https://www.miviatour.com/mi-reserva" } as const;
