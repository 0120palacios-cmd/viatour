import type { BaggagePiece, QuotationDetails } from "@/lib/quotation-details";

// Customer-facing wording shared by the PDF and the editor (which shows how each choice will read).
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function passengerSummary(details: QuotationDetails) {
  const { adultos, ninos, infantes, edadesNinos } = details.pasajeros;
  return [adultos ? plural(adultos, "adulto", "adultos") : "", ninos ? `${plural(ninos, "niño", "niños")}${edadesNinos ? ` (${edadesNinos})` : ""}` : "", infantes ? plural(infantes, "infante", "infantes") : ""].filter(Boolean).join(", ");
}

export function baggageLine(kind: "personal" | "mano" | "documentado", piece: BaggagePiece) {
  const count = piece.piezas ?? 1;
  const extras = [piece.peso, piece.medidas].filter(Boolean).join(", ");
  const suffix = extras ? ` (${extras})` : "";
  const names = { personal: ["artículo personal", "artículos personales"], mano: ["equipaje de mano en cabina", "piezas de equipaje de mano en cabina"], documentado: ["maleta documentada", "maletas documentadas"] }[kind];
  const generic = { personal: "Artículo personal", mano: "Equipaje de mano en cabina", documentado: "Equipaje documentado" }[kind];
  if (piece.estado === "incluido") return `${count} ${count === 1 ? names[0] : names[1]} por pasajero${suffix}`;
  if (piece.estado === "con_cargo") return `${generic} disponible con cargo adicional${suffix}`;
  if (piece.estado === "no_incluido") return `${generic} no incluido`;
  return "";
}
