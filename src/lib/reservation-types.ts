import type { Currency } from "@/lib/quotation-types";

export const reservationStatuses = ["pendiente", "confirmada", "en_curso", "completada", "cancelada"] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];

export const paymentMethods = ["tarjeta", "transferencia", "efectivo", "otro"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const invoiceStatuses = ["borrador", "emitida", "pagada", "anulada"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type Reservation = {
  id: string;
  codigo: string;
  quotation_id: string | null;
  customer_id: string | null;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  destino: string;
  moneda: Currency;
  total: number;
  estado: ReservationStatus;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string | null;
  agente_id: string;
  created_at: string;
  updated_at?: string;
};

export type ReservationItem = {
  id?: string;
  reservation_id?: string;
  descripcion: string;
  tipo: string;
  cantidad: number;
  precio_unitario: number;
  orden: number;
};

export type Payment = {
  id: string;
  reservation_id: string;
  monto: number;
  moneda: Currency;
  metodo: PaymentMethod;
  referencia: string | null;
  fecha_pago: string;
  notas: string | null;
  created_at?: string;
};

export type InvoiceItem = ReservationItem;

export type Invoice = {
  id: string;
  reservation_id: string;
  numero: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string | null;
  items: InvoiceItem[];
  total: number;
  moneda: Currency;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: InvoiceStatus;
  notas: string | null;
  created_at: string;
  updated_at?: string;
};

export function reservationStatusLabel(status: ReservationStatus) {
  return ({ pendiente: "Pendiente", confirmada: "Confirmada", en_curso: "En curso", completada: "Completada", cancelada: "Cancelada" } as Record<ReservationStatus, string>)[status];
}

export function paymentMethodLabel(method: PaymentMethod) {
  return ({ tarjeta: "Tarjeta", transferencia: "Transferencia", efectivo: "Efectivo", otro: "Otro" } as Record<PaymentMethod, string>)[method];
}

export function invoiceStatusLabel(status: InvoiceStatus) {
  return ({ borrador: "Borrador", emitida: "Emitida", pagada: "Pagada", anulada: "Anulada" } as Record<InvoiceStatus, string>)[status];
}

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${currency}`;
}
