import type { Metadata } from "next";
import { Suspense } from "react";
import { PackageGrid, PackageSkeletons } from "@/components/packages/package-card";
import { getPackages } from "@/lib/packages";

// Copy y metadatos pendientes de aprobación final.
export const metadata: Metadata = {
  title: { absolute: "viatour | Paquetes de viaje a su medida desde Honduras" },
  description: "Ideas de viaje listas para inspirarse. Cada paquete se ajusta a su presupuesto y a sus fechas. Solicite su cotización con nuestros asesores de viaje en Honduras.",
  alternates: { canonical: "/paquetes" },
};

async function Packages() {
  return <PackageGrid items={await getPackages()} />;
}
export default function Page() {
  return <main className="container-site space-y-12 py-14 sm:py-24"><header className="space-y-4"><h1 className="t-h1">Paquetes</h1>{/* Copy pendiente de aprobación final. */}<p className="t-body-lg measure text-ink-soft">Ideas de viaje listas para inspirarse. Cada paquete se ajusta a su presupuesto y a sus fechas.</p></header><section aria-label="Paquetes disponibles"><h2 className="sr-only">Paquetes disponibles</h2><Suspense fallback={<PackageSkeletons />}><Packages /></Suspense></section></main>;
}
