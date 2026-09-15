import { siteConfig } from "@/lib/site-config";

export type QuotePayload = { service: string; servicio?: string; fields: Record<string, string>; currency?: "USD" | "HNL"; formData?: Record<string, string> };

// Copy pendiente de aprobación final
export function composeQuote(payload: QuotePayload) {
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
    signal: AbortSignal.timeout(2500),
    keepalive: true,
  });
  const result = await response.json();
  if (!response.ok || result?.ok !== true || typeof result.id !== "string") {
    throw new Error(`Lead capture failed (${response.status})`);
  }
}

export async function requestQuote(payload: QuotePayload) {
  try {
    await captureLead(payload);
  } catch {
    // Avoid logging personal form data or server response bodies.
    console.warn("Lead capture unavailable; continuing to WhatsApp.");
  }
  // Same-tab navigation avoids popup blockers after asynchronous lead capture.
  window.location.assign(`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(composeQuote(payload))}`);
}
