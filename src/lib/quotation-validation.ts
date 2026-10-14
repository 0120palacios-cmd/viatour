import { quotationStatuses, type QuotationStatus } from "@/lib/quotation-types";

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export function isQuotationStatus(value: string): value is QuotationStatus {
  return quotationStatuses.includes(value as QuotationStatus);
}
