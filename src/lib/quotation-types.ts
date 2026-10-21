export const quotationStatuses = ["borrador", "enviada", "aceptada", "rechazada", "expirada"] as const;
export type QuotationStatus = (typeof quotationStatuses)[number];
export const currencies = ["USD", "HNL"] as const;
export type Currency = (typeof currencies)[number];

export type Customer = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  notas: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Quotation = {
  id: string;
  codigo: string;
  customer_id: string | null;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  destino: string;
  moneda: Currency;
  validez: string;
  notas: string | null;
  total: number;
  estado: QuotationStatus;
  agente_id: string;
  created_at: string;
  updated_at?: string;
  // Added by docs/sql/quotations_v5.sql; absent on databases where it has not been applied yet.
  accepted_version_id?: string | null;
  sent_version_id?: string | null;
  version_aceptada?: number | null;
  tipo?: string | null;
  detalles?: unknown;
  vence_en?: string | null;
  version?: number | null;
};

export type QuotationItem = {
  id?: string;
  quotation_id?: string;
  descripcion: string;
  tipo: string;
  cantidad: number;
  precio_unitario: number;
  orden: number;
};

export function formatQuotationAmount(amount: number, currency: Currency) {
  const number = new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${currency === "USD" ? "$" : "L"} ${number} ${currency}`;
}

export function quotationStatusLabel(status: QuotationStatus) {
  return ({ borrador: "Borrador", enviada: "Enviada", aceptada: "Aceptada", rechazada: "Rechazada", expirada: "Expirada" } as Record<QuotationStatus, string>)[status];
}

// "Importante" block on every quotation PDF (approved by the owner on 2026-10-01). It answers the
// concerns of low-rated reviews (destination charges, rate validity, change rules) in the document the
// customer actually receives, and repeats the approved Terms §4 and Cancellation Policy §1 and §3.
export function quotationNotices(validUntil: string) {
  return [
    `Tarifa válida hasta el ${validUntil}, sujeta a disponibilidad. El precio final se confirma con su asesor antes de cualquier pago.`,
    "Impuestos o cargos que se pagan en el destino no están incluidos, salvo que se indique.",
    "Las condiciones de cambio, cancelación y reembolso dependen de cada proveedor; su asesor se las informa antes de que usted pague.",
    "No hay cargo alguno hasta que usted acepta una opción y realiza el pago.",
  ];
}
