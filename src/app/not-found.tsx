import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localizedPageMetadata } from "@/lib/seo";
export async function generateMetadata(): Promise<Metadata> { return { ...(await localizedPageMetadata("/404", "home")), alternates: { canonical: null }, robots: { index: false, follow: true } }; }
export default function NotFound() { const t = useTranslations("static"); return <main className="container-site space-y-6 py-14 sm:py-24"><h1 className="t-h1">{t("notFound")}</h1><p className="t-body text-ink-soft">{t("notFoundBody")}</p><Link className="text-brand underline" href="/">{t("notFoundHome")}</Link></main>; }
