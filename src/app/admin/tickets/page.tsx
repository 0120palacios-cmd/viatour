import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { TicketResponseForm } from "@/components/admin/ticket-response-form";
import { EmptyState, FilterNav, formatDay, PageHeader, StatusBadge, textLink } from "@/components/admin/ui";
import { openTicketStatuses, ticketLabel, ticketStatuses, ticketToneOf, type TicketStatus } from "@/lib/admin-status";
import { noindexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noindexMetadata("viatour | Solicitudes de soporte", "Gestión privada de solicitudes de soporte vinculadas a reservas de viatour.");

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { client } = await requireAdmin();
  const { estado } = await searchParams;
  // Default view: what still needs an answer. "todas" shows everything.
  const filter = estado === "todas" ? "todas" : ticketStatuses.includes(estado as TicketStatus) ? estado as TicketStatus : "abiertas";
  let query = client.from("support_tickets").select("id,reservation_id,asunto,mensaje,estado,respuesta,created_at,responded_at").order("created_at", { ascending: false }).limit(200);
  if (filter === "abiertas") query = query.in("estado", openTicketStatuses);
  else if (filter !== "todas") query = query.eq("estado", filter);
  const tickets = await query;
  const rows = tickets.data ?? [];
  const reservationIds = rows.map(row => String(row.reservation_id));
  const reservations = reservationIds.length ? await client.from("reservations").select("id,codigo,cliente_nombre,cliente_email").in("id", reservationIds) : { data: [] };
  const reservationMap = new Map((reservations.data ?? []).map(row => [String(row.id), row]));
  const items = [{ href: "/admin/tickets", label: "Por atender", current: filter === "abiertas" }, ...ticketStatuses.map(status => ({ href: `/admin/tickets?estado=${status}`, label: ticketLabel(status), current: filter === status })), { href: "/admin/tickets?estado=todas", label: "Todas", current: filter === "todas" }];

  return <>
    <PageHeader title="Solicitudes de soporte" description="Mensajes que los clientes envían desde «Mi reserva». La respuesta se muestra al cliente en su portal." />
    {tickets.error ? <p className="rounded-card border border-line bg-canvas p-6">La tabla de solicitudes todavía no está disponible. Ejecute el SQL indicado en docs/sql/support_tickets.sql.</p> : <>
      <FilterNav label="Filtrar solicitudes por estado" items={items} />
      {!rows.length ? <EmptyState title={filter === "abiertas" ? "No hay solicitudes por atender" : "No hay solicitudes en esta vista"} /> : <div className="space-y-4">{rows.map(row => {
        const reservation = reservationMap.get(String(row.reservation_id));
        return <article key={String(row.id)} className="rounded-card border border-line bg-canvas p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="t-small text-ink-soft">{reservation ? <Link className={textLink} href={`/admin/reservas/${row.reservation_id}`}>{String(reservation.codigo)}</Link> : "Reserva no disponible"} · {reservation?.cliente_nombre ?? "Cliente"} · {formatDay(String(row.created_at))}</p>
              <h2 className="t-h3 mt-1 break-words">{row.asunto}</h2>
            </div>
            <StatusBadge tone={ticketToneOf(String(row.estado))}>{ticketLabel(String(row.estado))}</StatusBadge>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words">{row.mensaje}</p>
          <TicketResponseForm id={String(row.id)} respuesta={row.respuesta as string | null} estado={String(row.estado)} />
        </article>;
      })}</div>}
    </>}
  </>;
}
