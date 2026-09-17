import { Info } from "lucide-react";
import { legalContent, legalNotice } from "@/lib/legal-content";
import { CookiePreferences } from "@/components/cookie-consent";
export function LegalPage({ kind }: {
    kind: keyof typeof legalContent;
}) { const c = legalContent[kind]; return <main className="container-site py-14 sm:py-24"><article className="measure space-y-8"><h1 className="t-h1">{c.title}</h1><div role="note" className="flex gap-4 rounded-panel border bg-brand-tint p-6"><Info aria-hidden="true" className="shrink-0 text-brand" strokeWidth={1.75}/><p>{legalNotice}</p></div>{c.sections.map(title => <section key={title} className="space-y-4"><h2 className="t-h2">{title}</h2><p className="text-ink-soft">Sección pendiente del documento legal definitivo.</p></section>)}{kind === "cookies" && <CookiePreferences />}</article></main>; }
