"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

// Copies a booking code or ticket number. The visible label stays short; the accessible name says what is
// copied, and the confirmation is announced politely.
export function CopyButton({ value, label, copiedLabel, accessibleLabel, tone = "light" }: { value: string; label: string; copiedLabel: string; accessibleLabel: string; tone?: "light" | "dark" }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (old browser, insecure context): the value stays visible and selectable.
    }
  }
  const colors = tone === "dark" ? "text-white hover:bg-white/10" : "text-brand hover:bg-brand-tint";
  return <>
    <button type="button" onClick={copy} aria-label={accessibleLabel} className={`t-small inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn px-3 font-semibold transition-colors duration-(--duration-fast) ${colors}`}>
      {copied ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
      <span aria-hidden="true">{copied ? copiedLabel : label}</span>
    </button>
    <span className="sr-only" role="status" aria-live="polite">{copied ? copiedLabel : ""}</span>
  </>;
}
