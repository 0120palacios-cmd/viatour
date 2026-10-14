import Link from "next/link";
import { FilePlus2, Hotel, Package, Plane, Receipt, Ship } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { PhotoCleanupForm, QuotationStatusForm } from "@/components/admin/quotation-actions";
import { isMissingColumn, quotationKind } from "@/lib/quotation-data";
import { effectiveExpiry, formatInstant, isExpired, quotationKindAdminLabels, quotationKinds, type QuotationKind } from "@/lib/quotation-details";
import { formatQuotationAmount, quotationStatusLabel, quotationStatuses, type QuotationStatus } from "@/lib/quotation-types";

export const metadata = pageMetadata("/admin/cotizaciones", "viatour | Cotizaciones", "Gestión privada de cotizaciones de viatour.");

function statusClass(status: QuotationStatus) { return ({ borrador: "bg-surface text-ink-soft", enviada: "bg-brand-tint text-brand-deep", aceptada: "bg-surface text-success", rechazada: "bg-surface text-error", expirada: "bg-surface text-ink-soft" } as Record<QuotationStatus, string>)[status]; }
const kindIcons: Record<QuotationKind, typeof Plane> = { vuelo: Plane, hotel: Hotel, ferry: Ship, paquete: Package, combinado: Package, general: Receipt };
const createLinks: [QuotationKind, string][] = [["vuelo", "Vuelo"], ["hotel", "Hotel"], ["ferry", "Ferry"], ["combinado", "Paquete combinado"], ["general", "Otros servicios"]];

type Row = Record<string, unknown>;

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; tipo?: string }> }) {
  const { client } = await requireAdmin();
  const { q, estado, tipo } = await searchParams;
  const search = String(q ?? "").trim();
  const selectedStatus = quotationStatuses.includes(estado as QuotationStatus) ? estado as QuotationStatus : "";
  const selectedKind = quotationKinds.includes(tipo as QuotationKind) ? tipo as QuotationKind : "";
  const build = (fields: string, withKind: boolean) => {
    let query = client.from("quotations").select(fields, { count: "exact" }).order("created_at", { ascending: false }).limit(100);
    if (selectedStatus) query = query.eq("estado", selectedStatus);
    if (selectedKind && withKind) query = query.eq("tipo", selectedKind);
    if (search) { const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim(); if (safe) query = query.or(`codigo.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%,destino.ilike.%${safe}%`); }
    return query;
  };
  const legacy = "id,codigo,cliente_nombre,cliente_email,destino,moneda,total,estado,created_at,validez";
  let result = await build(`${legacy},tipo,vence_en`, true);
  if (isMissingColumn(result.error)) result = await build(legacy, false);
  if (result.error) throw new Error("No se pudieron cargar las cotizaciones.");
  const quotations = (result.data ?? []) as unknown as Row[];
  const ids = quotations.map(row => String(row.id));
  const converted = ids.length ? await client.from("reservations").select("quotation_id,codigo").in("quotation_id", ids) : { data: [] };
  const reservations = new Map((converted.data ?? []).map(row => [String(row.quotation_id), String(row.codigo)]));
  const params = (extra: Record<string, string>) => { const values = new URLSearchParams({ ...(search ? { q: search } : {}), ...(selectedKind ? { tipo: selectedKind } : {}), ...(selectedStatus ? { estado: selectedStatus } : {}), ...extra }); for (const [key, value] of Array.from(values.entries())) if (!value) values.delete(key); const text = values.toString(); return `/admin/cotizaciones${text ? `?${text}` : ""}`; };
  const chip = "rounded-btn border px-4 py-2.5 text-brand aria-[current=page]:bg-brand-tint";
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="t-h1">Cotizaciones</h1><p className="mt-2 text-ink-soft">Prepare, comparta y dé seguimiento a sus cotizaciones.</p></div>
      <nav aria-label="Crear cotización" className="flex flex-wrap gap-2">{createLinks.map(([kind, label], index) => { const Icon = index === 0 ? FilePlus2 : kindIcons[kind]; return <Link key={kind} href={`/admin/cotizaciones/nuevo?tipo=${kind}`} className={index === 0 ? "inline-flex min-h-12 items-center gap-2 rounded-btn bg-brand px-5 text-white hover:bg-brand-deep" : "inline-flex min-h-12 items-center gap-2 rounded-btn border border-line px-4 text-ink hover:bg-surface"}><Icon size={18} strokeWidth={1.75} aria-hidden="true" />{index === 0 ? "Nueva de vuelo" : label}</Link>; })}</nav>
    </div>
    <div className="space-y-3">
      <form className="flex flex-col gap-3 sm:flex-row" role="search">{selectedKind ? <input type="hidden" name="tipo" value={selectedKind} /> : null}{selectedStatus ? <input type="hidden" name="estado" value={selectedStatus} /> : null}<label className="sr-only" htmlFor="quotation-search">Buscar cotizaciones</label><input id="quotation-search" className="h-12 w-full rounded-btn border border-line bg-canvas px-3 text-ink focus-visible:border-brand" name="q" placeholder="Buscar por código, cliente o destino" defaultValue={search} /><button type="submit" className="min-h-12 rounded-btn border border-line px-6 text-ink hover:bg-surface">Buscar</button></form>
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2"><Link href={params({ estado: "" })} aria-current={!selectedStatus ? "page" : undefined} className={chip}>Todos los estados</Link>{quotationStatuses.map(status => <Link key={status} href={params({ estado: status })} aria-current={selectedStatus === status ? "page" : undefined} className={chip}>{quotationStatusLabel(status)}</Link>)}</nav>
      <nav aria-label="Filtrar por tipo" className="flex flex-wrap gap-2"><Link href={params({ tipo: "" })} aria-current={!selectedKind ? "page" : undefined} className={chip}>Todos los tipos</Link>{quotationKinds.map(kind => <Link key={kind} href={params({ tipo: kind })} aria-current={selectedKind === kind ? "page" : undefined} className={chip}>{quotationKindAdminLabels[kind]}</Link>)}</nav>
    </div>
    {!quotations.length ? <p className="rounded-card border p-6">No hay cotizaciones en esta vista.</p> : <div className="space-y-4">{quotations.map(quotation => {
      const status = String(quotation.estado) as QuotationStatus;
      const kind = quotationKind(quotation.tipo);
      const Icon = kindIcons[kind];
      const expiry = effectiveExpiry(quotation.vence_en as string | null, quotation.validez as string | null);
      const expired = isExpired(expiry) && (status === "borrador" || status === "enviada");
      const reservation = reservations.get(String(quotation.id));
      return <article key={String(quotation.id)} className="rounded-card border bg-canvas p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Icon size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><h2 className="t-h3">{String(quotation.codigo)}</h2><span className={`rounded-btn px-3 py-1 t-small ${statusClass(status)}`}>{quotationStatusLabel(status)}</span>{expired ? <span className="rounded-btn border border-error/40 px-3 py-1 t-small text-error">Vencida</span> : null}{reservation ? <span className="rounded-btn bg-surface px-3 py-1 t-small text-success">Reserva {reservation}</span> : null}</div>
            <p className="mt-2">{String(quotation.cliente_nombre)} · {String(quotation.destino)} <span className="text-ink-soft">· {quotationKindAdminLabels[kind]}</span></p>
            <p className="t-small text-ink-soft">Creada {new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "America/Tegucigalpa" }).format(new Date(String(quotation.created_at)))} · {expired ? "Venció" : "Válida hasta"} {formatInstant(expiry)}</p>
          </div>
          <p className="t-h3 whitespace-nowrap">{formatQuotationAmount(Number(quotation.total), quotation.moneda as "USD" | "HNL")}</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-4"><Link href={`/admin/cotizaciones/${quotation.id}`} className="text-brand underline underline-offset-4">Abrir y editar</Link><a href={`/api/admin/cotizaciones/${quotation.id}/pdf`} className="text-brand underline underline-offset-4">Descargar PDF</a><QuotationStatusForm id={String(quotation.id)} status={status} /></div>
      </article>;
    })}</div>}
    <section aria-labelledby="photo-cleanup" className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <h2 id="photo-cleanup" className="t-h3">Fotos de hoteles sin uso</h2>
      <p className="mt-1 mb-4 t-small text-ink-soft">Busca fotos subidas hace más de 7 días que ya no aparecen en ninguna cotización ni en ninguna versión enviada. La base de datos vuelve a comprobarlo antes de borrar cada una.</p>
      <PhotoCleanupForm />
    </section>
  </div>;
}
