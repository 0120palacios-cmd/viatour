"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { validateCustomerValues, validUuid } from "@/lib/quotation-validation";

export type CustomerActionState = { error?: string; success?: string };

export async function saveCustomer(_: CustomerActionState, form: FormData): Promise<CustomerActionState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "").trim();
  if (id && !validUuid(id)) return { error: "Registro inválido." };
  const result = validateCustomerValues(form);
  if (result.error) return result;
  const query = id ? client.from("customers").update(result.values).eq("id", id) : client.from("customers").insert(result.values);
  const saved = await query.select("id").single();
  if (saved.error || !saved.data) return { error: "No se pudo guardar el cliente. Revise los datos e intente nuevamente." };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/cotizaciones");
  revalidatePath(`/admin/clientes/${saved.data.id}`);
  return { success: "Cliente guardado." };
}
