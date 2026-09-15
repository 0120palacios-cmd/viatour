import Link from "next/link";
import { ArrowUpRight, MessageSquare, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { FlightTool } from "@/components/home/flight-tool";
import { QuoteButton } from "@/components/home/quote-button";
import { featuredDestinations } from "@/lib/destinations";

function PhotoPlaceholder({ destination }: { destination: string }) {
  return <div role="img" aria-label={`Espacio reservado para una fotografía de ${destination}`} className="aspect-[4/3] bg-surface" />;
}

export function Hero() {
  // Copy pendiente de aprobación final
  return <section className="bg-surface py-14 sm:py-24" aria-labelledby="hero-title"><div className="container-site space-y-12">
    <div className="max-w-4xl space-y-6"><h1 id="hero-title" className="t-display">Su próximo viaje empieza con una conversación.</h1><p className="t-body-lg measure text-ink-soft">En viatour lo asesora una persona real, de principio a fin. Cuéntenos qué busca y le preparamos opciones a su medida: vuelos, hoteles, paquetes o un viaje completamente personalizado.</p></div>
    <FlightTool />
  </div></section>;
}

export function FeaturedDestinations() {
  // Copy pendiente de aprobación final
  return <section className="container-site py-14 sm:py-24" aria-labelledby="destinations-title"><div className="mb-8 space-y-4"><h2 id="destinations-title" className="t-h2">Destinos destacados</h2><p className="t-body-lg measure text-ink-soft">Destinos que los viajeros hondureños están descubriendo con nosotros.</p></div>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featuredDestinations.map(destination => <Link key={destination.slug} href={`/destinos/${destination.slug}`} className="group overflow-hidden rounded-card border border-line transition-shadow duration-(--duration-fast) ease-out hover:shadow-md"><PhotoPlaceholder destination={destination.name} /><div className="flex items-center justify-between gap-4 p-6"><h3 className="t-h3">{destination.name}</h3><ArrowUpRight size={24} strokeWidth={1.75} className="text-brand" aria-hidden="true" /></div></Link>)}</div>
  </section>;
}

export function FeaturedPackages() {
  // Copy pendiente de aprobación final
  // Paquetes reales y precios se cargan en la Etapa 4 — no inventar datos
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="packages-title"><div className="container-site"><div className="mb-8 space-y-4"><h2 id="packages-title" className="t-h2">Paquetes destacados</h2><p className="t-body-lg measure text-ink-soft">Algunas ideas para inspirarse. Cada viaje se ajusta a su presupuesto y a sus fechas.</p></div>
    <div className="grid gap-6 md:grid-cols-3">{featuredDestinations.slice(0, 3).map(destination => <article key={destination.slug} className="overflow-hidden rounded-card border border-line bg-canvas"><PhotoPlaceholder destination={destination.name} /><div className="space-y-4 p-6"><h3 className="t-h3">Paquete a {destination.name}</h3><p className="t-small text-ink-soft">Precio referencial — pídanos su cotización</p><QuoteButton payload={{ service: "Paquetes", fields: { Destino: destination.name } }}>Solicitar cotización</QuoteButton></div></article>)}</div>
    <Link href="/paquetes" className="t-small mt-8 inline-flex items-center gap-2 text-brand underline underline-offset-4">Paquetes<ArrowUpRight size={16} aria-hidden="true" /></Link>
  </div></section>;
}

export function WhyViatour() {
  // Copy pendiente de aprobación final
  const items = [
    { icon: MessageSquare, title: "Una persona real lo asesora", body: "Habla con un asesor que lo escucha y lo guía, no con un sistema automático." },
    { icon: SlidersHorizontal, title: "Opciones a su medida", body: "Armamos vuelos, hoteles y paquetes según lo que usted busca." },
    { icon: ShieldCheck, title: "Con claridad y confianza", body: "Le explicamos cada detalle para que reserve tranquilo." },
  ];
  return <section className="container-site py-14 sm:py-24" aria-labelledby="why-title"><h2 id="why-title" className="t-h2 mb-12 text-center">Por qué viatour</h2><div className="grid gap-8 md:grid-cols-3">{items.map(({ icon: Icon, title, body }) => <div key={title} className="space-y-4"><Icon size={32} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><h3 className="t-h3">{title}</h3><p className="t-body text-ink-soft">{body}</p></div>)}</div></section>;
}

export function ReviewsTeaser() {
  // Copy pendiente de aprobación final
  // Opiniones reales llegan en la Etapa 6
  return <section className="bg-surface py-14 sm:py-24" aria-labelledby="reviews-title"><div className="container-site grid gap-8 md:grid-cols-2 md:items-center"><div className="space-y-4"><h2 id="reviews-title" className="t-h2">Opiniones</h2><p className="t-body-lg text-ink-soft">Lo que dicen quienes ya viajaron con nosotros.</p><Link href="/opiniones" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4">Opiniones<ArrowUpRight size={16} aria-hidden="true" /></Link></div><div className="rounded-panel border border-line bg-canvas p-8"><p className="t-body text-ink-soft">Aún no hay opiniones publicadas.</p></div></div></section>;
}

export function FinalCta() {
  // Copy pendiente de aprobación final
  return <section className="container-site py-14 text-center sm:py-24" aria-labelledby="cta-title"><div className="space-y-6"><h2 id="cta-title" className="t-h2">¿Listo para planificar su viaje?</h2><p className="t-body-lg text-ink-soft">Escríbanos y empecemos a armar su viaje ideal.</p><QuoteButton payload={{ service: "Viaje a medida", fields: {} }}>Escríbanos por WhatsApp</QuoteButton></div></section>;
}
