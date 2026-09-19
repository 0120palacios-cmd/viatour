import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Compass, Hotel, MessageSquare, Package, Plane, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/blog/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getFAQs, type FAQ } from "@/lib/faqs";
import { getReviews } from "@/lib/reviews";
import { RatingSummary, ReviewCards, ReviewSkeletons } from "@/components/reviews/display";
import { getPackages } from "@/lib/packages";
import { PackageGrid, PackageSkeletons } from "@/components/packages/package-card";
import { getDestinations } from "@/lib/destinations";
import { homeDestinations } from "@/lib/home-destinations";
import { FlightTool } from "@/components/home/flight-tool";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { QuoteButton } from "@/components/home/quote-button";

async function FeaturedDestinationData() {
  let destinationSlugs = new Set<string>();
  try {
    const items = await getDestinations();
    destinationSlugs = new Set(items.map(item => item.slug));
  } catch {
    // The local launch catalogue remains useful when the CMS is unavailable.
  }

  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{homeDestinations.map(destination => {
    const href = destinationSlugs.has(destination.slug) ? `/destinos/${destination.slug}` : "/destinos";
    return <Link key={destination.slug} href={href} className="group block overflow-hidden rounded-card border border-line bg-canvas shadow-sm transition-shadow duration-(--duration-fast) ease-out hover:shadow-md">
      <div className="relative aspect-[4/3] bg-surface"><Image src={destination.image} alt={`Fotografía de un viaje a ${destination.nombre}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /></div>
      <div className="flex items-center justify-between gap-4 p-6"><h3 className="t-h3">{destination.nombre}</h3><ArrowUpRight size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /></div>
    </Link>;
  })}</div>;
}

export function Hero() {
  return <HeroBackdrop><div className="container-site space-y-8 sm:space-y-12">
    <div className="relative max-w-3xl space-y-6 py-6 text-canvas">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-4 inset-y-0 -z-10 rounded-panel bg-linear-to-r from-ink/85 via-ink/75 to-ink/65 opacity-0 group-data-[photo=true]/hero:opacity-100 sm:-inset-x-6" />
      <h1 id="hero-title" className="t-display">Su próximo viaje empieza con una conversación.</h1><p className="t-body-lg measure">En viatour lo asesora una persona real, de principio a fin. Cuéntenos qué busca y le preparamos opciones a su medida: vuelos, hoteles, paquetes o un viaje completamente personalizado.</p>
    </div>
    <FlightTool compact />
  </div></HeroBackdrop>;
}

export function HowItWorks() {
  const steps = [
    { number: "01", icon: MessageSquare, title: "Cuéntenos qué busca", body: "Comparta con nosotros el destino, las fechas y lo que espera de su viaje." },
    { number: "02", icon: SlidersHorizontal, title: "Le preparamos opciones a su medida", body: "Revisamos sus necesidades y armamos alternativas para que usted las conozca." },
    { number: "03", icon: ShieldCheck, title: "Reserve con confianza", body: "Le explicamos cada detalle para que tome su decisión con tranquilidad." },
  ];
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="how-title"><div className="container-site"><div className="mb-12 max-w-2xl space-y-4"><h2 id="how-title" className="t-h2">Cómo funciona</h2><p className="t-body-lg text-ink-soft">Planificar su viaje con asesoría personal puede ser sencillo.</p></div><div className="grid gap-6 md:grid-cols-3">{steps.map(({ number, icon: Icon, title, body }) => <article key={title} className="rounded-card border border-line bg-canvas p-6 shadow-sm"><div className="mb-8 flex items-center justify-between"><Icon size={28} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><span className="t-small text-ink-soft">{number}</span></div><h3 className="t-h3 mb-4">{title}</h3><p className="t-body text-ink-soft">{body}</p></article>)}</div></div></section>;
}

export function FeaturedDestinations() {
  return <section className="container-site py-14 sm:py-24" aria-labelledby="destinations-title"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-4"><h2 id="destinations-title" className="t-h2">Destinos</h2><p className="t-body-lg measure text-ink-soft">Conozca algunos de los destinos que puede planificar con asesoría de viatour.</p></div><Link href="/destinos" className="t-small inline-flex items-center gap-2 self-start text-brand underline underline-offset-4 sm:self-auto">Ver todos los destinos<ArrowUpRight size={16} aria-hidden="true" /></Link></div><Suspense fallback={<DestinationCardSkeletons />}><FeaturedDestinationData /></Suspense></section>;
}

function DestinationCardSkeletons() {
  return <div role="status" aria-label="Cargando destinos" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><span className="sr-only">Cargando destinos</span>{homeDestinations.slice(0, 3).map(destination => <div key={destination.slug} aria-hidden="true" className="overflow-hidden rounded-card border border-line bg-canvas motion-safe:animate-pulse"><div className="aspect-[4/3] bg-surface" /><div className="h-8 bg-canvas p-6" /></div>)}</div>;
}

async function FeaturedPackageData() {
  let items;
  try {
    items = await getPackages(true);
  } catch {
    return <p role="alert" className="t-body rounded-panel border border-line bg-canvas p-8 text-ink-soft">No se pudieron cargar los paquetes. Por favor, visite la página de paquetes para volver a intentarlo.</p>;
  }
  return <PackageGrid items={items} />;
}

export function FeaturedPackages() {
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="packages-title"><div className="container-site"><div className="mb-8 space-y-4"><h2 id="packages-title" className="t-h2">Paquetes destacados</h2><p className="t-body-lg measure text-ink-soft">Algunas ideas para inspirarse. Cada viaje se ajusta a su presupuesto y a sus fechas.</p></div><Suspense fallback={<PackageSkeletons />}><FeaturedPackageData /></Suspense><Link href="/paquetes" className="t-small mt-8 inline-flex items-center gap-2 text-brand underline underline-offset-4">Paquetes<ArrowUpRight size={16} aria-hidden="true" /></Link></div></section>;
}

export function Services() {
  const services = [
    { icon: Plane, title: "Vuelos", body: "Le ayudamos a encontrar opciones para su ruta y sus fechas.", href: "/vuelos" },
    { icon: Hotel, title: "Hoteles", body: "Consulte alternativas de hospedaje para su viaje.", href: "/hoteles" },
    { icon: Package, title: "Paquetes", body: "Conozca propuestas de viaje listas para ajustar a sus planes.", href: "/paquetes" },
    { icon: Compass, title: "Viaje a medida", body: "Cuéntenos su idea y planifiquemos cada parte con usted.", href: "/viaje-a-medida" },
  ];
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="services-title"><div className="container-site"><div className="mb-12 space-y-4"><h2 id="services-title" className="t-h2">Servicios</h2><p className="t-body-lg measure text-ink-soft">Elija cómo quiere empezar a planificar su próximo viaje.</p></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{services.map(({ icon: Icon, title, body, href }) => <Link key={title} href={href} className="group rounded-card border border-line bg-canvas p-6 shadow-sm transition-shadow duration-(--duration-fast) ease-out hover:shadow-md"><Icon size={28} strokeWidth={1.75} className="mb-8 text-brand" aria-hidden="true" /><h3 className="t-h3 mb-3">{title}</h3><p className="t-body text-ink-soft">{body}</p><span className="t-small mt-6 inline-flex items-center gap-2 text-brand underline underline-offset-4">Conozca más<ArrowUpRight size={16} aria-hidden="true" /></span></Link>)}</div></div></section>;
}

export function WhyViatour() {
  const items = [
    { icon: MessageSquare, title: "Una persona real lo asesora", body: "Habla con un asesor que lo escucha y lo guía, no con un sistema automático." },
    { icon: SlidersHorizontal, title: "Opciones a su medida", body: "Armamos vuelos, hoteles y paquetes según lo que usted busca." },
    { icon: ShieldCheck, title: "Con claridad y confianza", body: "Le explicamos cada detalle para que reserve tranquilo." },
  ];
  return <section className="container-site py-14 sm:py-24" aria-labelledby="why-title"><h2 id="why-title" className="t-h2 mb-12 text-center">Por qué viatour</h2><div className="grid gap-8 md:grid-cols-3">{items.map(({ icon: Icon, title, body }) => <div key={title} className="space-y-4"><Icon size={32} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><h3 className="t-h3">{title}</h3><p className="t-body text-ink-soft">{body}</p></div>)}</div></section>;
}

async function ReviewTeaserData() {
  let result;
  try {
    result = await getReviews(3);
  } catch { return <p role="alert" className="t-body text-ink-soft">No se pudieron cargar las opiniones. <Link href="/opiniones" className="text-brand underline">Ver opiniones</Link></p>; }
  const { summary, reviews } = result;
  if (!summary.total) return <div className="rounded-panel border border-line bg-canvas p-8"><p className="t-body text-ink-soft">Aún no hay opiniones publicadas.</p></div>;
  return <div className="space-y-8"><RatingSummary summary={summary} compact /><ReviewCards reviews={reviews} /></div>;
}

export function ReviewsTeaser() {
  return <section className="bg-surface py-14 sm:py-24" aria-labelledby="reviews-title"><div className="container-site grid gap-8 md:grid-cols-2 md:items-center"><div className="space-y-4"><h2 id="reviews-title" className="t-h2">Opiniones</h2><p className="t-body-lg text-ink-soft">Lo que dicen quienes ya viajaron con nosotros.</p><Link href="/opiniones" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4">Opiniones<ArrowUpRight size={16} aria-hidden="true" /></Link></div><Suspense fallback={<ReviewSkeletons />}><ReviewTeaserData /></Suspense></div></section>;
}

export function TravelGuides() {
  return <Suspense fallback={null}><TravelGuidesContent /></Suspense>;
}

async function TravelGuidesContent() {
  let posts;
  try { posts = await getBlogPosts(); } catch { return null; }
  if (!posts.length) return null;
  return <section className="container-site py-14 sm:py-24" aria-labelledby="guides-title"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-4"><div className="flex items-center gap-3"><BookOpen size={24} strokeWidth={1.75} className="text-brand" aria-hidden="true" /><h2 id="guides-title" className="t-h2">Guías de viaje</h2></div><p className="t-body-lg measure text-ink-soft">Ideas e información para ayudarle a planificar su próximo viaje.</p></div><Link href="/blog" className="t-small inline-flex items-center gap-2 self-start text-brand underline underline-offset-4 sm:self-auto">Ver todas las guías<ArrowUpRight size={16} aria-hidden="true" /></Link></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.slice(0, 3).map(post => <BlogCard key={post.id} post={post} />)}</div></section>;
}

export function FrequentlyAskedQuestions() {
  return <Suspense fallback={null}><FrequentlyAskedQuestionsContent /></Suspense>;
}

async function FrequentlyAskedQuestionsContent() {
  let faqs: FAQ[];
  try { faqs = await getFAQs(); } catch { return null; }
  if (!faqs.length) return null;
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="faq-title"><div className="container-site grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16"><div className="space-y-4"><h2 id="faq-title" className="t-h2">Preguntas frecuentes</h2><p className="t-body-lg text-ink-soft">Consulte algunas respuestas antes de comenzar a planificar su viaje.</p><Link href="/preguntas-frecuentes" className="t-small inline-flex items-center gap-2 text-brand underline underline-offset-4">Ver todas las preguntas<ArrowUpRight size={16} aria-hidden="true" /></Link></div><Accordion type="single" collapsible className="w-full">{faqs.slice(0, 5).map(faq => <AccordionItem key={faq.id} value={faq.id}><AccordionTrigger>{faq.pregunta}</AccordionTrigger><AccordionContent>{faq.respuesta}</AccordionContent></AccordionItem>)}</Accordion></div></section>;
}

export function FinalCta() {
  return <section className="container-site py-14 text-center sm:py-24" aria-labelledby="cta-title"><div className="space-y-6"><h2 id="cta-title" className="t-h2">¿Listo para planificar su viaje?</h2><p className="t-body-lg text-ink-soft">Escríbanos y empecemos a armar su viaje ideal.</p><QuoteButton payload={{ service: "Viaje a medida", fields: {} }}>Escríbanos por WhatsApp</QuoteButton></div></section>;
}
