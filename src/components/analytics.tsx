"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ConsentGate, useCookieConsent } from "@/components/cookie-consent";
import "@/lib/analytics";
const ga = process.env.NEXT_PUBLIC_GA4_ID?.trim();
const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
// TODO: NEXT_PUBLIC_TIKTOK_PIXEL_ID is reserved; do not load TikTok yet.
function Scripts() {
 const pathname = usePathname();
 useEffect(() => {
  const state = window.viatourAnalytics ||= { consent: false, ga: false, meta: false };
  state.consent = true;
  let active = true;
  const scripts: HTMLScriptElement[] = [];
  function load(src: string, ready: () => void) { const script = document.createElement("script"); script.async = true; script.src = src; script.onload = () => { if (active && state.consent) ready(); }; scripts.push(script); document.head.appendChild(script); }
  if (ga && /^G-[A-Z0-9]+$/.test(ga)) {
   window.viatourAnalytics!.gaId = ga;
   window[`ga-disable-${ga}`] = false;
   window.dataLayer ||= [];
   // gtag expects its standard arguments object in dataLayer.
   // eslint-disable-next-line prefer-rest-params
   window.gtag ||= function () { window.dataLayer!.push(arguments); };
   window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
   if (!state.ga) load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga), () => { state.ga = true; window.gtag!("js", new Date()); window.gtag!("config", ga, { send_page_view: false }); window.gtag!("event", "page_view", { page_path: window.location.pathname }); });
  }
  if (meta && /^\d+$/.test(meta)) {
   if (!window.fbq) { const pixel: NonNullable<Window["fbq"]> = function (...args: unknown[]) { if (pixel.callMethod) pixel.callMethod(...args); else pixel.queue!.push(args); }; pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = "2.0"; window.fbq = pixel; window._fbq = pixel; }
   window.fbq("consent", "grant");
   if (!state.meta) load("https://connect.facebook.net/en_US/fbevents.js", () => { state.meta = true; window.fbq!("init", meta); window.fbq!("track", "PageView"); });
  }
  return () => { active = false; state.consent = false; if (ga) window[`ga-disable-${ga}`] = true; scripts.forEach(script => { script.onload = null; script.remove(); }); window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); window.fbq?.("consent", "revoke"); };
 }, []);
 useEffect(() => { const state = window.viatourAnalytics; if (!state?.consent) return; if (state.ga) window.gtag?.("event", "page_view", { page_path: pathname }); if (state.meta) window.fbq?.("track", "PageView"); }, [pathname]);
 return null;
}
export function Analytics() { const { canTrack } = useCookieConsent(); useEffect(() => { if (window.viatourAnalytics) window.viatourAnalytics.consent = canTrack; }, [canTrack]); return <ConsentGate><Scripts /></ConsentGate>; }
