import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { loadTrip } from "@/lib/trip-data";
import { readThread } from "@/lib/reservation-messages";
import { noindexMetadata } from "@/lib/seo";
import { TripPortal, type TripLinks } from "@/components/trip/trip-portal";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return noindexMetadata("viatour | Vista como cliente", "Vista previa privada del portal del cliente."); }

// The customer's portal, rendered by the same component as /mi-reserva, from the admin session: no OTP is
// created or sent, no customer cookie is set, and customer-only actions are inert. Document links point to
// the admin routes of this reservation, so the owner can open exactly what the customer would open.
export default async function AdminClientPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const [trip, thread] = await Promise.all([loadTrip(client, id), readThread(client, id).catch(() => ({ available: false, messages: [] }))]);
  if (!trip) notFound();
  const links: TripLinks = {
    itinerary: `/api/admin/reservas/${id}/itinerario?inline=1`,
    calendar: `/api/admin/reservas/${id}/itinerario?format=ics`,
    confirmation: `/api/admin/reservas/${id}/pdf?inline=1`,
    receipt: receipt => `/api/admin/recibos/${receipt}?inline=1`,
    document: path => `/api/admin/reservas/${id}/documentos?ruta=${encodeURIComponent(path)}`,
  };
  return <div className="mx-auto max-w-6xl space-y-4">
    <Link href={`/admin/reservas/${id}`} className="t-small inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline">Volver a la reserva {trip.view.reference}</Link>
    <TripPortal trip={trip} mode="preview" links={links} thread={thread} stickyOffset="top-0" />
  </div>;
}
