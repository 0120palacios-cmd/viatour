import { canonicalItemType, defaultDetails, newId, type QuotationDetails, type QuotationKind } from "@/lib/quotation-details";
import type { Currency } from "@/lib/quotation-types";

// Editor state. Prices stay strings while typing ("12." is a valid intermediate value) and become
// numbers only in the payload, where the server validates them again.
// componente: for a combined package, the service this price line belongs to ("" = the whole package).
export type DraftItem = { key: string; descripcion: string; tipo: string; cantidad: string; precio_unitario: string; componente?: string };

export type EditorDraft = {
  id: string | null;
  updatedAt: string | null;
  leadId: string | null;
  customerId: string;
  cliente: { nombre: string; email: string; telefono: string };
  tipo: QuotationKind;
  destino: string;
  moneda: Currency;
  notas: string;
  detalles: QuotationDetails;
  items: DraftItem[];
};

export function draftItem(descripcion = "", tipo = "", cantidad = "1", precio = "", componente = ""): DraftItem {
  return { key: newId(), descripcion, tipo, cantidad, precio_unitario: precio, componente };
}

// The details as saved: for a combined package, the line links follow the current order of the lines.
export function detailsForSave(draft: EditorDraft) {
  if (draft.tipo !== "combinado") return draft.detalles;
  return { ...draft.detalles, paquete: { ...draft.detalles.paquete, lineas: draft.items.map(item => item.componente ?? "") } };
}

export function toPayload(draft: EditorDraft) {
  return JSON.stringify({
    id: draft.id, expectedUpdatedAt: draft.updatedAt, leadId: draft.leadId, customerId: draft.customerId || null,
    cliente: draft.cliente, tipo: draft.tipo, destino: draft.destino, moneda: draft.moneda, notas: draft.notas, detalles: detailsForSave(draft),
    items: draft.items.map(item => ({ descripcion: item.descripcion, tipo: canonicalItemType(item.tipo) ?? item.tipo, cantidad: item.cantidad.trim(), precio_unitario: item.precio_unitario.trim() || "0" })),
  });
}

// Saved lines back into editor lines, with their package links when the stored links match the lines.
export function draftItemsFrom(items: { id?: string; descripcion: string; tipo: string; cantidad: number; precio_unitario: number }[], lineas: string[] = []): DraftItem[] {
  const linked = lineas.length === items.length;
  return items.map((item, index) => ({ key: item.id ?? newId(), descripcion: item.descripcion, tipo: item.tipo, cantidad: String(item.cantidad), precio_unitario: Number(item.precio_unitario).toFixed(2), componente: linked ? lineas[index] : "" }));
}

export function itemsAsNumbers(items: DraftItem[]) {
  return items.map(item => ({ descripcion: item.descripcion, tipo: item.tipo, cantidad: Number(item.cantidad) || 0, precio_unitario: Number(item.precio_unitario) || 0 }));
}

export function initialDraft(kind: QuotationKind, overrides: Partial<EditorDraft> = {}): EditorDraft {
  const detalles = { ...defaultDetails(kind), refCreacion: `${newId()}${newId()}` };
  return { id: null, updatedAt: null, leadId: null, customerId: "", cliente: { nombre: "", email: "", telefono: "" }, tipo: kind, destino: "", moneda: "USD", notas: "", detalles, items: [], ...overrides };
}
