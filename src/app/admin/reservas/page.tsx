import Link from "next/link";
import { CalendarDays, ClipboardList } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { formatMoney, reservationStatusLabel, reservationStatuses, type ReservationStatus } from "@/lib/reservation-types";

export const metadata = pageMetadata("/admin/reservas", "viatour | Reservas", "Gestión privada de reservas de viatour.");

function statusClass(status: ReservationStatus) { return ({ pendiente: "bg-surface text-ink-soft", confirmada: "bg-brand-tint text-brand-deep", en_curso: "bg-brand-tint text-brand-deep", completada: "bg-surface text-success", cancelada: "bg-surface text-error" } as Record<ReservationStatus, string>)[status]; }
function dateLabel(value: string | null) { return value ? new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`)) : "Sin fecha"; }

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { client } = await requireAdmin();
  const { q, estado } = await searchParams;
  const search = String(q ?? "").trim();
  const selectedStatus = reservationStatuses.includes(estado as ReservationStatus) ? estado as ReservationStatus : "";
  let query = client.from("reservations").select("id,codigo,cliente_nombre,destino,moneda,total,estado,fecha_inicio,fecha_fin,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  if (selectedStatus) query = query.eq("estado", selectedStatus);
  if (search) { const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim(); if (safe) query = query.or(`codigo.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%,destino.ilike.%${safe}%`); }
  const result = await query;
  if (result.error) throw new Error("No se pudieron cargar las reservas.");
  const reservations = result.data ?? [];
  const ids = reservations.map(item => String(item.id));
  const paymentResult = ids.length ? await client.from("payments").select("reservation_id,monto,moneda").in("reservation_id", ids) : { data: [], error: null };
  if (paymentResult.error) throw new Error("No se pudieron cargar los pagos de las reservas.");
  const currencyByReservation = new Map(reservations.map(item => [String(item.id), String(item.moneda)]));
  const paid = new Map<string, number>();
  for (const payment of paymentResult.data ?? []) if (currencyByReservation.get(String(payment.reservation_id)) === String(payment.moneda)) paid.set(String(payment.reservation_id), (paid.get(String(payment.reservation_id)) ?? 0) + Number(payment.monto));
  return <div className="space-y-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="t-h1">Reservas</h1><p className="mt-2 text-ink-soft">Gestione reservas, fechas, pagos y saldos desde el panel privado.</p></div><ClipboardList className="text-brand" size={34} strokeWidth={1.75} aria-hidden="true" /></div><div className="space-y-4"><form className="flex flex-col gap-3 sm:flex-row" role="search"><label className="sr-only" htmlFor="reservation-search">Buscar reservas</label><input id="reservation-search" className="h-12 w-full rounded-btn border border-line bg-canvas px-3 text-ink focus-visible:border-brand" name="q" placeholder="Buscar por código, cliente o destino" defaultValue={search} /><button className="inline-flex min-h-12 items-center justify-center rounded-btn border border-brand px-5 py-3 font-semibold text-brand" type="submit">Buscar</button></form><nav aria-label="Filtrar reservas por estado" className="flex flex-wrap gap-3"><Link href={`/admin/reservas${search ? `?q=${encodeURIComponent(search)}` : ""}`} aria-current={!selectedStatus ? "page" : undefined} className="rounded-btn border px-4 py-3 text-brand aria-[current=page]:bg-brand-tint">Todas</Link>{reservationStatuses.map(status => <Link key={status} href={`/admin/reservas?estado=${status}${search ? `&q=${encodeURIComponent(search)}` : ""}`} aria-current={selectedStatus === status ? "page" : undefined} className="rounded-btn border px-4 py-3 text-brand aria-[current=page]:bg-brand-tint">{reservationStatusLabel(status)}</Link>)}</nav></div>{!reservations.length ? <p className="rounded-card border p-6">No hay reservas en esta vista.</p> : <div className="space-y-4">{reservations.map((reservation: Record<string, unknown>) => { const status = String(reservation.estado) as ReservationStatus; const total = Number(reservation.total); const amountPaid = paid.get(String(reservation.id)) ?? 0; const balance = total - amountPaid; return <article key={String(reservation.id)} className="rounded-card border bg-canvas p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="t-h3">{String(reservation.codigo)}</h2><span className={`rounded-btn px-3 py-1 t-small ${statusClass(status)}`}>{reservationStatusLabel(status)}</span></div><p className="mt-2">{String(reservation.cliente_nombre)} · {String(reservation.destino)}</p><p className="mt-1 flex items-center gap-2 t-small text-ink-soft"><CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />{dateLabel(reservation.fecha_inicio as string | null)} — {dateLabel(reservation.fecha_fin as string | null)}</p></div><div className="text-right"><p className="t-h3 whitespace-nowrap">{formatMoney(total, reservation.moneda as "USD" | "HNL")}</p><p className={`t-small ${balance <= 0 ? "font-semibold text-success" : "text-ink-soft"}`}>{balance <= 0 ? "Pagada" : `Saldo: ${formatMoney(balance, reservation.moneda as "USD" | "HNL")}`}</p></div></div><div className="mt-6 border-t border-line pt-4"><Link href={`/admin/reservas/${reservation.id}`} className="text-brand underline underline-offset-4">Ver y editar reserva</Link></div></article>; })}</div>}</div>;
}
