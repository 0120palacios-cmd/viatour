import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { absoluteUrl, agencySchema } from "@/lib/seo";
import { FinalCta } from "@/components/home/sections";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/nosotros", "about"); }
export default function Page() { const t = useTranslations("static"); const schema = { "@context": "https://schema.org", "@type": "AboutPage", url: absoluteUrl("/nosotros"), about: { ...agencySchema, "@type": "TravelAgency", foundingDate: "2018" } }; return <main><div className="container-site section-space"><article className="measure space-y-8"><h1 className="t-h1">{t("aboutTitle")}</h1><p className="t-body-lg">{t("about1")}</p><p className="t-body-lg">{t("about2")}</p><p className="t-body-lg">{t("about3")}</p><p className="t-body-lg">{t("about4")}</p><p className="t-small"><strong>viatour — sueña, descubre, sonríe.</strong></p></article></div><FinalCta /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /></main>; }
