import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { QuotationStatusForm } from "@/components/admin/quotation-actions";
import { formatQuotationAmount, quotationStatusLabel, quotationStatuses, type QuotationStatus } from "@/lib/quotation-types";

export const metadata = pageMetadata("/admin/cotizaciones", "viatour | Cotizaciones", "Gestión privada de cotizaciones de viatour.");

function statusClass(status: QuotationStatus) { return ({ borrador: "bg-surface text-ink-soft", enviada: "bg-brand-tint text-brand-deep", aceptada: "bg-surface text-success", rechazada: "bg-surface text-error", expirada: "bg-surface text-ink-soft" } as Record<QuotationStatus, string>)[status]; }

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { client } = await requireAdmin();
  const { q, estado } = await searchParams;
  const search = String(q ?? "").trim();
  const selectedStatus = quotationStatuses.includes(estado as QuotationStatus) ? estado as QuotationStatus : "";
  let query = client.from("quotations").select("id,codigo,cliente_nombre,cliente_email,destino,moneda,total,estado,created_at,validez", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  if (selectedStatus) query = query.eq("estado", selectedStatus);
  if (search) { const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim(); if (safe) query = query.or(`codigo.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%,destino.ilike.%${safe}%`); }
  const result = await query;
  if (result.error) throw new Error("No se pudieron cargar las cotizaciones.");
  const quotations = result.data ?? [];
  return <div className="space-y-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="t-h1">Cotizaciones</h1><p className="mt-2 text-ink-soft">Prepare, comparta y dé seguimiento a sus cotizaciones.</p></div><Button asChild><Link href="/admin/cotizaciones/nuevo"><FilePlus2 size={19} strokeWidth={1.75} aria-hidden="true" />Crear cotización</Link></Button></div>
    <div className="space-y-4"><form className="flex flex-col gap-3 sm:flex-row" role="search"><label className="sr-only" htmlFor="quotation-search">Buscar cotizaciones</label><input id="quotation-search" className="h-12 w-full rounded-btn border border-line bg-canvas px-3 text-ink focus-visible:border-brand" name="q" placeholder="Buscar por código, cliente o destino" defaultValue={search} /><Button type="submit" variant="ghost">Buscar</Button></form><nav aria-label="Filtrar cotizaciones por estado" className="flex flex-wrap gap-3"><Link href={`/admin/cotizaciones${search ? `?q=${encodeURIComponent(search)}` : ""}`} aria-current={!selectedStatus ? "page" : undefined} className="rounded-btn border px-4 py-3 text-brand aria-[current=page]:bg-brand-tint">Todas</Link>{quotationStatuses.map(status => <Link key={status} href={`/admin/cotizaciones?estado=${status}${search ? `&q=${encodeURIComponent(search)}` : ""}`} aria-current={selectedStatus === status ? "page" : undefined} className="rounded-btn border px-4 py-3 text-brand aria-[current=page]:bg-brand-tint">{quotationStatusLabel(status)}</Link>)}</nav></div>
    {!quotations.length ? <p className="rounded-card border p-6">No hay cotizaciones en esta vista.</p> : <div className="space-y-4">{quotations.map((quotation: Record<string, unknown>) => { const status = String(quotation.estado) as QuotationStatus; return <article key={String(quotation.id)} className="rounded-card border bg-canvas p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="t-h3">{String(quotation.codigo)}</h2><span className={`rounded-btn px-3 py-1 t-small ${statusClass(status)}`}>{quotationStatusLabel(status)}</span></div><p className="mt-2">{String(quotation.cliente_nombre)} · {String(quotation.destino)}</p><p className="t-small text-ink-soft">{new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(String(quotation.created_at)))} · Validez: {String(quotation.validez)}</p></div><p className="t-h3 whitespace-nowrap">{formatQuotationAmount(Number(quotation.total), quotation.moneda as "USD" | "HNL")}</p></div><div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-4"><Link href={`/admin/cotizaciones/${quotation.id}`} className="text-brand underline underline-offset-4">Ver y editar</Link><QuotationStatusForm id={String(quotation.id)} status={status} /></div></article>; })}</div>}
  </div>;
}
