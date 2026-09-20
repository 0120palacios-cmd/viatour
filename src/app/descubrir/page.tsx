import { pageMetadata } from "@/lib/seo";
import { getDestinations } from "@/lib/destinations";
import { getPackages } from "@/lib/packages";
import { DiscoveryAssistant } from "@/components/discovery/assistant";

export const metadata = pageMetadata("/descubrir", "viatour | Descubra su próximo destino", "Responda unas preguntas y conozca destinos recomendados según sus preferencias de viaje desde Honduras.");

export default async function DiscoverPage() {
  const [destinations, packages] = await Promise.all([getDestinations(), getPackages()]);
  return <main className="container-site py-14 sm:py-24"><header className="mb-12 max-w-3xl space-y-4"><p className="t-small text-brand">Una guía para empezar a planificar</p><h1 className="t-h1">Descubra su próximo destino</h1><p className="t-body-lg text-ink-soft">Cuéntenos qué busca en su próximo viaje. Sus respuestas nos ayudan a mostrarle destinos que pueden encajar con sus preferencias.</p></header><DiscoveryAssistant destinations={destinations.map(item => ({ id: item.id, slug: item.slug, nombre: item.nombre }))} packages={packages} /></main>;
}

