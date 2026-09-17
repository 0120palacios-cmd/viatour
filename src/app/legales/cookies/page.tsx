import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
export const metadata: Metadata = { title: "Cookies — pendiente de revisión", robots: { index: false, follow: true }, alternates: { canonical: "/legales/cookies" } };
export default function Page() { return <LegalPage kind="cookies"/>; }
