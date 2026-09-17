import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
export const metadata: Metadata = { title: "Privacidad — pendiente de revisión", robots: { index: false, follow: true }, alternates: { canonical: "/legales/privacidad" } };
export default function Page() { return <LegalPage kind="privacidad"/>; }
