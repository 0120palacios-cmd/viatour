import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

// Texto funcional en borrador, pendiente de aprobación editorial.
export const metadata = {
  ...pageMetadata("/404", "viatour | Página no disponible", "La página que busca no está disponible. Consulte nuestros servicios de viaje desde Honduras o vuelva al inicio de viatour."),
  alternates: { canonical: null },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <main className="container-site space-y-6 py-14 sm:py-24"><h1 className="t-h1">Página no disponible</h1><Link className="text-brand underline" href="/">Volver al inicio</Link></main>;
}
