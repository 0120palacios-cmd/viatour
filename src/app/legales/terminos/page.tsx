import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
export const metadata: Metadata = { ...pageMetadata("/legales/terminos", "viatour | Términos de los viajes — pendiente de revisión", "Términos: contenido legal de viatour pendiente de revisión y aprobación. Consulte el estado del documento antes de planificar su viaje desde Honduras."), robots: { index: false, follow: true } };
export default function Page() { return <LegalPage kind="terminos"/>; }
