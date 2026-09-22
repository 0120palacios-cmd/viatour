"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type CookieConsent = "unknown" | "accepted" | "rejected";
export const CONSENT_KEY = "viatour-consent-v1";
export function parseConsent(value: unknown): CookieConsent { return value === "accepted" || value === "rejected" ? value : "unknown"; }
const Context = createContext<{ consent: CookieConsent; ready: boolean; canTrack: boolean; setConsent: (value: "accepted" | "rejected") => void } | null>(null);
let memoryConsent: CookieConsent = "unknown";
function subscribe(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener("viatour-consent", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("viatour-consent", callback); }; }
function snapshot() { try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { return memoryConsent; } }

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const consent = useSyncExternalStore(subscribe, snapshot, () => "unknown" as CookieConsent);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  function setConsent(value: "accepted" | "rejected") { memoryConsent = value; const gaId = window.viatourAnalytics?.gaId; if (gaId) window[`ga-disable-${gaId}`] = value !== "accepted"; if (window.viatourAnalytics) window.viatourAnalytics.consent = value === "accepted"; try { localStorage.setItem(CONSENT_KEY, value); } catch { } window.dispatchEvent(new Event("viatour-consent")); }
  return <Context.Provider value={{ consent, ready, canTrack: ready && consent === "accepted", setConsent }}>{children}</Context.Provider>;
}
export function useCookieConsent() { const value = useContext(Context); if (!value) throw Error("ConsentProvider required."); return value; }
export function ConsentGate({ children }: { children: React.ReactNode }) { return useCookieConsent().canTrack ? children : null; }
export function CookiePreferences() { const t = useTranslations(); const { consent, setConsent } = useCookieConsent(); const value = consent === "accepted" ? t("cookies.accepted") : consent === "rejected" ? t("cookies.rejected") : t("cookies.unknown"); return <div className="space-y-4"><p className="t-small">{t("cookies.current", { value })}</p><div className="flex gap-4"><Button onClick={() => setConsent("accepted")}>{t("cookies.accept")}</Button><Button variant="ghost" onClick={() => setConsent("rejected")}>{t("cookies.reject")}</Button></div></div>; }
export function CookieBanner() { const t = useTranslations(); const { ready, consent, setConsent } = useCookieConsent(); if (!ready || consent !== "unknown") return null; return <aside aria-labelledby="cookie-title" className="sticky bottom-0 z-50 border-t bg-canvas shadow-sm"><div className="container-site flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"><div className="measure space-y-2"><h2 id="cookie-title" className="t-h3">{t("cookies.preferences")}</h2><p className="t-small">{t("cookies.body")} <Link className="text-brand underline" href="/legales/cookies">{t("cookies.link")}</Link></p><p className="t-small text-ink-soft">{t("cookies.draft")}</p></div><div className="flex gap-4"><Button onClick={() => setConsent("accepted")}>{t("cookies.accept")}</Button><Button variant="ghost" onClick={() => setConsent("rejected")}>{t("cookies.reject")}</Button></div></div></aside>; }
