import { pageMetadata } from "@/lib/seo";
import { ServicePage } from "@/components/services/service-page";

export const metadata = pageMetadata("/vuelos", "viatour | Vuelos desde Honduras", "Le asesoramos para encontrar y reservar el mejor vuelo desde Honduras: ida y vuelta, solo ida o multidestino, en la clase que prefiera. Cotice con nosotros.");

export default function Page() {
  return <ServicePage
    path="/vuelos"
    breadcrumbLabel="Vuelos"
    title="Vuelos desde Honduras"
    intro="En viatour le ayudamos a encontrar y reservar el vuelo ideal para su viaje: ida y vuelta, solo ida o multidestino, en la clase que prefiera. Cuéntenos su ruta y le preparamos opciones a su medida."
    defaultTab="vuelos"
    help={["Comparamos rutas y tarifas de distintas aerolíneas.", "Le asesoramos según su presupuesto, sus fechas y su clase preferida.", "Coordinamos todo por WhatsApp con una persona real."]}
  />;
}
