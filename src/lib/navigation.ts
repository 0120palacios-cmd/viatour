import { siteConfig } from "@/lib/site-config";

export const mainLinks = [
  { label: "Inicio", href: "/" },
  { label: "Destinos", href: "/destinos" },
  { label: "Descubrir", href: "/descubrir" },
  { label: "Opiniones", href: "/opiniones" },
  { label: "Blog", href: "/blog" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
] as const;

export const reservationLink = { label: "Mi reserva", href: "/mi-reserva" } as const;

export const serviceLinks = [
  { label: "Vuelos", href: "/vuelos" },
  { label: "Hoteles", href: "/hoteles" },
  { label: "Paquetes", href: "/paquetes" },
  { label: "Viaje a medida", href: "/viaje-a-medida" },
] as const;

export const legalLinks = [
  { label: "Términos", href: "/legales/terminos" },
  { label: "Privacidad", href: "/legales/privacidad" },
  { label: "Cancelaciones", href: "/legales/cancelaciones" },
  { label: "Cookies", href: "/legales/cookies" },
] as const;

// Stage 2: direct general contact. Quote forms gain lead capture in a later stage.
export const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("Hola, me gustaría recibir asesoría para un viaje.")}`;
