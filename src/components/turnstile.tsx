"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type API = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global { interface Window { turnstile?: API } }
// One widget and one server-verified session shared by every mounted form.
const consumers = new Map<HTMLElement, (token: string) => void>();
let widget: { id: string; element: HTMLElement } | undefined;
let expires = 0;
let checking: Promise<void> | undefined;
let verifying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
// Submissions made before verification finishes wait here instead of meeting a disabled button.
const waiters = new Set<(token: string) => void>();
const scriptStarters = new Set<() => void>();
function publish() {
  const token = expires > Date.now() ? "human-session" : "";
  for (const callback of consumers.values()) callback(token);
  if (token) { for (const resolve of waiters) resolve(token); waiters.clear(); }
}
export function waitForHuman(timeout = 60000): Promise<string> {
  if (expires > Date.now()) return Promise.resolve("human-session");
  return new Promise((resolve, reject) => {
    const done = (token: string) => { clearTimeout(limit); resolve(token); };
    const limit = setTimeout(() => { waiters.delete(done); reject(new Error("Verification timed out")); }, timeout);
    waiters.add(done);
    for (const start of scriptStarters) start();
    void checkSession();
  });
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
    // interaction-only keeps the widget invisible, yet its frame still took ~150px of empty space
    // in every form. The box opens only while Cloudflare actually needs the visitor.
    "before-interactive-callback": () => { element.dataset.interactive = "true"; },
    "after-interactive-callback": () => { delete element.dataset.interactive; },
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
// The challenge script stays off the critical path: it loads on the first interaction with the
// form or when the browser is idle (at most ~4 s), whichever comes first.
let scriptRequested = false;
export function Turnstile({ onToken }: { onToken: (token: string) => void; resetKey?: number }) {
  const element = useRef<HTMLDivElement>(null);
  const [loadScript, setLoadScript] = useState(scriptRequested);
  useEffect(() => {
    if (loadScript) return;
    const start = () => { scriptRequested = true; setLoadScript(true); };
    scriptStarters.add(start);
    const scope = element.current?.closest("form") ?? element.current?.parentElement;
    const events = ["focusin", "pointerdown", "keydown"] as const;
    events.forEach(name => scope?.addEventListener(name, start, { once: true, passive: true }));
    const idle = "requestIdleCallback" in window ? window.requestIdleCallback(start, { timeout: 4000 }) : globalThis.setTimeout(start, 2500);
    return () => { scriptStarters.delete(start); events.forEach(name => scope?.removeEventListener(name, start)); if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle as number); else globalThis.clearTimeout(idle as number); };
  }, [loadScript]);
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
  return <>{loadScript && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render} />}<div ref={element} className="min-w-0 max-h-0 overflow-hidden data-interactive:max-h-none data-interactive:overflow-visible" aria-label="Verificación de seguridad" /></>;
}

// One hook per form: the submit button keeps its real label, and a submission made before
// verification finishes waits for it (the button shows "verifying") instead of being blocked.
export function useHumanToken() {
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const ensure = useCallback(async () => {
    if (token) return token;
    setVerifying(true);
    try { return await waitForHuman(); } finally { setVerifying(false); }
  }, [token]);
  return { token, onToken: setToken, verifying, ensure };
}
