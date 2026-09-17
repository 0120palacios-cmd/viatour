import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { DestinationGrid, DestinationSkeletons } from "@/components/destinations/destination-card";
import { getDestinations } from "@/lib/destinations";

// Copy pendiente de aprobación final
export const metadata = pageMetadata("/destinos", "viatour | Destinos para su próximo viaje desde Honduras", "Destinos para su próximo viaje desde Honduras con viatour. Consulte la información disponible y cuéntenos qué busca para recibir asesoría sobre su viaje.");
async function Destinations() { return <DestinationGrid items={await getDestinations()} />; }
export default function Page() {
  // Copy pendiente de aprobación final
  return <main className="container-site space-y-12 py-14 sm:py-24"><header className="space-y-4"><h1 className="t-h1">Destinos</h1><p className="t-body-lg measure text-ink-soft">Explore los destinos que ofrecemos para viajeros hondureños.</p></header><section aria-labelledby="available-destinations"><h2 id="available-destinations" className="sr-only">Destinos disponibles</h2><Suspense fallback={<DestinationSkeletons />}><Destinations /></Suspense></section></main>;
}
