import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { QuotationBuilder } from "@/components/admin/quotation-builder";
import { leadQuotationPrefill, type LeadPrefill } from "@/lib/lead-admin";
import { validUuid } from "@/lib/quotation-validation";
import type { Customer } from "@/lib/quotation-types";

export const metadata = pageMetadata("/admin/cotizaciones/nuevo", "viatour | Crear cotización", "Crear una cotización en la administración privada de viatour.");

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { client } = await requireAdmin();
  const { lead } = await searchParams;
  const customers = await client.from("customers").select("id,nombre,email,telefono,notas").order("nombre", { ascending: true }).limit(500);
  if (customers.error) throw new Error("No se pudieron cargar los clientes.");
  let prefill: LeadPrefill | undefined;
  if (lead && validUuid(lead)) {
    const row = await client.from("leads").select("*").eq("id", lead).maybeSingle();
    if (row.data) prefill = leadQuotationPrefill(row.data);
  }
  return <div><Link href={prefill ? "/admin/leads" : "/admin/cotizaciones"} className="text-brand underline underline-offset-4">{prefill ? "Volver a leads" : "Volver a cotizaciones"}</Link><h1 className="t-h1 my-6">Crear cotización</h1>{prefill && <p className="mb-6 rounded-card border border-line bg-brand-tint p-4 text-ink">Datos precargados desde el lead. Revise el correo del cliente: es obligatorio para enviar la cotización.</p>}<QuotationBuilder customers={(customers.data ?? []) as Customer[]} prefill={prefill} /></div>;
}
