import { clean, emailPattern } from "@/lib/quotation-validation";
import { normalizePhone } from "@/lib/lead-validation";

// Admin customer form. Most customers write by WhatsApp, so the e-mail is optional: a customer needs a
// name and at least one way to reach them. Phones are stored in E.164 so they can be matched later.
export function validateCustomerForm(form: FormData) {
  const nombre = clean(form.get("nombre")), email = clean(form.get("email")).toLowerCase(), rawPhone = clean(form.get("telefono")), notas = clean(form.get("notas"));
  if (!nombre || nombre.length > 200) return { error: "Ingrese el nombre del cliente." } as const;
  if (email && (!emailPattern.test(email) || email.length > 254)) return { error: "Revise el correo electrónico." } as const;
  const telefono = rawPhone ? normalizePhone(rawPhone) : "";
  if (rawPhone && !telefono) return { error: "Revise el teléfono: 8 dígitos para Honduras o el código de país para otros números." } as const;
  if (!email && !telefono) return { error: "Ingrese un teléfono o un correo electrónico." } as const;
  if (notas.length > 5000) return { error: "Las notas son demasiado largas." } as const;
  return { values: { nombre, email: email || null, telefono: telefono || null, notas: notas || null } } as const;
}
