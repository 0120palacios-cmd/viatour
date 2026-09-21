import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
export const metadata: Metadata = { ...pageMetadata("/legales/terminos", "viatour | Términos de los viajes", "Términos y Condiciones de viatour para sus viajes desde Honduras."), robots: { index: false, follow: true } };
export default function Page() { return <LegalPage kind="terminos"/>; }
