import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getAdminInvoice } from "@/lib/reservation-data";
import { formatMoney, invoiceStatusLabel } from "@/lib/reservation-types";
import { InvoiceActions } from "@/components/admin/reservation-actions";
import { formatDay, PageHeader, Panel, StatusBadge, textLink } from "@/components/admin/ui";
import { invoiceTone } from "@/lib/admin-status";
import { noindexMetadata } from "@/lib/seo";
import { lineAmount } from "@/lib/money";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { return noindexMetadata(`viatour | Factura ${(await params).id}`, "Detalle privado de una factura de viatour."); }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const record = await getAdminInvoice(client, id);
  if (!record) return <><PageHeader title="Factura no encontrada" back={{ href: "/admin/facturacion", label: "Facturación" }} /><p className="rounded-card border border-line bg-canvas p-6">No se encontró la factura. Puede que se haya eliminado o que el enlace esté incompleto.</p></>;
  const { invoice, reservation } = record;
  return <>
    <PageHeader back={{ href: "/admin/facturacion", label: "Facturación" }} eyebrow={<span className="inline-flex items-center gap-2">{invoice.numero}<StatusBadge tone={invoiceTone[invoice.estado]}>{invoiceStatusLabel(invoice.estado)}</StatusBadge></span>} title={`Factura de ${invoice.cliente_nombre}`} description={<>Reserva <Link className={textLink} href={`/admin/reservas/${invoice.reservation_id}`}>{reservation.codigo}</Link></>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="order-2 min-w-0 space-y-6 xl:order-1">
        <Panel id="invoice-items" title="Conceptos facturados">
          <div className="overflow-x-auto"><table className="t-small w-full min-w-[560px] text-left"><caption className="sr-only">Conceptos de la factura</caption>
            <thead className="text-ink-soft"><tr className="border-b border-line"><th scope="col" className="px-4 py-3 font-semibold sm:px-6">Descripción</th><th scope="col" className="px-4 py-3 font-semibold">Tipo</th><th scope="col" className="px-4 py-3 text-right font-semibold">Cantidad</th><th scope="col" className="px-4 py-3 text-right font-semibold">Precio unitario</th><th scope="col" className="px-4 py-3 text-right font-semibold sm:pr-6">Subtotal</th></tr></thead>
            <tbody>{invoice.items.map((item, index) => <tr key={item.id ?? `${item.descripcion}-${index}`} className="border-t border-line first:border-t-0"><td className="px-4 py-3 sm:px-6">{item.descripcion}</td><td className="px-4 py-3 text-ink-soft">{item.tipo}</td><td className="px-4 py-3 text-right tabular-nums">{item.cantidad}</td><td className="px-4 py-3 text-right tabular-nums">{formatMoney(Number(item.precio_unitario), invoice.moneda)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums sm:pr-6">{formatMoney(lineAmount({ tipo: item.tipo, cantidad: Number(item.cantidad), precio_unitario: Number(item.precio_unitario) }), invoice.moneda)}</td></tr>)}</tbody>
            <tfoot><tr className="border-t border-line"><th scope="row" colSpan={4} className="px-4 py-3 text-right font-semibold sm:px-6">Total</th><td className="px-4 py-3 text-right font-semibold tabular-nums sm:pr-6">{formatMoney(Number(invoice.total), invoice.moneda)}</td></tr></tfoot>
          </table></div>
        </Panel>
        <Panel id="invoice-actions" title="Acciones" description="Descargue el PDF, envíelo al correo del cliente o actualice el estado de la factura."><div className="p-4 sm:p-6"><InvoiceActions invoice={invoice} /></div></Panel>
      </div>
      <aside aria-label="Resumen de la factura" className="order-1 space-y-4 xl:sticky xl:top-6 xl:order-2 xl:self-start">
        <section aria-labelledby="invoice-total" className="rounded-card border border-line bg-canvas p-4 sm:p-6"><h2 id="invoice-total" className="t-small text-ink-soft">Total</h2><p className="t-h2 tabular-nums">{formatMoney(Number(invoice.total), invoice.moneda)}</p></section>
        <section aria-labelledby="invoice-data" className="rounded-card border border-line bg-canvas p-4 sm:p-6"><h2 id="invoice-data" className="t-small text-ink-soft">Datos</h2>
          <dl className="mt-2 space-y-2"><div><dt className="t-small text-ink-soft">Cliente</dt><dd>{invoice.cliente_nombre}</dd></div><div><dt className="t-small text-ink-soft">Correo electrónico</dt><dd className="break-all">{invoice.cliente_email}</dd></div><div><dt className="t-small text-ink-soft">Emisión</dt><dd>{formatDay(invoice.fecha_emision)}</dd></div><div><dt className="t-small text-ink-soft">Vencimiento</dt><dd>{formatDay(invoice.fecha_vencimiento)}</dd></div></dl>
        </section>
      </aside>
    </div>
  </>;
}
