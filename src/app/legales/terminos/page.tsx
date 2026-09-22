import type { Metadata } from "next";
import { localizedPageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export async function generateMetadata(): Promise<Metadata> { return { ...(await localizedPageMetadata("/legales/terminos", "terms")), robots: { index: false, follow: true } }; }
export default function Page() { return <LegalPage kind="terminos" />; }
