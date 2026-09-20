import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { QuotationBuilder } from "@/components/admin/quotation-builder";
import type { Customer } from "@/lib/quotation-types";

export const metadata = pageMetadata("/admin/cotizaciones/nuevo", "viatour | Crear cotización", "Crear una cotización en la administración privada de viatour.");

export default async function NewQuotationPage() {
  const { client } = await requireAdmin();
  const customers = await client.from("customers").select("id,nombre,email,telefono,notas").order("nombre", { ascending: true }).limit(500);
  if (customers.error) throw new Error("No se pudieron cargar los clientes.");
  return <div><Link href="/admin/cotizaciones" className="text-brand underline underline-offset-4">Volver a cotizaciones</Link><h1 className="t-h1 my-6">Crear cotización</h1><QuotationBuilder customers={(customers.data ?? []) as Customer[]} /></div>;
}
