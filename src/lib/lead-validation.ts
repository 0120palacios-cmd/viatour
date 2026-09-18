import { validateContact } from "./contact-validation";
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export function validateLead(input: unknown) {
  if (!object(input) || typeof input.servicio !== "string" || !["Vuelos", "Hoteles", "Paquetes", "Viaje a medida", "paquetes", "destino", "contacto"].includes(String(input.servicio))) throw Error("Service");
  const servicio = String(input.servicio), currency = input.currency ?? "USD";
  if ((typeof currency !== "string" || !["USD", "HNL"].includes(currency))) throw Error("Currency");
  for (const key of ["fields", "formData"]) if (input[key] !== undefined && !object(input[key])) throw Error("Object");
  const raw = object(input.formData) ? input.formData : {}, labels = object(input.fields) ? input.fields : {};
  if (Object.keys(raw).length > 40 || Object.keys(labels).length > 24 || input.website || raw.website) throw Error("Collection");
  const fields: Record<string, string> = {}, formData: Record<string, string> = {};
  const str = (value: unknown, max: number, required = false) => {
    if (value === undefined || value === null) { if (required) throw Error("Required"); return ""; }
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw Error("String");
    return value.trim();
  };
  const get = (key: string, max: number, required = false) => formData[key] = str(raw[key], max, required);
  const count = (key: string, min: number, max: number) => { const v = get(key, 12, true); if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) < min || Number(v) > max) throw Error("Count"); return formData[key] = String(Number(v)); };
  const date = (key: string) => { const v = get(key, 10, true); if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) throw Error("Date"); return v; };
  if (servicio === "contacto") {
    const result = validateContact(raw); if (Object.keys(result.errors).length) throw Error("Contact");
    Object.assign(formData, result.values); Object.assign(fields, { Nombre: formData.nombre, Email: formData.email, Teléfono: formData.telefono, Notas: formData.mensaje });
  } else if (["paquetes", "destino"].includes(servicio) || (servicio === "Viaje a medida" && !Object.keys(raw).length && !Object.keys(labels).length)) {
    for (const key of ["slug", "nombre", "destino", "destination_id"]) get(key, key === "destination_id" ? 36 : 200, key === "slug" && servicio !== "Viaje a medida");
    if (formData.destination_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formData.destination_id)) throw Error("UUID");
    for (const key of ["Destino", "Paquete", "Notas"]) fields[key] = str(labels[key], key === "Notas" ? 3000 : 200, key === "Destino" && servicio !== "Viaje a medida");
  } else {
    fields.Nombre = get("name", 120); fields.Notas = get("notes", 3000);
    const adults = count("adults", 1, 20), children = count("children", 0, 20);
    if (Number(adults) + Number(children) > 20) throw Error("Passengers");
    fields[servicio === "Hoteles" ? "Huéspedes" : "Pasajeros"] = `Adultos: ${adults}; niños: ${children}`;
    if (servicio === "Vuelos") {
      fields.Tipo = str(labels.Tipo, 20, true); fields.Clase = get("class", 20, true);
      if (!["Ida y vuelta", "Solo ida", "Multidestino"].includes(fields.Tipo) || !["Económica", "Premium", "Ejecutiva", "Primera"].includes(fields.Clase)) throw Error("Enum");
    }
    if (fields.Tipo === "Multidestino") {
      const ids = Object.keys(raw).filter(k => /^origin-\d+$/.test(k)).map(k => k.slice(7));
      if (ids.length < 2 || ids.length > 6 || Object.keys(raw).filter(k => /^(origin|destination|date)-/.test(k)).length !== ids.length * 3) throw Error("Segments");
      let previous = "";
      ids.forEach((id, i) => { const origin = get(`origin-${id}`, 200, true), destination = get(`destination-${id}`, 200, true), when = date(`date-${id}`); if (when < previous) throw Error("Order"); previous = when; fields[`Tramo ${i + 1}`] = `Origen: ${origin}; Destino: ${destination}; Fecha: ${when}`; });
      fields.Fechas = ids.map(id => formData[`date-${id}`]).join(" / ");
    } else {
      fields.Destino = get("destination", 200, true);
      if (servicio === "Vuelos") fields.Origen = get("origin", 200, true);
      if (["Vuelos", "Hoteles"].includes(servicio)) { const start = date("start"), end = fields.Tipo === "Solo ida" ? "" : date("end"); if (end && end < start) throw Error("Order"); fields.Fechas = [start, end].filter(Boolean).join(" / "); }
      else fields.Fechas = get("approximate", 200, true);
    }
    if (servicio === "Hoteles") fields.Habitaciones = count("rooms", 1, 20);
    if (servicio === "Viaje a medida") { const budget = get("budget", 16); if (budget && (!/^\d+(\.\d{1,2})?$/.test(budget) || Number(budget) > 10000000)) throw Error("Budget"); fields["Presupuesto aproximado"] = budget ? `${budget} ${currency}` : ""; }
  }
  return { servicio, currency: currency as "USD" | "HNL", fields, formData };
}
