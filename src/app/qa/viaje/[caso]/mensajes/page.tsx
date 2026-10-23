import { notFound } from "next/navigation";
import { tripFixtures } from "@/lib/trip-fixtures";
import { fromMessages, fromRequests } from "@/lib/trip-chat";
import { TripChat } from "@/components/trip/trip-chat";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Local visual QA of the Mi viaje chat with anonymized fixtures (same gate as the fixture portal page).
// In customer mode messages and attachments go to the QA mock API, which validates and stores nothing.
export default async function TripChatFixturePage({ params, searchParams }: { params: Promise<{ caso: string }>; searchParams: Promise<{ modo?: string }> }) {
  if (process.env.NODE_ENV !== "development" && process.env.TRIP_FIXTURES !== "1") notFound();
  const caso = (await params).caso;
  const fixture = tripFixtures()[caso];
  if (!fixture) notFound();
  const initial = fixture.thread.available ? { source: "messages" as const, attachments: Boolean(fixture.thread.attachments), messages: fromMessages(fixture.thread.messages) } : { source: "requests" as const, attachments: false, messages: fromRequests(fixture.requests ?? []) };
  const mode = (await searchParams).modo === "cliente" ? "customer" : "preview";
  const api = `/qa/viaje/${caso}/api`;
  return <main className="container-site"><div className="mx-auto max-w-3xl"><TripChat mode={mode} initial={initial} reference={fixture.input.reservation.codigo} whatsappHref="#qa-whatsapp" backHref={`/qa/viaje/${caso}?modo=${mode === "customer" ? "cliente" : "preview"}`} endpoints={{ messages: `${api}/mensajes`, requests: `${api}/tickets`, attachments: `${api}/adjuntos` }} /></div></main>;
}
