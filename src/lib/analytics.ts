export type AnalyticsEvent = "whatsapp_click" | "quote_submit" | "contact_submit" | "newsletter_signup" | "review_submit" | "share" | "google_review_click" | "google_profile_click" | "email_click";
export type EventParams = { service?: string; page?: string; placement?: string; status?: "requested" | "saved" };
type Pixel = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: Pixel };
declare global { interface Window { [key: `ga-disable-${string}`]: boolean | undefined; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: Pixel; _fbq?: Pixel; viatourAnalytics?: { consent: boolean; ga: boolean; meta: boolean; gaId?: string }; } }

// A saved quote or contact request is a lead. It is also sent under the standard names (GA4
// `generate_lead`, Meta `Lead`) so it can be marked as a key event in GA4 and imported into
// Google Ads or used by Meta without renaming. A WhatsApp click is Meta's standard `Contact`.
const standardGa: Partial<Record<AnalyticsEvent, string>> = { quote_submit: "generate_lead", contact_submit: "generate_lead" };
const standardMeta: Partial<Record<AnalyticsEvent, string>> = { quote_submit: "Lead", contact_submit: "Lead", whatsapp_click: "Contact" };

export function trackEvent(name: AnalyticsEvent, params: EventParams = {}) {
 if (typeof window === "undefined" || !window.viatourAnalytics?.consent) return;
 const state = window.viatourAnalytics;
 // Allowlisted parameters only: never send names, email, phone or quote content.
 const route = window.location.pathname.split("/")[1];
 const service = params.service?.toLowerCase();
 const normalized = ({ paquete: "package", destino: "destination", "viaje a medida": "viaje-a-medida" } as Record<string, string>)[service || ""] || service || ({ paquetes: "package", destinos: "destination" } as Record<string, string>)[route] || route || "inicio";
 const safe = { service: normalized, page: params.page || window.location.pathname, placement: params.placement, status: params.status };
 const gaStandard = standardGa[name];
 const metaStandard = standardMeta[name];
 try {
  if (state.ga) {
   window.gtag?.("event", name, safe);
   if (gaStandard) window.gtag?.("event", gaStandard, { ...safe, lead_source: name });
  }
 } catch { /* Tracking must never interrupt the form. */ }
 try {
  if (state.meta) {
   window.fbq?.("trackCustom", name, safe);
   if (metaStandard) window.fbq?.("track", metaStandard, { content_category: normalized });
  }
 } catch { /* Tracking must never interrupt navigation. */ }
}
