import Link from "next/link";
import { Download, Hotel, Package, Plane, Receipt, Ship } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { DuplicateQuotationButton, PhotoCleanupForm } from "@/components/admin/quotation-actions";
import { NewQuotationMenu } from "@/components/admin/new-quotation-menu";
import { EmptyState, FilterNav, formatDay, PageHeader, RecordList, RecordRow, SearchForm, StatusBadge } from "@/components/admin/ui";
import { quotationTone } from "@/lib/admin-status";
import { isMissingColumn, quotationKind } from "@/lib/quotation-data";
import { effectiveExpiry, formatInstant, isExpired, quotationKindAdminLabels, quotationKinds, type QuotationKind } from "@/lib/quotation-details";
import { formatQuotationAmount } from "@/lib/quotation-types";
import { adminQuotationStatusLabel as quotationStatusLabel, adminQuotationStatuses as quotationStatuses, type AdminQuotationStatus as QuotationStatus } from "@/lib/admin-quotation-status";

export const metadata = pageMetadata("/admin/cotizaciones", "viatour | Cotizaciones", "Gestión privada de cotizaciones de viatour.");

const kindIcons: Record<QuotationKind, typeof Plane> = { vuelo: Plane, hotel: Hotel, ferry: Ship, paquete: Package, combinado: Package, general: Receipt };

type Row = Record<string, unknown>;
type Search = { q?: string; estado?: string; tipo?: string; asesor?: string };

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { client, user } = await requireAdmin();
  const current = await searchParams;
  const search = String(current.q ?? "").trim();
  const selectedStatus = quotationStatuses.includes(current.estado as QuotationStatus) ? current.estado as QuotationStatus : "";
  const selectedKind = quotationKinds.includes(current.tipo as QuotationKind) ? current.tipo as QuotationKind : "";
  const mine = current.asesor === "mias";
  const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
  const build = (fields: string, withKind: boolean) => {
    let query = client.from("quotations").select(fields, { count: "exact" }).order("created_at", { ascending: false }).limit(100);
    if (selectedStatus) query = query.eq("estado", selectedStatus);
    if (selectedKind && withKind) query = query.eq("tipo", selectedKind);
    if (mine) query = query.eq("agente_id", user.id);
    if (safe) query = query.or(`codigo.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%,destino.ilike.%${safe}%`);
    return query;
  };
  const legacy = "id,codigo,cliente_nombre,cliente_email,destino,moneda,total,estado,created_at,validez";
  let result = await build(`${legacy},tipo,vence_en`, true);
  if (isMissingColumn(result.error)) result = await build(legacy, false);
  if (result.error) throw new Error("No se pudieron cargar las cotizaciones.");
  const quotations = (result.data ?? []) as unknown as Row[];
  const ids = quotations.map(row => String(row.id));
  const [converted, ...statusCounts] = await Promise.all([
    ids.length ? client.from("reservations").select("quotation_id,codigo").in("quotation_id", ids) : Promise.resolve({ data: [] as Row[] }),
    ...quotationStatuses.map(status => client.from("quotations").select("id", { count: "exact", head: true }).eq("estado", status)),
  ]);
  const reservations = new Map((converted.data ?? []).map(row => [String(row.quotation_id), String(row.codigo)]));
  const counts = Object.fromEntries(quotationStatuses.map((status, i) => [status, statusCounts[i].error ? undefined : statusCounts[i].count ?? 0]));
  const href = (patch: Partial<Search>) => {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: search, estado: selectedStatus, tipo: selectedKind, asesor: mine ? "mias" : "", ...patch })) if (value) values.set(key, value);
    const text = values.toString();
    return `/admin/cotizaciones${text ? `?${text}` : ""}`;
  };
  const filtered = Boolean(search || selectedStatus || selectedKind || mine);

  return <>
    <PageHeader title="Cotizaciones" description="Prepare, envíe y dé seguimiento a las cotizaciones de sus clientes." actions={<NewQuotationMenu />} />
    <div className="space-y-3">
      <SearchForm id="quotation-search" action="/admin/cotizaciones" placeholder="Buscar por código, cliente o destino" defaultValue={search} hidden={{ estado: selectedStatus, tipo: selectedKind, asesor: mine ? "mias" : "" }} />
      <FilterNav label="Filtrar por estado" items={[{ href: href({ estado: "" }), label: "Todas", current: !selectedStatus }, ...quotationStatuses.map(status => ({ href: href({ estado: status }), label: quotationStatusLabel(status), current: selectedStatus === status, count: counts[status] }))]} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterNav label="Filtrar por tipo" items={[{ href: href({ tipo: "" }), label: "Todos los tipos", current: !selectedKind }, ...quotationKinds.map(kind => ({ href: href({ tipo: kind }), label: quotationKindAdminLabels[kind], current: selectedKind === kind }))]} />
        <FilterNav label="Filtrar por asesor" items={[{ href: href({ asesor: "" }), label: "Todo el equipo", current: !mine }, { href: href({ asesor: "mias" }), label: "Asignadas a mí", current: mine }]} />
      </div>
    </div>
    <p className="t-small text-ink-soft" aria-live="polite">{result.count ?? quotations.length} {result.count === 1 ? "cotización" : "cotizaciones"}{(result.count ?? 0) > quotations.length ? ` · se muestran las ${quotations.length} más recientes` : ""}</p>
    {!quotations.length ? <EmptyState title={filtered ? "No hay cotizaciones con estos filtros" : "Todavía no hay cotizaciones"} description={filtered ? <Link href="/admin/cotizaciones" className="text-brand underline underline-offset-4">Quitar filtros</Link> : "Cree la primera cotización o conviértala desde un lead."} action={filtered ? undefined : <NewQuotationMenu />} /> : <RecordList label="Cotizaciones">{quotations.map(quotation => {
      const status = String(quotation.estado) as QuotationStatus;
      const kind = quotationKind(quotation.tipo);
      const Icon = kindIcons[kind];
      const expiry = effectiveExpiry(quotation.vence_en as string | null, quotation.validez as string | null);
      const open = status === "borrador" || status === "enviada";
      const expired = open && isExpired(expiry);
      const reservation = reservations.get(String(quotation.id));
      return <RecordRow key={String(quotation.id)} href={`/admin/cotizaciones/${quotation.id}`} icon={<Icon size={18} strokeWidth={1.75} />}
        title={<>{String(quotation.cliente_nombre)}<span className="font-normal text-ink-soft"> · {String(quotation.destino)}</span></>}
        badges={<><StatusBadge tone={quotationTone[status]}>{quotationStatusLabel(status)}</StatusBadge>{expired ? <StatusBadge tone="danger">Vencida</StatusBadge> : null}{reservation ? <StatusBadge tone="success">Reserva {reservation}</StatusBadge> : null}</>}
        meta={<>{String(quotation.codigo)} · {quotationKindAdminLabels[kind]} · Creada {formatDay(String(quotation.created_at))}{open && expiry ? ` · ${expired ? "Venció" : "Válida hasta"} ${formatInstant(expiry, undefined, false)}` : ""}</>}
        aside={<span className="font-semibold tabular-nums">{formatQuotationAmount(Number(quotation.total), quotation.moneda as "USD" | "HNL")}</span>}
        actions={<><DuplicateQuotationButton id={String(quotation.id)} codigo={String(quotation.codigo)} /><a href={`/api/admin/cotizaciones/${quotation.id}/pdf`} className="inline-flex size-11 items-center justify-center rounded-btn border border-line text-ink hover:bg-canvas" aria-label={`Descargar PDF de ${quotation.codigo}`} title="Descargar PDF"><Download size={18} strokeWidth={1.75} aria-hidden="true" /></a></>} />;
    })}</RecordList>}
    <details className="rounded-card border border-line bg-canvas p-4 sm:px-6">
      <summary className="cursor-pointer font-semibold">Mantenimiento: fotos de hoteles sin uso</summary>
      <p className="t-small mt-2 mb-4 text-ink-soft">Busca fotos subidas hace más de 7 días que ya no aparecen en ninguna cotización, versión enviada ni hotel del catálogo. La base de datos vuelve a comprobarlo antes de borrar cada una.</p>
      <PhotoCleanupForm />
    </details>
  </>;
}
