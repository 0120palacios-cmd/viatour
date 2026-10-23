import type { Metadata } from "next";
import { headers } from "next/headers";
import { Download, FileText, MessageCircle } from "lucide-react";
import { openSharedQuotation } from "@/lib/quotation-link";
import { rateLimit } from "@/lib/public-security";
import { formatQuotationAmount } from "@/lib/quotation-types";
import { siteConfig } from "@/lib/site-config";

// The secure link a customer receives by WhatsApp: the frozen version that was shared, with its PDF.
// Copy on this page is a draft pending the owner's approval.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Su cotización | viatour" }, robots: { index: false, follow: false }, referrer: "no-referrer" };

const dateTime = new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeStyle: "short", timeZone: "America/Tegucigalpa" });
const whatsapp = (text: string) => `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
const waButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-btn bg-wa px-5 font-semibold text-ink hover:bg-wa-deep";
const ghost = "inline-flex min-h-12 items-center justify-center gap-2 rounded-btn border border-line bg-canvas px-5 font-semibold text-ink hover:border-brand hover:text-brand";

export default async function SharedQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limited = await rateLimit(new Request("https://viatour.local/cotizacion", { headers: await headers() }), "quotation-link", 120);
  const shared = limited ? { state: "unavailable" as const } : await openSharedQuotation(token, { countOpening: true });

  if (shared.state !== "ok") return <main className="container-site py-16 sm:py-24">
    <div className="mx-auto max-w-xl space-y-4 rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8">
      <h1 className="t-h2">{shared.state === "expired" ? "Este enlace venció" : "Este enlace no está disponible"}</h1>
      <p className="t-body text-ink-soft">{limited ? "No se pudo abrir el enlace en este momento. Inténtelo nuevamente más adelante." : "Si necesita su cotización, escríbanos por WhatsApp y su asesor se la compartirá de nuevo."}</p>
      <a className={waButton} href={whatsapp("Hola, necesito que me compartan de nuevo mi cotización.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={2} aria-hidden="true" />Escríbanos por WhatsApp</a>
    </div>
  </main>;

  const { record, replaced } = shared;
  const { quotation } = record;
  const pdf = `/cotizacion/${token}/pdf`;
  const destino = quotation.destino && quotation.destino !== "Por definir" ? quotation.destino : "";
  return <main className="container-site py-12 sm:py-20">
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="t-small text-ink-soft">Cotización {quotation.codigo}</p>
        <h1 className="t-h1">{destino ? `Su viaje a ${destino}` : "Su cotización de viaje"}</h1>
        <p className="t-body text-ink-soft">Preparada para {quotation.cliente_nombre}.</p>
      </header>
      {replaced ? <p role="status" className="rounded-card border border-line bg-brand-tint p-4 text-ink">Existe una versión más reciente de esta cotización. Consulte a su asesor antes de continuar.</p> : null}
      <section aria-label="Resumen" className="space-y-4 rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="t-small text-ink-soft">Total referencial</dt><dd className="t-h2">{formatQuotationAmount(Number(quotation.total), quotation.moneda)}</dd></div>
          <div><dt className="t-small text-ink-soft">Válida hasta</dt><dd className="t-body font-semibold">{dateTime.format(new Date(record.expiry))} (hora de Honduras)</dd></div>
        </dl>
        <p className="t-small text-ink-soft">Los precios son referenciales y están sujetos a confirmación. El detalle completo de servicios, condiciones y pagos está en el PDF.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a className={ghost} href={`${pdf}?inline=1`} target="_blank" rel="noopener noreferrer"><FileText size={20} strokeWidth={1.75} aria-hidden="true" />Ver cotización (PDF)</a>
          <a className={ghost} href={pdf} download><Download size={20} strokeWidth={1.75} aria-hidden="true" />Descargar PDF</a>
        </div>
      </section>
      <section aria-label="Contacto" className="space-y-3 rounded-panel border border-line bg-surface p-6">
        <p className="t-body">¿Tiene preguntas o desea continuar con su reserva? Su asesor le atiende por WhatsApp.</p>
        <a className={waButton} href={whatsapp(`Hola, tengo una consulta sobre la cotización ${quotation.codigo}.`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={2} aria-hidden="true" />Escríbanos por WhatsApp</a>
      </section>
    </div>
  </main>;
}
