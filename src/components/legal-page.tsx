import { legalContent } from "@/lib/legal-content";
import { legalContentEn } from "@/lib/legal-content-en";
import { CookiePreferences } from "@/components/cookie-consent";
import { useLocale, useTranslations } from "next-intl";
export function LegalPage({ kind }: {
    kind: keyof typeof legalContent;
}) { const locale = useLocale(); const t = useTranslations("legal"); const c = locale === "en" ? legalContentEn[kind] : legalContent[kind]; return <main className="container-site py-14 sm:py-24"><article className="measure space-y-8"><h1 className="t-h1">{c.title}</h1>{locale === "en" && <p className="t-small rounded-card border border-line bg-surface p-4">{t("draft")}</p>}{c.sections.map((section) => { const values = "title" in section ? [section.title, section.body] : section; const [title, body] = values; return <section key={title} className="space-y-4"><h2 className="t-h2">{title}</h2><p className="t-body text-ink-soft">{body}</p></section>; })}{kind === "cookies" && <CookiePreferences />}</article></main>; }
