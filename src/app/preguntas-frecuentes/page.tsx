import { pageMetadata } from "@/lib/seo";
import { getFAQs, type FAQ } from "@/lib/faqs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
export const metadata = pageMetadata("/preguntas-frecuentes", "viatour | Preguntas frecuentes sobre viajes desde Honduras", "Preguntas frecuentes sobre viajes desde Honduras con viatour. Consulte la información disponible y cuéntenos qué busca para recibir asesoría sobre su viaje.");
export default async function Page() { let faqs: FAQ[] = []; let failed = false; try {
    faqs = await getFAQs();
}
catch {
    failed = true;
} const groups = new Map<string, FAQ[]>(); for (const f of faqs) {
    const c = f.categoria?.trim() || "General";
    groups.set(c, [...(groups.get(c) || []), f]);
} const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })) }; return <main className="container-site py-14 sm:py-24"><h1 className="t-h1 mb-8">Preguntas frecuentes</h1><p className="t-small mb-8 text-ink-soft">Contenido en borrador, pendiente de revisión y aprobación.</p>{failed ? <p role="alert">No se pudieron cargar las preguntas frecuentes. Inténtelo nuevamente.</p> : !faqs.length ? <p className="rounded-panel border bg-surface p-8">Aún no hay preguntas frecuentes publicadas.</p> : <div className="measure space-y-12">{Array.from(groups, ([category, items]) => <section key={category}><h2 className="t-h2 mb-4">{category}</h2><Accordion type="multiple">{items.map(f => <AccordionItem key={f.id} value={f.id}><AccordionTrigger>{f.pregunta}</AccordionTrigger><AccordionContent>{f.respuesta}</AccordionContent></AccordionItem>)}</Accordion></section>)}</div>}{faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\u003c") }}/>}</main>; }
