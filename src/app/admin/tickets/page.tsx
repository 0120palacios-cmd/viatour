import { MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { TicketResponseForm } from "@/components/admin/ticket-response-form";
import { noindexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noindexMetadata("viatour | Solicitudes de soporte", "Gestión privada de solicitudes de soporte vinculadas a reservas de viatour.");
export default async function TicketsPage() {
  const { client } = await requireAdmin();
  const tickets = await client.from("support_tickets").select("id,reservation_id,asunto,mensaje,estado,respuesta,created_at,responded_at").order("created_at", { ascending: false }).limit(200);
  const rows = tickets.data ?? [];
  const reservationIds = rows.map(row => String(row.reservation_id));
  const reservations = reservationIds.length ? await client.from("reservations").select("id,codigo,cliente_nombre,cliente_email").in("id", reservationIds) : { data: [] };
  const reservationMap = new Map((reservations.data ?? []).map(row => [String(row.id), row]));
  return <div className="space-y-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="t-h1">Solicitudes de soporte</h1><p className="mt-2 text-ink-soft">Consulte y responda solicitudes vinculadas a una reserva.</p></div><MessageSquare className="text-brand" size={34} strokeWidth={1.75} aria-hidden="true" /></header>{tickets.error ? <p className="rounded-card border border-line bg-surface p-6">La tabla de solicitudes todavía no está disponible. Ejecute el SQL indicado en docs/sql/support_tickets.sql.</p> : !rows.length ? <p className="rounded-card border border-line bg-surface p-6">No hay solicitudes.</p> : <div className="space-y-6">{rows.map(row => { const reservation = reservationMap.get(String(row.reservation_id)); return <article key={String(row.id)} className="rounded-card border border-line bg-canvas p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="t-small text-ink-soft">{reservation?.codigo ?? "Reserva no disponible"} · {reservation?.cliente_nombre ?? "Cliente"}</p><h2 className="t-h3 mt-2">{row.asunto}</h2><p className="mt-3 whitespace-pre-wrap break-words">{row.mensaje}</p></div><span className="rounded-btn bg-brand-tint px-3 py-1 t-small text-brand-deep">{row.estado}</span></div><TicketResponseForm id={String(row.id)} respuesta={row.respuesta as string | null} estado={String(row.estado)} /></article>; })}</div>}</div>;
}
