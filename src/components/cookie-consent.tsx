"use client";
import Link from "next/link";
import { createContext, useContext, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
export type CookieConsent = "unknown" | "accepted" | "rejected";
export const CONSENT_KEY = "viatour-consent-v1";
export function parseConsent(value: unknown): CookieConsent { return value === "accepted" || value === "rejected" ? value : "unknown"; }
const Context = createContext<{
    consent: CookieConsent;
    ready: boolean;
    canTrack: boolean;
    setConsent: (v: "accepted" | "rejected") => void;
} | null>(null);
let memoryConsent: CookieConsent = "unknown";
function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener("viatour-consent", callback);
    return () => { window.removeEventListener("storage", callback); window.removeEventListener("viatour-consent", callback); };
}
function snapshot() { try {
    return parseConsent(localStorage.getItem(CONSENT_KEY));
}
catch {
    return memoryConsent;
} }
export function ConsentProvider({ children }: {
    children: React.ReactNode;
}) {
    const consent = useSyncExternalStore(subscribe, snapshot, () => "unknown" as CookieConsent);
    const ready = useSyncExternalStore(subscribe, () => true, () => false);
    function setConsent(v: "accepted" | "rejected") { memoryConsent = v; try {
        localStorage.setItem(CONSENT_KEY, v);
    }
    catch { } window.dispatchEvent(new Event("viatour-consent")); }
    return <Context.Provider value={{ consent, ready, canTrack: ready && consent === "accepted", setConsent }}>{children}</Context.Provider>;
}
export function useCookieConsent() { const value = useContext(Context); if (!value)
    throw Error("ConsentProvider requerido."); return value; }
// Stage 10: montar scripts únicamente dentro del gate; no cargarlos al importar módulos.
export function ConsentGate({ children }: {
    children: React.ReactNode;
}) { return useCookieConsent().canTrack ? children : null; }
export function CookiePreferences() { const { consent, setConsent } = useCookieConsent(); return <div className="space-y-4"><p className="t-small">Preferencia actual: {consent === "accepted" ? "aceptada" : consent === "rejected" ? "rechazada" : "sin elegir"}.</p><div className="flex gap-4"><Button onClick={() => setConsent("accepted")}>Aceptar</Button><Button variant="ghost" onClick={() => setConsent("rejected")}>Rechazar</Button></div></div>; }
// Copy en borrador pendiente de aprobación; no hay scripts de seguimiento.
export function CookieBanner() { const { ready, consent, setConsent } = useCookieConsent(); if (!ready || consent !== "unknown")
    return null; return <aside aria-labelledby="cookie-title" className="sticky bottom-0 z-50 border-t bg-canvas shadow-sm"><div className="container-site flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"><div className="measure space-y-2"><h2 id="cookie-title" className="t-h3">Preferencias de cookies</h2><p className="t-small">Usted puede aceptar o rechazar cookies de analítica y marketing. Estas herramientas solo se activarán con su aceptación. <Link className="text-brand underline" href="/legales/cookies">Consulte la información sobre cookies.</Link></p><p className="t-small text-ink-soft">Texto en borrador, pendiente de aprobación.</p></div><div className="flex gap-4"><Button onClick={() => setConsent("accepted")}>Aceptar</Button><Button variant="ghost" onClick={() => setConsent("rejected")}>Rechazar</Button></div></div></aside>; }
