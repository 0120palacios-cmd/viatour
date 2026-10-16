"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { validateCustomerValues, validUuid } from "@/lib/quotation-validation";

export type CustomerActionState = { error?: string; success?: string; duplicateId?: string; duplicateName?: string };

export async function saveCustomer(_: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "").trim();
  if (id && !validUuid(id)) return { error: "Registro inválido." };
  const result = validateCustomerValues(form);
  if (result.error) return result;
  // One customer per e-mail: the quotation editor links by e-mail, so a second record with the same
  // address would split the customer's history.
  // Case-insensitive exact match: escape LIKE wildcards ("_" is common in addresses).
  let duplicate = client.from("customers").select("id,nombre").ilike("email", result.values.email.replace(/[\\%_]/g, "\\$&")).limit(1);
  if (id) duplicate = duplicate.neq("id", id);
  const existing = await duplicate.maybeSingle();
  if (existing.data) return { error: `Ya existe un cliente con el correo ${result.values.email}.`, duplicateId: String(existing.data.id), duplicateName: String(existing.data.nombre) };
  const query = id ? client.from("customers").update(result.values).eq("id", id) : client.from("customers").insert(result.values);
  const saved = await query.select("id").single();
  if (saved.error || !saved.data) return { error: "No se pudo guardar el cliente. Revise los datos e intente nuevamente." };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/cotizaciones");
  revalidatePath(`/admin/clientes/${saved.data.id}`);
  if (!id) redirect(`/admin/clientes/${saved.data.id}?creado=1`);
  return { success: "Cliente guardado." };
}
