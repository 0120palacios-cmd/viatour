import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { getAdminQuotation } from "@/lib/quotation-data";
import { QuotationBuilder } from "@/components/admin/quotation-builder";
import { SendQuotationForm } from "@/components/admin/quotation-actions";
import { ConvertQuotationForm } from "@/components/admin/reservation-actions";
import { quotationStatusLabel, type Customer } from "@/lib/quotation-types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/cotizaciones/${(await params).id}`, "viatour | Editar cotización", "Editar una cotización en la administración privada de viatour.");
}

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [record, customers] = await Promise.all([getAdminQuotation(client, id), client.from("customers").select("id,nombre,email,telefono,notas").order("nombre", { ascending: true }).limit(500)]);
  if (!record) notFound();
  if (customers.error) throw new Error("No se pudieron cargar los clientes.");
  return <div className="space-y-8"><div><Link href="/admin/cotizaciones" className="text-brand underline underline-offset-4">Volver a cotizaciones</Link><div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><p className="t-small text-ink-soft">{record.quotation.codigo}</p><h1 className="t-h1">Editar cotización</h1><p className="mt-2">Estado: {quotationStatusLabel(record.quotation.estado)}</p></div><div className="flex flex-wrap gap-3"><a className="inline-flex min-h-12 items-center rounded-btn border border-line px-6 py-3 text-brand underline underline-offset-4" href={`/api/admin/cotizaciones/${id}/pdf`}>Descargar PDF</a><SendQuotationForm id={id} /></div></div></div><QuotationBuilder customers={(customers.data ?? []) as Customer[]} quotation={record.quotation} items={record.items} /><aside className="rounded-panel border border-line bg-surface p-6"><h2 className="t-h3">Reserva</h2><p className="mt-2 mb-4 text-ink-soft">Convierta la cotización únicamente cuando el cliente la haya aceptado.</p><ConvertQuotationForm quotationId={id} enabled={record.quotation.estado === "aceptada"} /></aside></div>;
}
