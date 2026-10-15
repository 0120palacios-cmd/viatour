import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { invoiceTone } from "@/lib/admin-status";
import { formatMoney, invoiceStatusLabel, invoiceStatuses, type InvoiceStatus } from "@/lib/reservation-types";
import { EmptyState, FilterNav, formatDay, PageHeader, RecordList, RecordRow, SearchForm, StatusBadge } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin/facturacion", "viatour | Facturación", "Gestión privada de facturas de viatour.");

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { client } = await requireAdmin();
  const { q, estado } = await searchParams;
  const search = String(q ?? "").trim();
  const selectedStatus = invoiceStatuses.includes(estado as InvoiceStatus) ? estado as InvoiceStatus : "";
  let query = client.from("invoices").select("id,reservation_id,numero,cliente_nombre,total,moneda,fecha_emision,fecha_vencimiento,estado", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  if (selectedStatus) query = query.eq("estado", selectedStatus);
  if (search) { const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim(); if (safe) query = query.or(`numero.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%`); }
  const result = await query;
  if (result.error) throw new Error("No se pudieron cargar las facturas.");
  const invoices = result.data ?? [];
  const href = (status: string) => { const values = new URLSearchParams(); if (search) values.set("q", search); if (status) values.set("estado", status); const text = values.toString(); return `/admin/facturacion${text ? `?${text}` : ""}`; };
  const filtered = Boolean(search || selectedStatus);
  return <>
    <PageHeader title="Facturación" description="Facturas administrativas emitidas desde cada reserva. Para crear una factura, abra la reserva correspondiente." />
    <div className="space-y-3">
      <SearchForm id="invoice-search" action="/admin/facturacion" placeholder="Buscar por número o cliente" defaultValue={search} hidden={{ estado: selectedStatus }} />
      <FilterNav label="Filtrar facturas por estado" items={[{ href: href(""), label: "Todas", current: !selectedStatus }, ...invoiceStatuses.map(status => ({ href: href(status), label: invoiceStatusLabel(status), current: selectedStatus === status }))]} />
    </div>
    <p className="t-small text-ink-soft" aria-live="polite">{result.count ?? invoices.length} {result.count === 1 ? "factura" : "facturas"}</p>
    {!invoices.length ? <EmptyState title={filtered ? "No hay facturas con estos filtros" : "Todavía no hay facturas"} description={filtered ? <Link href="/admin/facturacion" className="text-brand underline underline-offset-4">Quitar filtros</Link> : <>Las facturas se crean desde el detalle de una <Link href="/admin/reservas" className="text-brand underline underline-offset-4">reserva</Link>.</>} /> : <RecordList label="Facturas">{invoices.map((invoice: Record<string, unknown>) => {
      const status = String(invoice.estado) as InvoiceStatus;
      return <RecordRow key={String(invoice.id)} href={`/admin/facturacion/${invoice.id}`} icon={<ReceiptText size={18} strokeWidth={1.75} />}
        title={<>{String(invoice.numero)}<span className="font-normal text-ink-soft"> · {String(invoice.cliente_nombre)}</span></>}
        badges={<StatusBadge tone={invoiceTone[status]}>{invoiceStatusLabel(status)}</StatusBadge>}
        meta={`Emisión ${formatDay(String(invoice.fecha_emision))} · Vencimiento ${formatDay(String(invoice.fecha_vencimiento))}`}
        aside={<span className="font-semibold tabular-nums">{formatMoney(Number(invoice.total), invoice.moneda as "USD" | "HNL")}</span>} />;
    })}</RecordList>}
  </>;
}
