import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { getAdminInvoice } from "@/lib/reservation-data";
import { formatMoney } from "@/lib/reservation-types";
import { InvoiceActions } from "@/components/admin/reservation-actions";
import { noindexMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { return noindexMetadata(`viatour | Factura ${ (await params).id }`, "Detalle privado de una factura de viatour."); }

function dateLabel(value: string) { return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`)); }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const record = await getAdminInvoice(client, id);
  if (!record) return <div className="space-y-6"><Link href="/admin/facturacion" className="text-brand underline underline-offset-4">Volver a facturación</Link><p className="rounded-card border p-6">No se encontró la factura.</p></div>;
  const { invoice, reservation } = record;
  return <div className="space-y-8"><Link href="/admin/facturacion" className="inline-flex items-center gap-2 text-brand underline underline-offset-4"><ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />Volver a facturación</Link><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="t-small text-ink-soft">{invoice.numero}</p><h1 className="t-h1">Factura</h1><p className="mt-2">{invoice.cliente_nombre} · Reserva {reservation.codigo}</p></div><div className="rounded-panel border bg-brand-tint p-5 text-right"><p className="t-small text-brand-deep">Total</p><p className="t-h2 text-brand-deep">{formatMoney(Number(invoice.total), invoice.moneda)}</p></div></div><section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="invoice-details"><h2 id="invoice-details" className="t-h2 mb-6">Datos de la factura</h2><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="t-small text-ink-soft">Cliente</dt><dd>{invoice.cliente_nombre}</dd></div><div><dt className="t-small text-ink-soft">Correo electrónico</dt><dd className="break-all">{invoice.cliente_email}</dd></div><div><dt className="t-small text-ink-soft">Fecha de emisión</dt><dd>{dateLabel(invoice.fecha_emision)}</dd></div><div><dt className="t-small text-ink-soft">Fecha de vencimiento</dt><dd>{dateLabel(invoice.fecha_vencimiento)}</dd></div></dl><div className="mt-8 border-t border-line pt-6"><InvoiceActions invoice={invoice} /></div></section><section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="invoice-items"><h2 id="invoice-items" className="t-h2 mb-6">Ítems facturados</h2><div className="overflow-x-auto rounded-card border bg-canvas"><table className="w-full min-w-[640px] text-left"><caption className="sr-only">Ítems de la factura</caption><thead className="bg-brand-tint text-brand-deep"><tr><th className="p-4">Descripción</th><th className="p-4">Tipo</th><th className="p-4">Cantidad</th><th className="p-4">Precio unitario</th><th className="p-4">Subtotal</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={item.id ?? `${item.descripcion}-${index}`} className="border-t border-line"><td className="p-4">{item.descripcion}</td><td className="p-4">{item.tipo}</td><td className="p-4">{item.cantidad}</td><td className="p-4">{formatMoney(Number(item.precio_unitario), invoice.moneda)}</td><td className="p-4 font-semibold">{formatMoney(Number(item.cantidad) * Number(item.precio_unitario), invoice.moneda)}</td></tr>)}</tbody></table></div></section></div>;
}
