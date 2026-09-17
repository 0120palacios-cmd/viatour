import { pageMetadata } from "@/lib/seo";
import { getDestinations } from "@/lib/destinations";
import { ReviewForm } from "@/components/reviews/form";
export const metadata = pageMetadata("/opiniones/nueva", "viatour | Comparta su opini?n sobre su viaje desde Honduras", "Comparta su opini?n sobre su viaje desde Honduras con viatour. Consulte la información disponible y cuéntenos qué busca para recibir asesoría sobre su viaje.");
export default async function Page() {
  let destinations: string[] = [];
  let failed = false;
  try { destinations = [...new Set((await getDestinations()).map(item => item.nombre))]; } catch { failed = true; }
  return <main className="container-site py-14 sm:py-24"><div className="max-w-2xl space-y-8"><h1 className="t-h1">Comparta su opinión</h1>{failed && <p role="status" className="t-body text-ink-soft">No se pudieron cargar los destinos. Puede escribir el suyo en «Otro destino».</p>}<ReviewForm destinations={destinations} /></div></main>;
}
