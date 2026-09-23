export const segments = [
  { id: "accesorio", label_es: "Un accesorio de viaje", label_en: "A travel accessory", weight: 30 },
  { id: "equipaje", label_es: "Equipaje adicional de cortesía", label_en: "Complimentary extra baggage", weight: 25 },
  { id: "traslado", label_es: "Traslado de cortesía (aeropuerto–hotel)", label_en: "Complimentary airport–hotel transfer", weight: 20 },
  { id: "upgrade", label_es: "Upgrade de habitación (según disponibilidad)", label_en: "Room upgrade (subject to availability)", weight: 13 },
  { id: "descuento", label_es: "10% de descuento en su próxima cotización", label_en: "10% off your next quote", weight: 8 },
  { id: "credito", label_es: "$25 de crédito para su viaje", label_en: "$25 travel credit", weight: 4 },
] as const;

export type PromoSegment = (typeof segments)[number];
