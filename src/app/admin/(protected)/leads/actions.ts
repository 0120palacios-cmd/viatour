"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { leadStates, lossReasons, type LeadState } from "@/lib/lead-admin";

export type LeadActionState = { error?: string; success?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateLeadStatus(_: LeadActionState, form: FormData): Promise<LeadActionState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const estado = String(form.get("estado") ?? "") as LeadState;
  const motivo = String(form.get("motivo_perdida") ?? "").trim();
  if (!uuid.test(id) || !leadStates.includes(estado)) return { error: "Seleccione un estado válido." };
  if (estado === "perdido" && !lossReasons.includes(motivo as never)) return { error: "Indique el motivo por el que se perdió el lead." };
  const values: Record<string, unknown> = { estado };
  if (estado === "perdido") values.motivo_perdida = motivo;
  let { error } = await client.from("leads").update(values).eq("id", id).select("id").single();
  // Before docs/sql/leads_contact.sql runs there is no motivo_perdida column and the old estado check applies.
  if (error && (error.code === "PGRST204" || error.code === "42703")) ({ error } = await client.from("leads").update({ estado }).eq("id", id).select("id").single());
  if (error) return { error: error.code === "23514" ? "Este estado requiere ejecutar docs/sql/leads_contact.sql en Supabase." : "No se pudo actualizar el lead." };
  revalidatePath("/admin/leads");
  revalidatePath("/admin", "layout");
  return { success: "Estado actualizado." };
}
