import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
export const metadata: Metadata = { title: "Cancelaciones — pendiente de revisión", robots: { index: false, follow: true }, alternates: { canonical: "/legales/cancelaciones" } };
export default function Page() { return <LegalPage kind="cancelaciones"/>; }
