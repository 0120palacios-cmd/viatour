import type { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import type { TripView } from "@/lib/trip-view";

// Shared pieces of the Mi viaje screens (customer portal, admin preview, local QA fixtures).

export type TripMode = "customer" | "preview";
export const tripSections = ["resumen", "itinerario", "viajeros", "documentos", "destino", "mensajes"] as const;
export type TripSection = (typeof tripSections)[number];
// Mi viaje's own pages, without the summary (which is /mi-reserva itself) and the chat (its own screen).
export const tripSubpages = ["itinerario", "viajeros", "documentos", "destino"] as const;
export type TripSubpage = (typeof tripSubpages)[number];

// Where everything opens. The customer portal points to /api/mi-reserva/* (session-scoped) and
// /mi-reserva/<section>; the admin preview to the admin routes of the same reservation; the QA fixtures to
// local placeholders and mock endpoints. No link ever carries a reservation ID chosen by the browser.
export type TripLinks = {
  itinerary: string; calendar: string; confirmation: string; messages: string;
  receipt: (id: string) => string; document: (path: string) => string;
  section: (section: TripSection) => string;
  // POST endpoints for additional-service requests and private feedback (absent in the admin preview).
  services?: string; feedback?: string;
};

export type T = Awaited<ReturnType<typeof getTranslations<"trip">>>;

export const primary = buttonVariants({ variant: "default" });
export const whatsapp = buttonVariants({ variant: "whatsapp" });
export const secondary = buttonVariants({ variant: "ghost" });
export const textLink = "t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline";
export const quietButton = "t-small inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn border border-line px-4 font-semibold text-brand transition-colors duration-(--duration-fast) hover:border-brand";
export const summaryClass = "flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 font-semibold text-ink [&::-webkit-details-marker]:hidden";
export const panel = "rounded-panel border border-line bg-canvas";

export function whatsappUrl(text: string) { return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`; }
export function capitalized(text: string) { return text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text; }
// "2022798865985" reads as "202 2798865985": the airline prefix apart, the number unchanged when copied.
export function ticketDisplay(number: string) { return /^\d{13}$/.test(number) ? `${number.slice(0, 3)} ${number.slice(3)}` : number; }
export const itineraryReady = (view: TripView) => view.documents.some(document => document.key === "itinerary" && document.status === "available");
export const hasStay = (view: TripView) => Boolean(view.hotels.length || view.services.length || view.ferries.length);

// In the admin preview, actions that only make sense for the customer (WhatsApp from their phone, sending,
// uploading, signing out) are shown but inert, so the layout matches without acting on the customer's behalf.
export function Action({ href, mode, customerOnly = false, external = false, className, children, label }: { href: string; mode: TripMode; customerOnly?: boolean; external?: boolean; className: string; children: React.ReactNode; label: string }) {
  if (mode === "preview" && customerOnly) return <span className={`${className} cursor-not-allowed opacity-60`} aria-disabled="true" title={label}>{children}</span>;
  return <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
}

export function SectionHeading({ id, title, children, level = 2 }: { id: string; title: string; children?: React.ReactNode; level?: 2 | 3 }) {
  const Heading = `h${level}` as "h2" | "h3";
  return <div className="space-y-1"><Heading id={id} className={level === 2 ? "t-h2" : "t-h3 text-ink"}>{title}</Heading>{children}</div>;
}
