// Shared lead helpers for the admin inbox, quotation prefill and the daily digest.
export const leadStates = ["nuevo", "contactado", "ganado", "perdido", "cerrado"] as const;
export type LeadState = (typeof leadStates)[number];
export const leadStateLabels: Record<LeadState, string> = { nuevo: "Nuevo", contactado: "Contactado", ganado: "Ganado", perdido: "Perdido", cerrado: "Cerrado (anterior)" };
export const lossReasons = ["Precio", "Fechas o disponibilidad", "Sin respuesta del cliente", "Compró en otro lugar", "Solo estaba explorando", "Otro"] as const;
export const leadServices = ["Vuelos", "Hoteles", "Paquetes", "Paquete", "Viaje a medida", "destino", "descubrimiento", "contacto"] as const;

type Row = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const payloadOf = (row: Row) => (typeof row.payload === "object" && row.payload !== null ? row.payload : {}) as Row;

// Columns exist after docs/sql/leads_contact.sql; older rows and pre-SQL rows keep the data in payload.
export function leadContact(row: Row) {
  const payload = payloadOf(row);
  const contacto = (typeof payload.contacto === "object" && payload.contacto !== null ? payload.contacto : {}) as Row;
  const formData = (typeof payload.formData === "object" && payload.formData !== null ? payload.formData : {}) as Row;
  return {
    telefono: text(row.telefono) || text(contacto.telefono) || text(formData.telefono),
    email: text(row.email) || text(contacto.email) || text(formData.email),
    referencia: text(row.referencia) || text(payload.referencia),
    origen: ((typeof row.origen_web === "object" && row.origen_web) || (typeof payload.origen === "object" && payload.origen) || {}) as Record<string, string>,
  };
}

// wa.me needs digits only; returns "" when the number is unusable so callers can hide the action.
export function customerWhatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// Borrador pendiente de aprobación: saludo del asesor al cliente.
export function leadGreeting(name: string, reference: string) {
  return `Hola${name ? ` ${name}` : ""}, le saluda su asesor de viatour. Recibimos su solicitud${reference ? ` ${reference}` : ""} y con gusto le ayudamos a planificar su viaje.`;
}

export function leadAge(createdAt: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60000));
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

export function leadQuotationPrefill(row: Row) {
  const contact = leadContact(row);
  const notes = [text(row.servicio) && `Servicio: ${text(row.servicio)}`, text(row.fechas) && `Fechas: ${text(row.fechas)}`, text(row.pasajeros) && `Pasajeros: ${text(row.pasajeros)}`, text(row.origen) && `Origen: ${text(row.origen)}`, text(row.notas) && `Notas del cliente: ${text(row.notas)}`, contact.referencia && `Referencia del lead: ${contact.referencia}`].filter(Boolean).join("\n");
  return { leadId: String(row.id), nombre: text(row.nombre), email: contact.email, telefono: contact.telefono, destino: text(row.destino).slice(0, 200), notas: notes.slice(0, 5000) };
}
export type LeadPrefill = ReturnType<typeof leadQuotationPrefill>;
