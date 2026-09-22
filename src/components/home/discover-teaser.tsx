import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DiscoverTeaser() {
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="discover-title">
    <div className="container-site">
      <div className="max-w-2xl space-y-6">
        <h2 id="discover-title" className="t-h2">Descubra su destino</h2>
        <p className="t-body-lg text-ink-soft">Responda unas preguntas y le sugerimos destinos y paquetes que encajan con lo que busca.</p>
        <Button asChild><Link href="/descubrir">Descubra su destino<ArrowUpRight size={20} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
      </div>
    </div>
  </section>;
}
