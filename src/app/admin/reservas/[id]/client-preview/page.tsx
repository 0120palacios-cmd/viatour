import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { loadChatSummary, loadTrip } from "@/lib/trip-data";
import { noindexMetadata } from "@/lib/seo";
import { TripPortal } from "@/components/trip/trip-portal";
import { tripSubpages, type TripLinks, type TripSubpage } from "@/components/trip/trip-ui";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return noindexMetadata("viatour | Vista como cliente", "Vista previa privada del portal del cliente."); }

// The customer's portal, rendered by the same component as /mi-reserva, from the admin session: no OTP is
// created or sent, no customer cookie is set, and customer-only actions are inert (no service request or
// feedback endpoint is given). Document links point to the admin routes of this reservation, so the owner
// can open exactly what the customer would open. Sections are chosen with ?seccion=.
export default async function AdminClientPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ seccion?: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const requested = (await searchParams).seccion ?? "";
  const section = (tripSubpages as readonly string[]).includes(requested) ? requested as TripSubpage : "resumen";
  const [trip, chat] = await Promise.all([loadTrip(client, id), loadChatSummary(client, id)]);
  if (!trip) notFound();
  const base = `/admin/reservas/${id}/client-preview`;
  const links: TripLinks = {
    itinerary: `/api/admin/reservas/${id}/itinerario?inline=1`,
    calendar: `/api/admin/reservas/${id}/itinerario?format=ics`,
    confirmation: `/api/admin/reservas/${id}/pdf?inline=1`,
    // The admin answers in the reservation page; the preview links there instead of the customer chat.
    messages: `/admin/reservas/${id}#mensajes`,
    receipt: receipt => `/api/admin/recibos/${receipt}?inline=1`,
    document: path => `/api/admin/reservas/${id}/documentos?ruta=${encodeURIComponent(path)}`,
    section: key => key === "resumen" || key === "mensajes" ? base : `${base}?seccion=${key}`,
  };
  return <div className="mx-auto max-w-6xl space-y-4">
    <Link href={`/admin/reservas/${id}`} className="t-small inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline">Volver a la reserva {trip.view.reference}</Link>
    <TripPortal trip={trip} mode="preview" section={section} links={links} chat={chat} />
  </div>;
}
