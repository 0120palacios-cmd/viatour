import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
export const metadata: Metadata = { title: "Términos — pendiente de revisión", robots: { index: false, follow: true }, alternates: { canonical: "/legales/terminos" } };
export default function Page() { return <LegalPage kind="terminos"/>; }
