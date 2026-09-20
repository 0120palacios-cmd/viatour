"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";

type API = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global { interface Window { turnstile?: API } }
// One widget and one server-verified session shared by every mounted form.
const consumers = new Map<HTMLElement, (token: string) => void>();
let widget: { id: string; element: HTMLElement } | undefined;
let expires = 0;
let checking: Promise<void> | undefined;
let verifying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function publish() {
  for (const callback of consumers.values()) callback(expires > Date.now() ? "human-session" : "");
}
function removeWidget() {
  if (widget) window.turnstile?.remove(widget.id);
  widget = undefined;
}
function acceptSession(expiry: number) {
  expires = expiry;
  removeWidget();
  publish();
  clearTimeout(timer);
  timer = setTimeout(() => { expires = 0; publish(); void checkSession(); }, Math.max(0, expiry - Date.now()));
}
function render() {
  if (expires > Date.now() || checking || verifying || widget || !window.turnstile || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
  const element = consumers.keys().next().value;
  if (!element) return;
  const id = window.turnstile.render(element, {
    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, language: "es", theme: "light",
    size: "compact", appearance: "interaction-only",
    callback: async (token: string) => {
      if (verifying) return;
      verifying = true;
      try {
        const response = await fetch("/api/human", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        const result = await response.json();
        if (response.ok && result.expires > Date.now()) { acceptSession(result.expires); return; }
      } catch { /* Fail closed; retry without enabling submissions. */ }
      finally { verifying = false; }
      timer = setTimeout(() => { if (widget) window.turnstile?.reset(widget.id); else render(); }, 8000);
    },
    "expired-callback": () => { if (widget) window.turnstile?.reset(widget.id); },
    "error-callback": () => publish(),
  });
  widget = { id, element };
}
function checkSession() {
  if (checking) return checking;
  const previousExpiry = expires;
  checking = (async () => {
    try {
      const response = await fetch("/api/human", { cache: "no-store" });
      const result = await response.json();
      if (response.ok && result.expires > Date.now()) acceptSession(result.expires);
      else if (expires === previousExpiry) { expires = 0; clearTimeout(timer); publish(); }
    } catch { /* A fresh challenge is still verified server-side. */ }
  })().finally(() => { checking = undefined; render(); });
  return checking;
}
export function Turnstile({ onToken }: { onToken: (token: string) => void; resetKey?: number }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current!;
    consumers.set(node, onToken);
    publish();
    void checkSession();
    const refresh = () => { if (document.visibilityState === "visible") void checkSession(); };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      consumers.delete(node);
      document.removeEventListener("visibilitychange", refresh);
      if (widget?.element === node) { removeWidget(); render(); }
      if (!consumers.size) { clearTimeout(timer); removeWidget(); }
    };
  }, [onToken]);
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render} /><div ref={element} className="min-w-0 empty:hidden" aria-label="Verificación de seguridad" /></>;
}
