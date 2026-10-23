import { localizedPath } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import type { TripLinks } from "@/components/trip/trip-ui";

// The signed-in customer's links. Every one is scoped by the session cookie on the server; none carries a
// reservation ID. Pages keep the visitor's language (/en/...); API routes are language-neutral.
export function customerLinks(locale: Locale): TripLinks {
  return {
    itinerary: "/api/mi-reserva/itinerario?inline=1",
    calendar: "/api/mi-reserva/itinerario?format=ics",
    confirmation: "/api/mi-reserva/pdf?inline=1",
    messages: localizedPath("/mi-reserva/mensajes", locale),
    receipt: id => `/api/mi-reserva/recibos/${id}?inline=1`,
    document: path => `/api/mi-reserva/documentos?ruta=${encodeURIComponent(path)}`,
    section: section => localizedPath(section === "resumen" ? "/mi-reserva" : `/mi-reserva/${section}`, locale),
    services: "/api/mi-reserva/servicios",
    feedback: "/api/mi-reserva/opinion",
  };
}
