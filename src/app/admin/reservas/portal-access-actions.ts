"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { emailPattern, validUuid } from "@/lib/quotation-validation";

export type AccessSurnameState = { error?: string; success?: string };

// Adds the Mi viaje access e-mail to a reservation converted without one (a WhatsApp-only customer).
// Write-once like the surname: the update only matches an empty e-mail and the database guard
// (docs/sql/conversion_without_email.sql) refuses any later change, so access can never be moved.
export async function setAccessEmail(_: AccessSurnameState, form: FormData): Promise<AccessSurnameState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!validUuid(id) || !emailPattern.test(email) || email.length > 254) return { error: "Escriba un correo válido del cliente." };
  if (form.get("confirmed") !== "si") return { error: "Confirme que el correo pertenece al cliente: no se podrá cambiar después." };
  const result = await client.from("reservations").update({ cliente_email: email }).eq("id", id).or("cliente_email.is.null,cliente_email.eq.").select("id").maybeSingle();
  if (result.error) return { error: /bloqueados/.test(result.error.message) ? "La base de datos todavía bloquea este dato: falta aplicar docs/sql/conversion_without_email.sql." : "No se pudo guardar el correo de acceso." };
  if (!result.data) return { error: "Esta reserva ya tiene un correo de acceso." };
  revalidatePath(`/admin/reservas/${id}`);
  return { success: "Correo de acceso guardado. El cliente ya puede entrar a Mi viaje con su código de reserva, su apellido y el código que recibirá en ese correo." };
}

// Completes the Mi viaje access surname of a reservation that was converted without one. Write-once:
// the update only matches a row whose surname is still empty, and the database guard
// (docs/sql/portal_access_surname.sql) refuses any later change.
export async function setAccessSurname(_: AccessSurnameState, form: FormData): Promise<AccessSurnameState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const surname = String(form.get("apellido") ?? "").replace(/\s+/g, " ").trim();
  if (!validUuid(id) || !surname || surname.length > 120 || /[\u0000-\u001f<>]/.test(surname)) return { error: "Escriba el apellido tal como el cliente lo ingresará (máximo 120 caracteres)." };
  if (form.get("confirmed") !== "si") return { error: "Confirme que el apellido es correcto: no se podrá cambiar después." };
  const result = await client.from("reservations").update({ cliente_apellido: surname }).eq("id", id).or("cliente_apellido.is.null,cliente_apellido.eq.").select("id").maybeSingle();
  if (result.error) return { error: /bloqueados/.test(result.error.message) ? "La base de datos todavía bloquea este dato: falta aplicar docs/sql/portal_access_surname.sql." : "No se pudo guardar el apellido de acceso." };
  if (!result.data) return { error: "Esta reserva ya tiene un apellido de acceso." };
  revalidatePath(`/admin/reservas/${id}`);
  return { success: "Apellido de acceso guardado. El cliente ya puede entrar a Mi viaje con su código de reserva y este apellido." };
}
