import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localizedPageMetadata } from "@/lib/seo";
import { getFAQs, type FAQ } from "@/lib/faqs";
import { siteConfig } from "@/lib/site-config";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/components/home/sections";
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/preguntas-frecuentes", "faq"); }
function slug(value: string) { return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export default async function Page() {
  const t = await getTranslations("static"); const common = await getTranslations("common"); const home = await getTranslations("home");
  let faqs: FAQ[] = []; let failed = false; try { faqs = await getFAQs(); } catch { failed = true; }
  const groups = new Map<string, FAQ[]>(); for (const f of faqs) { const category = f.categoria?.trim() || "General"; groups.set(category, [...(groups.get(category) || []), f]); }
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })) };
  return <main>
    <div className="container-site">
      <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("faq"), href: "/preguntas-frecuentes" }]} title={common("faq")} intro={home("faqIntro")} />
      {siteConfig.showDraftNotices && <p className="t-small mb-8 text-ink-soft">{t("faqDraft")}</p>}
      {failed ? <p role="alert" className="rounded-panel border border-error/40 p-6">{t("faqLoadError")}</p> : !faqs.length ? <p role="status" className="rounded-panel border border-line bg-surface p-8">{t("faqEmpty")}</p> : <div className="grid items-start gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        {groups.size > 1 ? <nav aria-label={common("faq")} className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-28 lg:mx-0 lg:overflow-visible lg:px-0"><ul className="flex gap-2 lg:flex-col lg:gap-1">{Array.from(groups.keys(), category => <li key={category}><a href={`#${slug(category)}`} className="t-small flex min-h-11 items-center whitespace-nowrap rounded-btn border border-line px-4 hover:bg-surface lg:border-transparent">{category}</a></li>)}</ul></nav> : <div className="hidden lg:block" />}
        <div className="max-w-3xl space-y-12">{Array.from(groups, ([category, items]) => <section key={category} id={slug(category)} className="scroll-mt-28" aria-labelledby={`${slug(category)}-title`}><h2 id={`${slug(category)}-title`} className="t-h2 mb-2">{category}</h2><Accordion type="multiple">{items.map(f => <AccordionItem key={f.id} value={f.id}><AccordionTrigger>{f.pregunta}</AccordionTrigger><AccordionContent>{f.respuesta}</AccordionContent></AccordionItem>)}</Accordion></section>)}</div>
      </div>}
    </div>
    <FinalCta />
    {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
  </main>;
}
