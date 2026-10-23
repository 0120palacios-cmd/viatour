"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { validateCustomerForm } from "@/lib/customer-validation";
import { normalizePhone } from "@/lib/lead-validation";

export type CustomerActionState = { error?: string; success?: string; duplicateId?: string; duplicateName?: string };

export async function saveCustomer(_: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "").trim();
  if (id && !validUuid(id)) return { error: "Registro inválido." };
  const result = validateCustomerForm(form);
  if (result.error) return result;
  const { values } = result;
  // One customer per e-mail, or per phone when there is no e-mail: the quotation editor links customers
  // by these, so a second record would split the customer's history.
  if (values.email) {
    // Case-insensitive exact match: escape LIKE wildcards ("_" is common in addresses).
    let duplicate = client.from("customers").select("id,nombre").ilike("email", values.email.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (id) duplicate = duplicate.neq("id", id);
    const existing = await duplicate.maybeSingle();
    if (existing.data) return { error: `Ya existe un cliente con el correo ${values.email}.`, duplicateId: String(existing.data.id), duplicateName: String(existing.data.nombre) };
  } else if (values.telefono) {
    const local = values.telefono.slice(-8);
    let candidates = client.from("customers").select("id,nombre,telefono").ilike("telefono", `%${local.slice(0, 4)}%${local.slice(4)}%`).limit(10);
    if (id) candidates = candidates.neq("id", id);
    const existing = (await candidates).data?.find(row => normalizePhone(String(row.telefono ?? "")) === values.telefono);
    if (existing) return { error: `Ya existe un cliente con el teléfono ${values.telefono}.`, duplicateId: String(existing.id), duplicateName: String(existing.nombre) };
  }
  const query = id ? client.from("customers").update(values).eq("id", id) : client.from("customers").insert(values);
  const saved = await query.select("id").single();
  if (saved.error || !saved.data) return { error: "No se pudo guardar el cliente. Revise los datos e intente nuevamente." };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/cotizaciones");
  revalidatePath(`/admin/clientes/${saved.data.id}`);
  if (!id) redirect(`/admin/clientes/${saved.data.id}?creado=1`);
  return { success: "Cliente guardado." };
}
