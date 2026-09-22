import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { absoluteUrl, agencySchema } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/nosotros", "about"); }
export default function Page() { const t = useTranslations("static"); const schema = { "@context": "https://schema.org", "@type": "AboutPage", url: absoluteUrl("/nosotros"), about: { ...agencySchema, "@type": "TravelAgency", foundingDate: "2018" } }; return <main className="container-site py-14 sm:py-24"><article className="measure space-y-8"><h1 className="t-h1">{t("aboutTitle")}</h1><p className="t-body-lg">{t("about1")}</p><p className="t-body-lg">{t("about2")}</p><p className="t-body-lg">{t("about3")}</p><p className="t-body-lg">{t("about4")}</p><p className="t-small"><strong>viatour — sueña, descubre, sonríe.</strong></p></article><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /></main>; }
