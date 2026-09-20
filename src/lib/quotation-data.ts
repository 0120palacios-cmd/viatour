import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Quotation, QuotationItem } from "@/lib/quotation-types";

const quotationFields = "id,codigo,customer_id,cliente_nombre,cliente_email,cliente_telefono,destino,moneda,validez,notas,total,estado,agente_id,created_at,updated_at";

export async function getAdminQuotation(client: SupabaseClient, id: string) {
  const quotationResult = await client.from("quotations").select(quotationFields).eq("id", id).maybeSingle();
  if (quotationResult.error || !quotationResult.data) return null;
  const itemsResult = await client.from("quotation_items").select("id,quotation_id,descripcion,tipo,cantidad,precio_unitario,orden").eq("quotation_id", id).order("orden", { ascending: true }).order("id", { ascending: true });
  if (itemsResult.error) throw new Error("No se pudieron cargar los ítems de la cotización.");
  return { quotation: quotationResult.data as Quotation, items: (itemsResult.data ?? []) as QuotationItem[] };
}

export { quotationFields };
