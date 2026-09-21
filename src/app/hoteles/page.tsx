import { pageMetadata } from "@/lib/seo";
import { ServicePage } from "@/components/services/service-page";

export const metadata = pageMetadata("/hoteles", "viatour | Hoteles para su viaje", "Reserve el hotel ideal para su viaje con la asesoría de viatour: le proponemos opciones según destino, fechas, huéspedes y presupuesto.");

export default function Page() {
  return <ServicePage
    path="/hoteles"
    breadcrumbLabel="Hoteles"
    title="Hoteles en su destino"
    intro="Reserve el hotel perfecto para su viaje. Le asesoramos según su destino, fechas, número de huéspedes y presupuesto, y le proponemos opciones que se ajustan a lo que busca."
    defaultTab="hoteles"
    help={["Seleccionamos hoteles según su presupuesto y ubicación.", "Le explicamos cada opción con claridad.", "Coordinamos su reserva por WhatsApp con una persona real."]}
  />;
}
