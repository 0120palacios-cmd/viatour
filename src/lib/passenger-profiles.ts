import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { openTravel, sealTravel } from "@/lib/travel-vault";
import { emptyPassenger, validDate, type Passenger } from "@/lib/travel-operations";

// Reusable passenger profiles (docs/sql/passenger_profiles.sql). Private fields are sealed with the passenger
// file key and bound to the profile id, so a sealed value cannot be moved to another profile.
export const passengerDocsBucket = "passenger-docs";
export const passportRetentionDays = 30;

export type ProfilePrivate = { birthDate: string; sex: string; documentNumber: string; phone: string; email: string; emergencyContact: string; assistance: string; notes: string };
export type PassengerProfile = {
  id: string; customerId: string; firstName: string; middleName: string; lastName: string; category: Passenger["category"];
  nationality: string; documentType: Passenger["documentType"]; issuingCountry: string; expiryDate: string; documentLast4: string;
  photoPath: string; passportPath: string; passportDeleteAfter: string; private: ProfilePrivate | null; updatedAt: string;
};
export type ProfileInput = Omit<PassengerProfile, "id" | "customerId" | "documentLast4" | "photoPath" | "passportPath" | "passportDeleteAfter" | "private" | "updatedAt"> & ProfilePrivate;

const emptyPrivate = (): ProfilePrivate => ({ birthDate: "", sex: "", documentNumber: "", phone: "", email: "", emergencyContact: "", assistance: "", notes: "" });
const sealContext = (id: string) => `passenger:${id}`;
export const sealProfile = (value: ProfilePrivate, id: string) => sealTravel(value, sealContext(id));
export function openProfile(value: string | null, id: string): ProfilePrivate | null {
  if (!value) return emptyPrivate();
  try { return { ...emptyPrivate(), ...(openTravel(value, sealContext(id)) as Partial<ProfilePrivate>) }; } catch { return null; }
}

const text = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export function validateProfile(raw: Record<string, unknown>, today = new Date().toISOString().slice(0, 10)): { value: ProfileInput } | { error: string } {
  const value: ProfileInput = {
    firstName: text(raw.firstName, 120), middleName: text(raw.middleName, 120), lastName: text(raw.lastName, 120),
    category: (["adulto", "nino", "infante"].includes(String(raw.category)) ? raw.category : "adulto") as Passenger["category"],
    nationality: text(raw.nationality, 60), documentType: (["ninguno", "pasaporte", "identidad", "otro"].includes(String(raw.documentType)) ? raw.documentType : "pasaporte") as Passenger["documentType"],
    issuingCountry: text(raw.issuingCountry, 60), expiryDate: text(raw.expiryDate, 10),
    birthDate: text(raw.birthDate, 10), sex: text(raw.sex, 20), documentNumber: text(raw.documentNumber, 30).toUpperCase().replace(/[^A-Z0-9]/g, ""),
    phone: text(raw.phone, 40), email: text(raw.email, 254).toLowerCase(), emergencyContact: text(raw.emergencyContact, 250), assistance: text(raw.assistance, 250), notes: String(raw.notes ?? "").trim().slice(0, 1000),
  };
  if (!value.firstName || !value.lastName) return { error: "Escriba el primer nombre y los apellidos como figuran en el documento." };
  if (value.birthDate && (!validDate(value.birthDate) || value.birthDate > today)) return { error: "Revise la fecha de nacimiento." };
  if (value.expiryDate && !validDate(value.expiryDate)) return { error: "Revise la fecha de vencimiento del documento." };
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { error: "Revise el correo del pasajero." };
  if (value.documentType !== "ninguno" && value.documentNumber && value.documentNumber.length < 5) return { error: "Revise el número del documento." };
  return { value };
}

type Row = { id: string; customer_id: string; nombre: string; otros_nombres: string; apellidos: string; categoria: Passenger["category"]; nacionalidad: string; tipo_documento: Passenger["documentType"]; pais_emision: string; vence_documento: string | null; documento_final: string; privado: string | null; foto_path: string | null; pasaporte_path: string | null; pasaporte_borrar_despues: string | null; updated_at: string };
const fields = "id,customer_id,nombre,otros_nombres,apellidos,categoria,nacionalidad,tipo_documento,pais_emision,vence_documento,documento_final,privado,foto_path,pasaporte_path,pasaporte_borrar_despues,updated_at";

export function toRow(id: string, customerId: string, input: ProfileInput) {
  const { birthDate, sex, documentNumber, phone, email, emergencyContact, assistance, notes } = input;
  return { id, customer_id: customerId, nombre: input.firstName, otros_nombres: input.middleName, apellidos: input.lastName, categoria: input.category, nacionalidad: input.nationality,
    tipo_documento: input.documentType, pais_emision: input.issuingCountry, vence_documento: input.expiryDate || null, documento_final: documentNumber.slice(-4),
    privado: sealProfile({ birthDate, sex, documentNumber, phone, email, emergencyContact, assistance, notes }, id) };
}

function fromRow(row: Row, decrypt: boolean): PassengerProfile {
  return { id: row.id, customerId: row.customer_id, firstName: row.nombre, middleName: row.otros_nombres, lastName: row.apellidos, category: row.categoria, nationality: row.nacionalidad,
    documentType: row.tipo_documento, issuingCountry: row.pais_emision, expiryDate: row.vence_documento ?? "", documentLast4: row.documento_final, photoPath: row.foto_path ?? "",
    passportPath: row.pasaporte_path ?? "", passportDeleteAfter: row.pasaporte_borrar_despues ?? "", private: decrypt ? openProfile(row.privado, row.id) : null, updatedAt: row.updated_at };
}

// Profiles of one customer. Without the SQL applied the list is simply empty.
export async function listProfiles(client: SupabaseClient, customerId: string, { decrypt = false } = {}) {
  const result = await client.from("passenger_profiles").select(fields).eq("customer_id", customerId).order("created_at", { ascending: true }).limit(50);
  return { available: !result.error, profiles: ((result.data ?? []) as Row[]).map(row => fromRow(row, decrypt)) };
}

// A profile as a passenger of a reservation file. Its id becomes the passenger id, so saving the reservation can
// extend the passport image's retention to that trip.
export function profileToPassenger(profile: PassengerProfile): Passenger {
  const secret = profile.private ?? emptyPrivate();
  return { ...emptyPassenger(profile.id), firstName: profile.firstName, middleName: profile.middleName, lastName: profile.lastName, category: profile.category, nationality: profile.nationality,
    documentType: profile.documentType, issuingCountry: profile.issuingCountry, expiryDate: profile.expiryDate, birthDate: secret.birthDate, sex: secret.sex, documentNumber: secret.documentNumber,
    phone: secret.phone, email: secret.email, emergencyContact: secret.emergencyContact, assistance: secret.assistance, notes: secret.notes };
}

export const addDays = (isoDate: string, days: number) => { const date = new Date(`${isoDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
