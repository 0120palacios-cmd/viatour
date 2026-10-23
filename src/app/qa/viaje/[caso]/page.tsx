import { notFound } from "next/navigation";
import { buildTripView } from "@/lib/trip-view";
import { tripFixtures } from "@/lib/trip-fixtures";
import { destinationPhoto } from "@/lib/trip-data";
import { destinationContent } from "@/lib/trip-destination";
import { assembleTrip } from "@/lib/trip-model";
import { chatSummary, fromMessages, fromRequests } from "@/lib/trip-chat";
import { TripPortal } from "@/components/trip/trip-portal";
import { tripSubpages, type TripLinks, type TripSubpage } from "@/components/trip/trip-ui";
import destinations from "../../../../../data/destinations.json";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Local visual QA of the traveller portal with anonymized fixtures: no database, no session, no email.
// Destination content comes from data/destinations.json, the import source of the published table.
// Served by `next dev`, or by a local `next start` with TRIP_FIXTURES=1; production answers 404.
// ?modo=cliente|preview chooses the customer or admin view; ?seccion= one of Mi viaje's pages. In customer
// mode, service requests, feedback and the chat post to /qa/viaje/<caso>/api/*, which validate like the real
// routes and store nothing.
export default async function TripFixturePage({ params, searchParams }: { params: Promise<{ caso: string }>; searchParams: Promise<{ modo?: string; seccion?: string }> }) {
  if (process.env.NODE_ENV !== "development" && process.env.TRIP_FIXTURES !== "1") notFound();
  const caso = (await params).caso;
  const fixture = tripFixtures()[caso];
  if (!fixture) notFound();
  const query = await searchParams;
  const mode = query.modo === "cliente" ? "customer" : "preview";
  const section = (tripSubpages as readonly string[]).includes(query.seccion ?? "") ? query.seccion as TripSubpage : "resumen";
  const modo = mode === "customer" ? "cliente" : "preview";
  const base = `/qa/viaje/${caso}?modo=${modo}`;
  const links: TripLinks = {
    itinerary: `/qa/viaje/${caso}/itinerario.pdf`, calendar: "#qa-calendario", confirmation: `/qa/viaje/${caso}/confirmacion.pdf`,
    messages: `/qa/viaje/${caso}/mensajes?modo=${modo}`, receipt: id => `#qa-recibo-${id}`, document: path => `#qa-documento-${encodeURIComponent(path)}`,
    section: key => key === "resumen" || key === "mensajes" ? base : `${base}&seccion=${key}`,
    ...(mode === "customer" ? { services: `/qa/viaje/${caso}/api/servicios`, feedback: `/qa/viaje/${caso}/api/opinion` } : {}),
  };
  const content = destinationContent(fixture.input.reservation.destino, destinations);
  // The same photo rule as Mi viaje (public/destinos/<slug>.jpg, then the destination's own image, else the branded header).
  const photo = destinationPhoto(fixture.input.reservation.destino) ?? content.destination?.image ?? null;
  const trip = assembleTrip({ view: buildTripView(fixture.input), customerName: fixture.customerName, photo, hotelPhotos: {}, reservationId: fixture.input.reservation.id, ...content, requests: fixture.serviceRequests ?? [], feedback: fixture.feedback ?? null, today: fixture.input.today });
  const chat = fixture.thread.available ? chatSummary("messages", fromMessages(fixture.thread.messages)) : chatSummary("requests", fromRequests(fixture.requests ?? []));
  return <main className="container-site pb-24 pt-4 sm:pt-8"><div className="mx-auto max-w-6xl"><TripPortal trip={trip} mode={mode} section={section} links={links} chat={chat} /></div></main>;
}
