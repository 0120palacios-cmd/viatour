"use client";
import { Turnstile } from "@/components/turnstile";
import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, NotebookPen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactFields, QuoteHowItWorks, QuoteSubmit, QuoteSuccess, contactFormData } from "@/components/quote/quote-parts";
import { requestQuote, type QuotePayload, type QuoteResult } from "@/lib/quote";
import { useCurrency } from "@/components/currency-provider";

// A button-only CTA (destination, final call to action) opens a short form so the lead
// always carries a WhatsApp number before the handoff.
export function QuoteButton({ payload, children, align = "left" }: { payload: QuotePayload; children: React.ReactNode; align?: "left" | "center" }) {
  const [open, setOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const { currency } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const t = useTranslations("quote");
  const locked = useRef(false);
  const formId = useId();
  const notesId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !turnstileToken) return;
    const data = new FormData(event.currentTarget);
    const contact = contactFormData(data);
    const notes = String(data.get("notes") ?? "").trim();
    locked.current = true; setBusy(true); setError(false);
    try { setResult(await requestQuote({ ...payload, currency, turnstileToken, fields: { ...payload.fields, Nombre: contact.name, Notas: notes }, formData: { ...payload.formData, ...contact } })); }
    catch { setError(true); }
    finally { locked.current = false; setBusy(false); setChallenge(n => n + 1); }
  }

  if (result) return <QuoteSuccess result={result} service={payload.servicio || payload.service} onReset={() => { setResult(null); setOpen(false); }} />;
  if (!open) return <Button variant="whatsapp" className="h-auto min-h-12 whitespace-normal text-left" aria-expanded={false} aria-controls={formId} onClick={() => { setOpen(true); window.requestAnimationFrame(() => document.getElementById(`${formId}-name`)?.focus()); }}><MessageCircle className="shrink-0" size={24} strokeWidth={1.75} aria-hidden="true" />{children}</Button>;
  return <form id={formId} onSubmit={submit} className={`w-full space-y-6 rounded-panel border border-line bg-canvas p-4 text-left shadow-sm sm:p-6 ${align === "center" ? "mx-auto max-w-2xl" : ""}`}>
    <div className="flex items-start justify-between gap-4"><p className="t-h3">{children}</p><Button type="button" variant="ghost" className="size-12 shrink-0 p-0" aria-label={t("closeForm")} onClick={() => setOpen(false)}><X size={20} strokeWidth={1.75} aria-hidden="true" /></Button></div>
    <ContactFields idPrefix={formId} columns={2} />
    <div className="space-y-2"><label htmlFor={notesId} className="t-small flex items-center gap-2"><NotebookPen size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{t("notes")}</label><textarea id={notesId} name="notes" maxLength={3000} rows={3} className="t-body w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand" /></div>
    <Turnstile onToken={setTurnstileToken} resetKey={challenge} />
    {error && <p role="alert" className="t-small text-error">{t("error")}</p>}
    <QuoteSubmit ready={!!turnstileToken} busy={busy} label={t("continueWhatsapp")} />
    <QuoteHowItWorks />
  </form>;
}
