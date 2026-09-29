// First-party, first-touch attribution kept only for this browser session and sent only
// with a quote the visitor submits. No cookies, no third parties.
const storageKey = "viatour-origin-v1";
const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function captureAttribution() {
  try {
    if (typeof window === "undefined" || window.sessionStorage.getItem(storageKey)) return;
    const params = new URLSearchParams(window.location.search);
    const origin: Record<string, string> = { landing: window.location.pathname };
    for (const key of utmKeys) { const value = params.get(key); if (value) origin[key] = value.slice(0, 200); }
    if (document.referrer) {
      const host = new URL(document.referrer).host;
      if (host && host !== window.location.host) origin.referrer = host;
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(origin));
  } catch { /* Storage can be unavailable (private mode); attribution is optional. */ }
}

export function getAttribution(): Record<string, string> {
  const origin: Record<string, string> = {};
  try {
    if (typeof window === "undefined") return origin;
    origin.pagina = window.location.pathname;
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) || "{}");
    if (stored && typeof stored === "object") for (const [key, value] of Object.entries(stored)) if (typeof value === "string") origin[key] = value;
  } catch { /* Best effort only. */ }
  return origin;
}
