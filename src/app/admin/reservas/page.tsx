import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { outstandingBalances } from "@/lib/admin-reports";
import { reservationTone } from "@/lib/admin-status";
import { formatMoney, reservationStatusLabel, reservationStatuses, type ReservationStatus } from "@/lib/reservation-types";
import { EmptyState, FilterNav, formatDay, PageHeader, RecordList, RecordRow, SearchForm, StatusBadge } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin/reservas", "viatour | Reservas", "Gestión privada de reservas de viatour.");

type Row = Record<string, unknown>;
type Search = { q?: string; estado?: string; saldo?: string };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { client } = await requireAdmin();
  const current = await searchParams;
  const search = String(current.q ?? "").trim();
  const selectedStatus = reservationStatuses.includes(current.estado as ReservationStatus) ? current.estado as ReservationStatus : "";
  const owing = current.saldo === "pendiente";
  const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
  // "Con saldo" is computed from payments, so it reads all active reservations (up to 500) and
  // filters here; the other views read the 100 most recent.
  let query = client.from("reservations").select("id,codigo,cliente_nombre,destino,moneda,total,estado,fecha_inicio,fecha_fin,created_at", { count: "exact" }).order(owing ? "fecha_inicio" : "created_at", owing ? { ascending: true, nullsFirst: false } : { ascending: false }).limit(owing ? 500 : 100);
  if (selectedStatus) query = query.eq("estado", selectedStatus);
  else if (owing) query = query.in("estado", ["pendiente", "confirmada", "en_curso"]);
  if (safe) query = query.or(`codigo.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%,destino.ilike.%${safe}%`);
  const result = await query;
  if (result.error) throw new Error("No se pudieron cargar las reservas.");
  const all = (result.data ?? []) as Row[];
  const paymentResult = all.length ? await client.from("payments").select("reservation_id,monto,moneda").in("reservation_id", all.map(item => String(item.id))) : { data: [], error: null };
  if (paymentResult.error) throw new Error("No se pudieron cargar los pagos de las reservas.");
  const balances = new Map(outstandingBalances(all, (paymentResult.data ?? []) as Row[]).map(entry => [String(entry.row.id), entry.balance]));
  const reservations = owing ? all.filter(row => balances.has(String(row.id))) : all;
  const href = (patch: Partial<Search>) => {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: search, estado: selectedStatus, saldo: owing ? "pendiente" : "", ...patch })) if (value) values.set(key, value);
    const text = values.toString();
    return `/admin/reservas${text ? `?${text}` : ""}`;
  };
  const filtered = Boolean(search || selectedStatus || owing);

  return <>
    <PageHeader title="Reservas" description="Fechas, pagos, saldos, documentos y facturas de cada viaje confirmado. Las reservas se crean desde una cotización aceptada." />
    <div className="space-y-3">
      <SearchForm id="reservation-search" action="/admin/reservas" placeholder="Buscar por código, cliente o destino" defaultValue={search} hidden={{ estado: selectedStatus, saldo: owing ? "pendiente" : "" }} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterNav label="Filtrar reservas por estado" items={[{ href: href({ estado: "" }), label: "Todas", current: !selectedStatus }, ...reservationStatuses.map(status => ({ href: href({ estado: status }), label: reservationStatusLabel(status), current: selectedStatus === status }))]} />
        <FilterNav label="Filtrar por saldo" items={[{ href: href({ saldo: owing ? "" : "pendiente" }), label: "Con saldo pendiente", current: owing }]} />
      </div>
    </div>
    <p className="t-small text-ink-soft" aria-live="polite">{reservations.length} {reservations.length === 1 ? "reserva" : "reservas"}{!owing && (result.count ?? 0) > all.length ? ` de ${result.count} · se muestran las más recientes` : ""}</p>
    {!reservations.length ? <EmptyState title={filtered ? "No hay reservas con estos filtros" : "Todavía no hay reservas"} description={filtered ? <Link href="/admin/reservas" className="text-brand underline underline-offset-4">Quitar filtros</Link> : <>Cuando un cliente acepte una cotización, ábrala y use «Convertir en reserva».</>} /> : <RecordList label="Reservas">{reservations.map(reservation => {
      const status = String(reservation.estado) as ReservationStatus;
      const balance = balances.get(String(reservation.id)) ?? 0;
      const currency = reservation.moneda as "USD" | "HNL";
      return <RecordRow key={String(reservation.id)} href={`/admin/reservas/${reservation.id}`} icon={<CalendarDays size={18} strokeWidth={1.75} />}
        title={<>{String(reservation.cliente_nombre)}<span className="font-normal text-ink-soft"> · {String(reservation.destino)}</span></>}
        badges={<StatusBadge tone={reservationTone[status]}>{reservationStatusLabel(status)}</StatusBadge>}
        meta={<>{String(reservation.codigo)} · {reservation.fecha_inicio ? `${formatDay(reservation.fecha_inicio as string)} — ${formatDay(reservation.fecha_fin as string | null)}` : "Fechas por definir"}</>}
        aside={<><p className="font-semibold tabular-nums">{formatMoney(Number(reservation.total), currency)}</p><p className={`t-small ${balance > 0 || status === "cancelada" ? "text-ink-soft" : "font-semibold text-success"}`}>{status === "cancelada" ? "Cancelada" : balance > 0 ? `Saldo ${formatMoney(balance, currency)}` : "Pagada"}</p></>} />;
    })}</RecordList>}
  </>;
}
