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
