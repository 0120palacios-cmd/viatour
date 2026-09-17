export type AnalyticsEvent = "whatsapp_click" | "quote_submit" | "contact_submit" | "newsletter_signup" | "review_submit";
export type EventParams = { service?: string; page?: string; placement?: string; status?: "requested" | "saved" };
type Pixel = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: Pixel };
declare global { interface Window { [key: `ga-disable-${string}`]: boolean | undefined; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: Pixel; _fbq?: Pixel; viatourAnalytics?: { consent: boolean; ga: boolean; meta: boolean; gaId?: string }; } }
export function trackEvent(name: AnalyticsEvent, params: EventParams = {}) {
 if (typeof window === "undefined" || !window.viatourAnalytics?.consent) return;
 const state = window.viatourAnalytics;
 // Allowlisted parameters only: never send names, email, phone or quote content.
 const route = window.location.pathname.split("/")[1];
 const service = params.service?.toLowerCase();
 const normalized = ({ paquete: "package", destino: "destination", "viaje a medida": "viaje-a-medida" } as Record<string, string>)[service || ""] || service || ({ paquetes: "package", destinos: "destination" } as Record<string, string>)[route] || route || "inicio";
 const safe = { service: normalized, page: params.page || window.location.pathname, placement: params.placement, status: params.status };
 try { if (state.ga) window.gtag?.("event", name, safe); } catch { /* Tracking must never interrupt the form. */ }
 try { if (state.meta) window.fbq?.("trackCustom", name, safe); } catch { /* Tracking must never interrupt navigation. */ }
}
