export type Passenger = {
  id: string; firstName: string; middleName: string; lastName: string;
  category: "adulto" | "nino" | "infante"; birthDate: string; nationality: string;
  documentRequired: boolean; sexRequired: boolean; sex: string;
  documentType: "ninguno" | "pasaporte" | "identidad" | "otro";
  documentNumber: string; issuingCountry: string; expiryDate: string;
  phone: string; email: string; emergencyContact: string; assistance: string; notes: string;
};
export type Ticket = { passengerId: string; airline: string; pnr: string; number: string; issueDate: string; segments: string };
export type TravelOperations = {
  passengers: Passenger[]; tickets: Ticket[]; status: "pendiente" | "en_emision" | "emitida";
  confirmedAt: string; estimateApproved: boolean; estimateMinHours?: number; estimateMaxHours?: number; reviewed: boolean;
};
export type PublicTravel = {
  passengers: Pick<Passenger, "id" | "firstName" | "middleName" | "lastName" | "category">[];
  tickets: Ticket[]; status: TravelOperations["status"]; confirmedAt: string; estimateApproved: boolean; estimateMinHours?: number; estimateMaxHours?: number; reviewed: boolean;
};
export const ticketingLabels = { pendiente: "Pendiente de emisión", en_emision: "En proceso de emisión", emitida: "Boletos emitidos" };
export const emptyTravel = (): TravelOperations => ({ passengers: [], tickets: [], status: "pendiente", confirmedAt: "", estimateApproved: false, reviewed: false });
export const emptyPassenger = (id: string): Passenger => ({ id, firstName: "", middleName: "", lastName: "", category: "adulto", birthDate: "", nationality: "", documentRequired: false, sexRequired: false, sex: "", documentType: "ninguno", documentNumber: "", issuingCountry: "", expiryDate: "", phone: "", email: "", emergencyContact: "", assistance: "", notes: "" });
export function legalName(p: Pick<Passenger,"firstName"|"middleName"|"lastName">) { return [p.firstName,p.middleName,p.lastName].filter(Boolean).join(" "); }
export function validDate(value: string) { const date=new Date(`${value}T12:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value; }
export function validateTravel(value: unknown, departure?: string | null): TravelOperations {
  if (!value || typeof value !== "object") throw Error("Revise el expediente de viaje.");
  const v = value as TravelOperations;
  const estimateMinHours=v.estimateMinHours??24,estimateMaxHours=v.estimateMaxHours??48;
  if(!Number.isInteger(estimateMinHours)||!Number.isInteger(estimateMaxHours)||estimateMinHours<1||estimateMaxHours<estimateMinHours||estimateMaxHours>720)throw Error("Revise el plazo estimado: entre 1 y 720 horas, con máximo mayor o igual al mínimo.");
  if (!Array.isArray(v.passengers) || v.passengers.length > 30 || !Array.isArray(v.tickets) || v.tickets.length > 100 || !["pendiente","en_emision","emitida"].includes(v.status)) throw Error("Revise los pasajeros y el estado de emisión.");
  const ids = new Set<string>();
  const today = new Date().toISOString().slice(0,10);
  for (const p of v.passengers) {
    if (!p || typeof p !== "object" || !/^[a-zA-Z0-9-]{1,60}$/.test(p.id) || ids.has(p.id)) throw Error("Identificador de pasajero inválido.");
    ids.add(p.id);
    for (const key of Object.keys(emptyPassenger("")) as (keyof Passenger)[]) {
      if (["documentRequired","sexRequired"].includes(key)) { if (typeof p[key] !== "boolean") throw Error("Revise los requisitos del proveedor."); }
      else if (typeof p[key] !== "string" || String(p[key]).length > (key === "notes" ? 1000 : 250) || /[\u0000-\u001f]/.test(String(p[key]))) throw Error("Revise los campos del pasajero.");
    }
    if (!["adulto","nino","infante"].includes(p.category) || !["ninguno","pasaporte","identidad","otro"].includes(p.documentType)) throw Error("Tipo de pasajero o documento inválido.");
    if (p.birthDate && (!validDate(p.birthDate) || p.birthDate > today)) throw Error("Revise la fecha de nacimiento.");
    if (p.expiryDate && !validDate(p.expiryDate)) throw Error("Revise la fecha de vencimiento.");
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw Error("Revise el correo del pasajero.");
    if (v.reviewed || v.status !== "pendiente") {
      if (!p.firstName.trim() || !p.lastName.trim()) throw Error("Complete los nombres legales de cada pasajero.");
      if (p.sexRequired && !p.sex.trim()) throw Error("Complete el dato requerido por el proveedor.");
      if (p.documentRequired && (p.documentType === "ninguno" || !p.documentNumber.trim() || !p.expiryDate || p.expiryDate < (departure || today) || !p.issuingCountry.trim())) throw Error("Complete el documento requerido y revise su vigencia para el viaje.");
    }
  }
  if (typeof v.reviewed !== "boolean" || typeof v.estimateApproved !== "boolean" || typeof v.confirmedAt !== "string" || (v.confirmedAt && (!validDate(v.confirmedAt) || v.confirmedAt > today))) throw Error("Revise la fecha de confirmación.");
  const numbers = new Set<string>();
  for (const t of v.tickets) {
    if (!t || ["passengerId","airline","pnr","number","issueDate","segments"].some(k => typeof t[k as keyof Ticket] !== "string" || t[k as keyof Ticket].length > 250 || /[\u0000-\u001f]/.test(t[k as keyof Ticket]))) throw Error("Revise la información del boleto.");
    if (!ids.has(t.passengerId) || (t.issueDate && (!validDate(t.issueDate) || t.issueDate > today))) throw Error("Revise el pasajero y fecha del boleto.");
    if (t.number && numbers.has(t.number)) throw Error("El número de boleto está repetido.");
    if (t.number) numbers.add(t.number);
    if (v.status === "emitida" && (!t.number.trim() || !t.pnr.trim() || !t.airline.trim() || !t.issueDate || !t.segments.trim())) throw Error("Registre el boleto, localizador, aerolínea, fecha y tramos respaldados por el proveedor.");
  }
  if (v.status !== "pendiente" && (!v.reviewed || !v.passengers.length)) throw Error("Revise y confirme los pasajeros antes de iniciar la emisión.");
  if (v.status === "emitida" && (!v.confirmedAt || v.passengers.some(p => !v.tickets.some(t => t.passengerId === p.id)))) throw Error("Falta confirmación o evidencia de emisión para algún pasajero.");
  // Project known fields only; do not persist arbitrary client data.
  return { passengers: v.passengers.map(p => Object.fromEntries(Object.keys(emptyPassenger("")).map(k => [k,p[k as keyof Passenger]])) as Passenger), tickets: v.tickets.map(t => ({ passengerId:t.passengerId,airline:t.airline,pnr:t.pnr,number:t.number,issueDate:t.issueDate,segments:t.segments })), status:v.status, confirmedAt:v.confirmedAt, estimateApproved:v.estimateApproved, estimateMinHours,estimateMaxHours,reviewed:v.reviewed };
}
export function publicTravel(v: TravelOperations): PublicTravel {
  return { passengers:v.passengers.map(p => ({id:p.id,firstName:p.firstName,middleName:p.middleName,lastName:p.lastName,category:p.category})), tickets:v.tickets.map(t=>({...t})),status:v.status,confirmedAt:v.confirmedAt,estimateApproved:v.estimateApproved,estimateMinHours:v.estimateMinHours??24,estimateMaxHours:v.estimateMaxHours??48,reviewed:v.reviewed };
}
