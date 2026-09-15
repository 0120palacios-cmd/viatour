import { siteConfig } from "@/lib/site-config";

export type QuotePayload = { service: string; fields: Record<string, string>; currency?: "USD" | "HNL" };

// Copy pendiente de aprobación final
export function composeQuote(payload: QuotePayload) {
  return ["Me gustaría solicitar una cotización. Por favor, asesóreme con estas opciones.", `Servicio: ${payload.service}`,
    ...Object.entries(payload.fields).filter(([, value]) => value.trim()).map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
}

export async function captureLead(payload: QuotePayload): Promise<void> {
  // TODO Etapa 3b: guardar lead en Supabase y notificar soporte ANTES de abrir WhatsApp
  void payload;
}

export async function requestQuote(payload: QuotePayload) {
  await captureLead(payload);
  // Same-tab navigation avoids popup blockers after asynchronous lead capture.
  window.location.assign(`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(composeQuote(payload))}`);
}
