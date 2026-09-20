import { legalContent } from "@/lib/legal-content";
import { CookiePreferences } from "@/components/cookie-consent";
export function LegalPage({ kind }: {
    kind: keyof typeof legalContent;
}) { const c = legalContent[kind]; return <main className="container-site py-14 sm:py-24"><article className="measure space-y-8"><h1 className="t-h1">{c.title}</h1>{c.sections.map(({ title, body }) => <section key={title} className="space-y-4"><h2 className="t-h2">{title}</h2><p className="t-body text-ink-soft">{body}</p></section>)}{kind === "cookies" && <CookiePreferences />}</article></main>; }
