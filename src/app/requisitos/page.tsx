import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { RequirementsChecker } from "@/components/requirements/requirements-checker";
import { localizedPageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/requisitos", "requirements"); }
export default function RequirementsPage() { const t = useTranslations("requirements"); return <main><section className="container-site section-space" aria-labelledby="requirements-page-title"><div className="mb-12 max-w-3xl space-y-6"><p className="t-small text-brand">{t("eyebrow")}</p><h1 id="requirements-page-title" className="t-h1">{t("title")}</h1><p className="t-body-lg text-ink-soft">{t("intro")}</p></div><RequirementsChecker /></section></main>; }
