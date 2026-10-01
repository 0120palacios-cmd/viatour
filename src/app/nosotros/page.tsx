import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { absoluteUrl, agencyRef, websiteId } from "@/lib/seo";
import { FinalCta } from "@/components/home/sections";
import { BadgeCheck, CalendarCheck, MapPin, MonitorSmartphone, UserRound } from "lucide-react";
import { RatingBadge } from "@/components/reviews/rating-badge";
import { TrackedLink } from "@/components/tracked-link";
import { siteConfig } from "@/lib/site-config";

// Beside the approved text (unchanged): facts already stated elsewhere on the site, the live rating and
// the host-agency disclosure, so the page answers "who are they?" at a glance.
function AboutFacts() {
  const t = useTranslations();
  const facts = [{ icon: CalendarCheck, label: t("home.why6Title") }, { icon: UserRound, label: t("home.why1Title") }, { icon: MonitorSmartphone, label: t("home.why3Title") }, { icon: BadgeCheck, label: t("footer.iata") }];
  return <aside aria-label={t("common.about")} className="space-y-6 rounded-panel border border-line bg-surface p-6 sm:p-8 lg:sticky lg:top-28">
    <ul className="space-y-4">{facts.map(({ icon: Icon, label }) => <li key={label} className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-canvas text-brand shadow-sm"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="t-body pt-2 font-medium text-ink">{label}</span></li>)}</ul>
    <div className="space-y-2 border-t border-line pt-6"><RatingBadge /><TrackedLink event="google_profile_click" placement="about" href={siteConfig.googleProfileUrl} target="_blank" rel="noopener noreferrer" className="t-small flex min-h-11 items-center gap-2 text-brand underline underline-offset-4"><MapPin size={16} strokeWidth={1.75} aria-hidden="true" />{t("footer.googleProfile")}</TrackedLink></div>
  </aside>;
}

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/nosotros", "about"); }
export default function Page() { const t = useTranslations("static"); const schema = { "@context": "https://schema.org", "@type": "AboutPage", url: absoluteUrl("/nosotros"), about: agencyRef, mainEntity: agencyRef, isPartOf: { "@id": websiteId }, inLanguage: "es-HN" }; return <main><div className="container-site section-space grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16"><article className="measure space-y-8"><h1 className="t-h1">{t("aboutTitle")}</h1><p className="t-body-lg">{t("about1")}</p><p className="t-body-lg">{t("about2")}</p><p className="t-body-lg">{t("about3")}</p><p className="t-body-lg">{t("about4")}</p><p className="t-small"><strong>viatour — sueña, descubre, sonríe.</strong></p></article><AboutFacts /></div><FinalCta /><JsonLd data={schema} /></main>; }
