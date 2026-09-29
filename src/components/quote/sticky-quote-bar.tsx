"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Below 1024px the quote form sits after long content. This bar keeps the action one tap away
// and hides while the form itself (or the footer) is on screen. Right padding leaves room for
// the floating WhatsApp button.
export function StickyQuoteBar({ targetId, title }: { targetId: string; title: string }) {
  const t = useTranslations("quote");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById(targetId), footer = document.getElementById("site-footer");
    if (!target) return;
    const seen = new Map<Element, boolean>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) seen.set(entry.target, entry.isIntersecting);
      setVisible(![...seen.values()].some(Boolean) && window.scrollY > 200);
    });
    observer.observe(target); if (footer) observer.observe(footer);
    const onScroll = () => setVisible(![...seen.values()].some(Boolean) && window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [targetId]);
  function go() {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    // Button-only CTAs render a closed form; open it so the next tap is typing, not searching.
    const opener = target.querySelector<HTMLButtonElement>("button[aria-expanded='false']");
    if (opener) opener.click();
    else window.setTimeout(() => target.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true }), 400);
  }
  if (!visible) return null;
  return <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-4 py-3 pr-20 shadow-md lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
    <div className="flex items-center gap-3"><p className="t-small min-w-0 flex-1 truncate text-ink-soft">{title}</p><Button type="button" onClick={go} className="shrink-0"><ArrowDown size={18} strokeWidth={1.75} aria-hidden="true" />{t("openForm")}</Button></div>
  </div>;
}
