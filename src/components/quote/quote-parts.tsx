"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Info, Mail, MessageCircle, Phone, RotateCcw, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";
import type { QuoteResult } from "@/lib/quote";

const labelClass = "t-small flex items-center gap-2";

// Name (optional), WhatsApp number (required) and email (optional) share one layout in every quote form.
// hideEmail keeps the short hero form to the two fields an advisor needs; the full form still offers email.
// Browsers compile `pattern` with the v flag, where ( and ) must be escaped inside a character class;
// unescaped, the pattern is invalid and the browser silently skips the phone check.
export function ContactFields({ idPrefix, columns = 3, hideEmail = false }: { idPrefix: string; columns?: 1 | 2 | 3; hideEmail?: boolean }) {
  const t = useTranslations("quote");
  const hintId = `${idPrefix}-phone-hint`;
  // Columns follow the width of the form (container queries), not the window: the same fields sit in a
  // narrow hero panel and on full-width service pages.
  const grid = columns === 3 && !hideEmail ? "@md:grid-cols-2 @3xl:grid-cols-3" : columns === 1 ? "" : "@md:grid-cols-2";
  return <fieldset className="@container min-w-0 space-y-4">
    <legend className="t-small mb-4 font-semibold text-ink">{t("contactLegend")}</legend>
    <div className={`grid gap-4 ${grid}`}>
      <div className="min-w-0 space-y-2"><label htmlFor={`${idPrefix}-name`} className={labelClass}><UserRound size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{t("name")}</label><Input id={`${idPrefix}-name`} name="name" autoComplete="name" maxLength={120} /></div>
      <div className="min-w-0 space-y-2"><label htmlFor={`${idPrefix}-phone`} className={labelClass}><Phone size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{t("phone")}<span aria-hidden="true" className="text-ink-soft">*</span></label><Input id={`${idPrefix}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} pattern="[+0-9\(\) .\-]{8,40}" placeholder="+504 9999-9999" aria-describedby={hintId} /><p id={hintId} className="t-small text-ink-soft">{t("phoneHint")}</p></div>
      {!hideEmail && <div className="min-w-0 space-y-2"><label htmlFor={`${idPrefix}-email`} className={labelClass}><Mail size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{t("email")}</label><Input id={`${idPrefix}-email`} name="email" type="email" autoComplete="email" maxLength={254} /></div>}
    </div>
  </fieldset>;
}

// Reads the contact fields from a submitted form, normalised for the payload.
export function contactFormData(data: FormData) {
  const value = (name: string) => String(data.get(name) ?? "").trim();
  return { name: value("name"), phone: value("phone"), email: value("email") };
}

// The WhatsApp button is ready from the first paint. It only says "verifying" when a visitor
// submits before the background security check has finished, and then submits by itself.
export function QuoteSubmit({ verifying, busy, label, className = "" }: { verifying: boolean; busy: boolean; label: string; className?: string }) {
  const t = useTranslations("quote");
  return <Button type="submit" variant="whatsapp" disabled={verifying || busy} aria-busy={verifying || busy} className={`h-auto min-h-12 w-full whitespace-normal leading-normal disabled:cursor-wait disabled:opacity-70 sm:w-auto ${className}`}>
    <MessageCircle size={24} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
    {busy ? t("saving") : verifying ? t("verifying") : label}
  </Button>;
}

export function QuoteHowItWorks({ className = "" }: { className?: string }) {
  const t = useTranslations("quote");
  return <div className={`rounded-card border border-line bg-surface p-4 ${className}`}>
    <p className="t-small mb-2 flex items-center gap-2 font-semibold text-ink"><Info size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{t("howTitle")}</p>
    <ul className="t-small list-disc space-y-1 pl-5 text-ink-soft"><li>{t("how1")}</li><li>{t("how2")}</li><li>{t("how3")}</li></ul>
  </div>;
}

// Shown after the lead is saved: the visitor keeps a reference and opens WhatsApp with their own click.
export function QuoteSuccess({ result, service, onReset }: { result: QuoteResult; service: string; onReset?: () => void }) {
  const t = useTranslations("quote");
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => { heading.current?.focus(); }, []);
  return <section role="status" aria-labelledby={titleId} className="space-y-6 rounded-panel border border-line bg-surface p-6 text-left sm:p-8">
    <div className="flex items-start gap-3"><CheckCircle2 size={28} strokeWidth={1.75} className="mt-1 shrink-0 text-success" aria-hidden="true" /><div className="space-y-2"><h2 id={titleId} ref={heading} tabIndex={-1} className="t-h3 outline-none">{t("savedTitle")}</h2>{result.referencia && <p className="t-body"><span className="text-ink-soft">{t("savedReference")}: </span><strong className="font-semibold tracking-wide">{result.referencia}</strong></p>}</div></div>
    <p className="t-body measure text-ink-soft">{t("savedBody")}</p>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Button asChild variant="whatsapp" className="h-auto min-h-12 w-full sm:w-auto"><a href={result.href} onClick={() => trackEvent("whatsapp_click", { service, placement: "quote-success" })}><MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />{t("continueWhatsapp")}</a></Button>
      {onReset && <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onReset}><RotateCcw size={18} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{t("newRequest")}</Button>}
    </div>
    <p className="t-small text-ink-soft">{t("savedFallback")}</p>
  </section>;
}

export function AttributionCapture() {
  useEffect(() => { captureAttribution(); }, []);
  return null;
}
