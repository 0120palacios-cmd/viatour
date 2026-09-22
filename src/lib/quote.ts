import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/lib/site-config";

export type QuotePayload = { turnstileToken?: string; website?: string; service: string; servicio?: string; locale?: "es" | "en"; fields: Record<string, string>; currency?: "USD" | "HNL"; formData?: Record<string, string> };

// Copy pendiente de aprobación final
export function composeQuote(payload: QuotePayload) {
  if (payload.locale === "en" && payload.servicio === "Paquete") {
    const labels: Record<string, string> = { Paquete: "Package", Origen: "Origin", Destino: "Destination", Fechas: "Dates", Adultos: "Adults", Niños: "Children", Notas: "Notes" };
    return ["I would like to request a quote. Please advise me on these options.", "Service: Package", ...Object.entries(payload.fields).filter(([, value]) => value.trim()).map(([label, value]) => `${labels[label] ?? label}: ${value}`)].join("\n");
  }
  return ["Me gustaría solicitar una cotización. Por favor, asesóreme con estas opciones.", `Servicio: ${payload.service}`,
    ...Object.entries(payload.fields).filter(([, value]) => value.trim()).map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
}

export async function captureLead(payload: QuotePayload): Promise<void> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, servicio: payload.servicio ?? payload.service }),
    // Bound the wait on an unavailable network; do not delay fast responses.
    signal: AbortSignal.timeout(30000),
    keepalive: true,
  });
  const result = await response.json();
  if (!response.ok || result?.ok !== true || typeof result.id !== "string") {
    throw new Error(`Lead capture failed (${response.status})`);
  }
}

export async function requestQuote(payload: QuotePayload) {
  await captureLead(payload);
  trackEvent("quote_submit", { service: payload.servicio || payload.service, status: "saved" });
  trackEvent("whatsapp_click", { service: payload.servicio || payload.service });
  // Same-tab navigation avoids popup blockers after asynchronous lead capture.
  window.location.assign(`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(composeQuote(payload))}`);
}
