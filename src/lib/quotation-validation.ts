import { currencies, quotationStatuses, type Currency, type QuotationItem, type QuotationStatus } from "@/lib/quotation-types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function validUuid(value: string) {
  return uuidPattern.test(value);
}

export function validateCustomerValues(form: FormData) {
  const values = { nombre: clean(form.get("nombre")), email: clean(form.get("email")).toLowerCase(), telefono: clean(form.get("telefono")), notas: clean(form.get("notas")) };
  if (!values.nombre || values.nombre.length > 200 || !emailPattern.test(values.email) || values.email.length > 254) return { error: "Ingrese un nombre y un correo electrónico válidos." } as const;
  if (values.telefono.length > 60 || values.notas.length > 5000) return { error: "Revise la longitud del teléfono y las notas." } as const;
  return { values: { ...values, telefono: values.telefono || null, notas: values.notas || null } } as const;
}

export function validateQuotationFields(form: FormData) {
  const customerId = clean(form.get("customer_id"));
  const values = {
    customer_id: customerId || null,
    cliente_nombre: clean(form.get("cliente_nombre")),
    cliente_email: clean(form.get("cliente_email")).toLowerCase(),
    cliente_telefono: clean(form.get("cliente_telefono")),
    destino: clean(form.get("destino")),
    moneda: clean(form.get("moneda")) as Currency,
    validez: clean(form.get("validez")),
    notas: clean(form.get("notas")),
  };
  if (customerId && !validUuid(customerId)) return { error: "Seleccione un cliente válido." } as const;
  if (!values.cliente_nombre || values.cliente_nombre.length > 200 || !emailPattern.test(values.cliente_email) || values.cliente_email.length > 254) return { error: "Ingrese el nombre y correo electrónico del cliente." } as const;
  if (values.cliente_telefono.length > 60 || !values.destino || values.destino.length > 200 || !currencies.includes(values.moneda) || !/^\d{4}-\d{2}-\d{2}$/.test(values.validez) || values.notas.length > 5000) return { error: "Revise los datos generales de la cotización." } as const;
  const descriptions = form.getAll("item_descripcion").map(String);
  const types = form.getAll("item_tipo").map(String);
  const quantities = form.getAll("item_cantidad").map(String);
  const prices = form.getAll("item_precio_unitario").map(String);
  if (!descriptions.length || descriptions.length > 50 || types.length !== descriptions.length || quantities.length !== descriptions.length || prices.length !== descriptions.length) return { error: "Agregue al menos un ítem y revise sus datos." } as const;
  const items: QuotationItem[] = [];
  for (let index = 0; index < descriptions.length; index += 1) {
    const descripcion = descriptions[index].trim();
    const tipo = types[index].trim();
    const cantidad = Number(quantities[index]);
    const precio_unitario = Number(prices[index]);
    if (!descripcion || descripcion.length > 500 || !tipo || tipo.length > 80 || !/^\d+(\.\d{1,2})?$/.test(quantities[index]) || !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 100000 || !/^\d+(\.\d{1,2})?$/.test(prices[index]) || !Number.isFinite(precio_unitario) || precio_unitario < 0 || precio_unitario > 100000000) return { error: "Revise la descripción, tipo, cantidad y precio de cada ítem." } as const;
    items.push({ descripcion, tipo, cantidad, precio_unitario, orden: index });
  }
  return { values: { ...values, cliente_telefono: values.cliente_telefono || null, notas: values.notas || null }, items } as const;
}

export function isQuotationStatus(value: string): value is QuotationStatus {
  return quotationStatuses.includes(value as QuotationStatus);
}
