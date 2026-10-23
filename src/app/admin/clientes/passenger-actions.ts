"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { addDays, passengerDocsBucket, passportRetentionDays, toRow, validateProfile } from "@/lib/passenger-profiles";

export type ProfileState = { error?: string; success?: string; profileId?: string };
type ImageKind = "foto" | "pasaporte";
const profilesMissing = "Falta la actualización de la base de datos para pasajeros (docs/sql/passenger_profiles.sql).";
const tableMissing = (error: { code?: string } | null) => ["42P01", "PGRST205", "PGRST204", "42703"].includes(error?.code ?? "");
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" }).format(new Date());
const pathFor = (profileId: string, kind: ImageKind) => new RegExp(`^${profileId}/${kind}-[0-9a-f]{32}\\.jpg$`);

// Creates or updates a profile. Private fields are sealed with the passenger-file key; without it nothing is saved.
export async function savePassengerProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const { client } = await requireAdmin();
  const customerId = String(form.get("customer_id") ?? ""), existing = String(form.get("id") ?? "");
  if (!validUuid(customerId) || (existing && !validUuid(existing))) return { error: "Recargue la página e intente nuevamente." };
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(String(form.get("payload") ?? "{}")); } catch { return { error: "Revise los datos del pasajero." }; }
  const checked = validateProfile(raw);
  if ("error" in checked) return { error: checked.error };
  const id = existing || randomUUID();
  let row;
  try { row = toRow(id, customerId, checked.value); } catch (error) { return { error: error instanceof Error ? error.message : "No se pudo proteger el documento." }; }
  const result = existing
    ? await client.from("passenger_profiles").update(row).eq("id", id).eq("customer_id", customerId).select("id").maybeSingle()
    : await client.from("passenger_profiles").insert(row).select("id").single();
  if (result.error || !result.data) return { error: tableMissing(result.error) ? profilesMissing : "No se pudo guardar el pasajero. Intente nuevamente." };
  revalidatePath(`/admin/clientes/${customerId}`);
  return { success: existing ? "Pasajero actualizado." : "Pasajero guardado. Ya puede agregar su foto y la imagen del pasaporte.", profileId: id };
}

// Called after the browser uploaded the image straight to the private bucket. Replaces the previous image of the
// same kind; a passport image gets its deletion date (30 days after the last linked trip, or 30 days from today).
export async function attachPassengerImage(profileId: string, kind: ImageKind, path: string): Promise<ProfileState> {
  const { client } = await requireAdmin();
  if (!validUuid(profileId) || !["foto", "pasaporte"].includes(kind) || !pathFor(profileId, kind).test(path)) return { error: "Imagen inválida." };
  const current = await client.from("passenger_profiles").select("customer_id,foto_path,pasaporte_path,pasaporte_borrar_despues").eq("id", profileId).maybeSingle();
  if (current.error || !current.data) return { error: "No se encontró el pasajero." };
  const previous = kind === "foto" ? current.data.foto_path : current.data.pasaporte_path;
  const minimum = addDays(today(), passportRetentionDays);
  const changes = kind === "foto" ? { foto_path: path } : { pasaporte_path: path, pasaporte_borrar_despues: current.data.pasaporte_borrar_despues && current.data.pasaporte_borrar_despues > minimum ? current.data.pasaporte_borrar_despues : minimum };
  const saved = await client.from("passenger_profiles").update(changes).eq("id", profileId).select("id").maybeSingle();
  if (saved.error || !saved.data) {
    await client.storage.from(passengerDocsBucket).remove([path]);
    return { error: "No se pudo guardar la imagen. Intente nuevamente." };
  }
  if (previous && previous !== path) await client.storage.from(passengerDocsBucket).remove([previous]);
  revalidatePath(`/admin/clientes/${current.data.customer_id}`);
  return { success: kind === "foto" ? "Foto guardada." : `Imagen del pasaporte guardada. Se eliminará automáticamente ${passportRetentionDays} días después del último viaje registrado.` };
}

export async function removePassengerImage(profileId: string, kind: ImageKind): Promise<ProfileState> {
  const { client } = await requireAdmin();
  if (!validUuid(profileId) || !["foto", "pasaporte"].includes(kind)) return { error: "Imagen inválida." };
  const current = await client.from("passenger_profiles").select("customer_id,foto_path,pasaporte_path").eq("id", profileId).maybeSingle();
  if (current.error || !current.data) return { error: "No se encontró el pasajero." };
  const path = kind === "foto" ? current.data.foto_path : current.data.pasaporte_path;
  if (path) {
    const removed = await client.storage.from(passengerDocsBucket).remove([path]);
    if (removed.error) return { error: "No se pudo eliminar la imagen. Intente nuevamente." };
  }
  await client.from("passenger_profiles").update(kind === "foto" ? { foto_path: null } : { pasaporte_path: null, pasaporte_borrar_despues: null }).eq("id", profileId);
  revalidatePath(`/admin/clientes/${current.data.customer_id}`);
  return { success: "Imagen eliminada." };
}

// Deletes the profile and its images. Reservation files keep their own copy of the passenger.
export async function deletePassengerProfile(profileId: string): Promise<ProfileState> {
  const { client } = await requireAdmin();
  if (!validUuid(profileId)) return { error: "Pasajero inválido." };
  const current = await client.from("passenger_profiles").select("customer_id,foto_path,pasaporte_path").eq("id", profileId).maybeSingle();
  if (current.error || !current.data) return { error: "No se encontró el pasajero." };
  const paths = [current.data.foto_path, current.data.pasaporte_path].filter(Boolean) as string[];
  if (paths.length) {
    const removed = await client.storage.from(passengerDocsBucket).remove(paths);
    if (removed.error) return { error: "No se pudieron eliminar sus imágenes; el pasajero no se borró." };
  }
  const deleted = await client.from("passenger_profiles").delete().eq("id", profileId).select("id").maybeSingle();
  if (deleted.error || !deleted.data) return { error: "No se pudo borrar el pasajero." };
  revalidatePath(`/admin/clientes/${current.data.customer_id}`);
  return { success: "Pasajero borrado, con sus imágenes." };
}
