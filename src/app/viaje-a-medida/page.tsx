import { pageMetadata } from "@/lib/seo";
import { ServicePage } from "@/components/services/service-page";

export const metadata = pageMetadata("/viaje-a-medida", "viatour | Viajes a la medida desde Honduras", "Diseñamos un viaje completamente personalizado desde Honduras: vuelos, hoteles, tours y traslados, según sus gustos, su presupuesto y su tiempo.");

export default function Page() {
  return <ServicePage
    path="/viaje-a-medida"
    breadcrumbLabel="Viaje a medida"
    title="Viajes a la medida"
    intro="¿Tiene un viaje en mente? Diseñamos un itinerario completamente personalizado (vuelos, hoteles, tours y traslados) según sus gustos, su presupuesto y su tiempo. Cuéntenos qué sueña y lo hacemos realidad."
    defaultTab="medida"
    help={["Escuchamos qué busca y para cuándo.", "Armamos un itinerario a su medida.", "Ajustamos cada detalle con usted por WhatsApp."]}
  />;
}
