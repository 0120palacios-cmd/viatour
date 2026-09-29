import { trackEvent } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { siteConfig } from "@/lib/site-config";

export type QuotePayload = { turnstileToken?: string; website?: string; service: string; servicio?: string; locale?: "es" | "en"; fields: Record<string, string>; currency?: "USD" | "HNL"; formData?: Record<string, string>; segmento?: string };
export type QuoteResult = { referencia: string; href: string };

// Contact lines stay out of the WhatsApp text: the customer is writing from that number.
const privateFields = new Set(["Teléfono", "Email"]);

// Copy pendiente de aprobación final
export function composeQuote(payload: QuotePayload, referencia?: string) {
  const entries = Object.entries(payload.fields).filter(([label, value]) => value.trim() && !privateFields.has(label));
  if (payload.locale === "en" && payload.servicio === "Paquete") {
    const labels: Record<string, string> = { Paquete: "Package", Origen: "Origin", Destino: "Destination", Fechas: "Dates", Adultos: "Adults", Niños: "Children", Notas: "Notes", Nombre: "Name" };
    return ["I would like to request a quote. Please advise me on these options.", "Service: Package", ...entries.map(([label, value]) => `${labels[label] ?? label}: ${value}`), ...(referencia ? [`Reference: ${referencia}`] : [])].join("\n");
  }
  return ["Me gustaría solicitar una cotización. Por favor, asesóreme con estas opciones.", `Servicio: ${payload.service}`,
    ...entries.map(([label, value]) => `${label}: ${value}`),
    ...(referencia ? [`Referencia: ${referencia}`] : []),
  ].join("\n");
}

export function whatsappQuoteHref(payload: QuotePayload, referencia?: string) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(composeQuote(payload, referencia))}`;
}

export async function captureLead(payload: QuotePayload): Promise<{ id: string; referencia: string }> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, servicio: payload.servicio ?? payload.service, origen: getAttribution() }),
    // Bound the wait on an unavailable network; do not delay fast responses.
    signal: AbortSignal.timeout(30000),
    keepalive: true,
  });
  const result = await response.json();
  if (!response.ok || result?.ok !== true || typeof result.id !== "string") {
    throw new Error(`Lead capture failed (${response.status})`);
  }
  return { id: result.id, referencia: typeof result.referencia === "string" ? result.referencia : "" };
}

// Capture first; the caller shows the reference and the visitor opens WhatsApp with their own click.
export async function requestQuote(payload: QuotePayload): Promise<QuoteResult> {
  const { referencia } = await captureLead(payload);
  trackEvent("quote_submit", { service: payload.servicio || payload.service, status: "saved" });
  return { referencia, href: whatsappQuoteHref(payload, referencia) };
}
