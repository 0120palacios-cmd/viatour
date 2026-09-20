import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { formatMoney, invoiceStatusLabel, invoiceStatuses, type InvoiceStatus } from "@/lib/reservation-types";

export const metadata = pageMetadata("/admin/facturacion", "viatour | Facturación", "Gestión privada de facturas de viatour.");

function statusClass(status: InvoiceStatus) { return ({ borrador: "bg-surface text-ink-soft", emitida: "bg-brand-tint text-brand-deep", pagada: "bg-surface text-success", anulada: "bg-surface text-error" } as Record<InvoiceStatus, string>)[status]; }
function dateLabel(value: string) { return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`)); }

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
  return <div className="space-y-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="t-h1">Facturación</h1><p className="mt-2 text-ink-soft">Consulte facturas administrativas y gestione su estado.</p></div><ReceiptText className="text-brand" size={34} strokeWidth={1.75} aria-hidden="true" /></div><div className="space-y-4"><form className="flex flex-col gap-3 sm:flex-row" role="search"><label className="sr-only" htmlFor="invoice-search">Buscar facturas</label><input id="invoice-search" className="h-12 w-full rounded-btn border border-line bg-canvas px-3 text-ink focus-visible:border-brand" name="q" placeholder="Buscar por número o cliente" defaultValue={search} /><button className="inline-flex min-h-12 items-center justify-center rounded-btn border border-brand px-5 py-3 font-semibold text-brand" type="submit">Buscar</button></form><nav aria-label="Filtrar facturas por estado" className="flex flex-wrap gap-3"><Link href={`/admin/facturacion${search ? `?q=${encodeURIComponent(search)}` : ""}`} aria-current={!selectedStatus ? "page" : undefined} className="rounded-btn border px-4 py-3 text-brand aria-[current=page]:bg-brand-tint">Todas</Link>{invoiceStatuses.map(status => <Link key={status} href={`/admin/facturacion?estado=${status}${search ? `&q=${encodeURIComponent(search)}` : ""}`} aria-current={selectedStatus === status ? "page" : undefined} className="rounded-btn border px-4 py-3 text-brand aria-[current=page]:bg-brand-tint">{invoiceStatusLabel(status)}</Link>)}</nav></div>{!invoices.length ? <p className="rounded-card border p-6">No hay facturas en esta vista.</p> : <div className="space-y-4">{invoices.map((invoice: Record<string, unknown>) => { const status = String(invoice.estado) as InvoiceStatus; return <article key={String(invoice.id)} className="rounded-card border bg-canvas p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="t-h3">{String(invoice.numero)}</h2><span className={`rounded-btn px-3 py-1 t-small ${statusClass(status)}`}>{invoiceStatusLabel(status)}</span></div><p className="mt-2">{String(invoice.cliente_nombre)}</p><p className="t-small text-ink-soft">Emisión: {dateLabel(String(invoice.fecha_emision))} · Vencimiento: {dateLabel(String(invoice.fecha_vencimiento))}</p></div><p className="t-h3 whitespace-nowrap">{formatMoney(Number(invoice.total), invoice.moneda as "USD" | "HNL")}</p></div><div className="mt-6 border-t border-line pt-4"><Link href={`/admin/facturacion/${invoice.id}`} className="text-brand underline underline-offset-4">Ver factura</Link></div></article>; })}</div>}</div>;
}
