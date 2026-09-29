import { siteConfig } from "@/lib/site-config";
import type { Locale } from "@/i18n/config";

export const mainLinks = [
  { key: "home", href: "/" },
  { key: "destinations", href: "/destinos" },
  { key: "discover", href: "/descubrir" },
  { key: "reviews", href: "/opiniones" },
  { key: "blog", href: "/blog" },
  { key: "about", href: "/nosotros" },
  { key: "contact", href: "/contacto" },
] as const;

export const reservationLink = { key: "reservation", href: "/mi-reserva" } as const;

export const serviceLinks = [
  { key: "flights", href: "/vuelos" },
  { key: "hotels", href: "/hoteles" },
  { key: "packages", href: "/paquetes" },
  { key: "customTrip", href: "/viaje-a-medida" },
] as const;

export const legalLinks = [
  { key: "terms", href: "/legales/terminos" },
  { key: "privacy", href: "/legales/privacidad" },
  { key: "cancellations", href: "/legales/cancelaciones" },
  { key: "cookies", href: "/legales/cookies" },
] as const;

// Direct general contact (header, floating button, footer). Quote forms capture the lead first.
// `viewing` adds the page the visitor is on so the advisor starts with context (copy pendiente de aprobación).
export function whatsappHref(locale: Locale = "es", viewing?: string) {
  const base = locale === "en" ? "Hello, I would like advice about a trip." : "Hola, me gustaría recibir asesoría para un viaje.";
  const context = viewing?.trim().slice(0, 120);
  const message = context ? `${base} ${locale === "en" ? "I am looking at" : "Estoy viendo"}: ${context}` : base;
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}


