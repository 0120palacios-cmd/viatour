"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type API = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: API } }
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const element = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);
  useEffect(() => { callback.current = onToken; }, [onToken]);
  const render = useCallback(() => {
    if (!element.current || !window.turnstile || widget.current !== null || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return;
    widget.current = window.turnstile.render(element.current, { sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, language: "es", theme: "light", size: "flexible", callback: (token: string) => callback.current(token), "expired-callback": () => callback.current(""), "error-callback": () => callback.current("") });
  }, []);
  useEffect(() => {
    render();
    return () => { if (widget.current !== null) window.turnstile?.remove(widget.current); widget.current = null; callback.current(""); };
  }, [render, resetKey]);
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render} /><div ref={element} aria-label="Verificación de seguridad" /></>;
}
