import { quotationKinds, sanitizeDetails, type QuotationDetails, type QuotationKind } from "@/lib/quotation-details";
import { currencies, type Currency, type QuotationItem } from "@/lib/quotation-types";
import { emailPattern, validUuid } from "@/lib/quotation-validation";

// What the quotation editor sends to saveQuotation and to the preview route: one JSON document.
// A draft may be incomplete (no price yet, no e-mail yet); what must be true before the customer
// receives it is checked separately by quotationReadiness() when sending.

export const maxPayloadBytes = 300_000;

export type QuotationPayload = {
  id: string | null;
  expectedUpdatedAt: string | null;
  leadId: string | null;
  customerId: string | null;
  cliente: { nombre: string; email: string; telefono: string | null };
  tipo: QuotationKind;
  destino: string;
  moneda: Currency;
  notas: string | null;
  detalles: QuotationDetails;
  items: QuotationItem[];
};

type Result = { payload: QuotationPayload } | { error: string };
const amount = /^\d{1,9}(\.\d{1,2})?$/;

export function parseQuotationPayload(raw: unknown): Result {
  if (typeof raw !== "string" || !raw || raw.length > maxPayloadBytes) return { error: "La cotización es demasiado grande o está vacía." };
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: "Datos de cotización inválidos." };
    data = parsed as Record<string, unknown>;
  } catch {
    return { error: "Datos de cotización inválidos." };
  }
  const text = (value: unknown, max: number) => String(typeof value === "string" ? value : "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
  const optionalUuid = (value: unknown) => { const result = text(value, 36); return validUuid(result) ? result : null; };
  const id = text(data.id, 36);
  if (id && !validUuid(id)) return { error: "Cotización inválida." };
  const tipo = quotationKinds.includes(data.tipo as QuotationKind) ? data.tipo as QuotationKind : "general";
  const client = (data.cliente && typeof data.cliente === "object" ? data.cliente : {}) as Record<string, unknown>;
  const nombre = text(client.nombre, 200);
  const email = text(client.email, 254).toLowerCase();
  const telefono = text(client.telefono, 60);
  if (!nombre) return { error: "Ingrese el nombre del cliente." };
  if (email && !emailPattern.test(email)) return { error: "Revise el correo electrónico del cliente." };
  const moneda = currencies.includes(data.moneda as Currency) ? data.moneda as Currency : null;
  if (!moneda) return { error: "Seleccione la moneda." };
  const notas = String(typeof data.notas === "string" ? data.notas : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (notas.length > 5000) return { error: "Las observaciones superan 5000 caracteres." };
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length > 50) return { error: "La cotización admite hasta 50 conceptos de precio." };
  const items: QuotationItem[] = [];
  for (const [index, entry] of rawItems.entries()) {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const descripcion = text(item.descripcion, 500);
    const tipoItem = text(item.tipo, 80);
    const cantidad = String(item.cantidad ?? "").trim();
    const precio = String(item.precio_unitario ?? "").trim();
    // quotation_items.cantidad is an integer column in production: a decimal would be rounded by the database.
    if (!/^\d{1,6}$/.test(cantidad) || Number(cantidad) <= 0 || Number(cantidad) > 100000) return { error: `Concepto de precio ${index + 1}: la cantidad debe ser un número entero mayor que cero.` };
    if (!descripcion || !tipoItem || !amount.test(precio) || Number(precio) > 100000000) return { error: `Revise el concepto de precio ${index + 1}: descripción, tipo, cantidad y precio.` };
    items.push({ descripcion, tipo: tipoItem, cantidad: Number(cantidad), precio_unitario: Number(precio), orden: index });
  }
  const expected = text(data.expectedUpdatedAt, 40);
  return {
    payload: {
      id: id || null,
      expectedUpdatedAt: expected && !Number.isNaN(Date.parse(expected)) ? expected : null,
      leadId: optionalUuid(data.leadId),
      customerId: optionalUuid(data.customerId),
      cliente: { nombre, email, telefono: telefono || null },
      tipo,
      destino: text(data.destino, 200),
      moneda,
      notas: notas || null,
      detalles: sanitizeDetails(data.detalles),
      items,
    },
  };
}
