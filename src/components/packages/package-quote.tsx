"use client";

import { useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/turnstile";
import { useCurrency } from "@/components/currency-provider";
import { requestQuote } from "@/lib/quote";
import type { Package } from "@/lib/packages";

export function PackageQuote({ item }: { item: Package }) {
  const t = useTranslations("packageQuote");
  const locale = useLocale() as "es" | "en";
  const { currency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const locked = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !token) return;
    const form = new FormData(event.currentTarget);
    const origin = String(form.get("origin") ?? "");
    const dates = String(form.get("dates") ?? "");
    const adults = String(form.get("adults") ?? "");
    const children = String(form.get("children") ?? "");
    const notes = String(form.get("notes") ?? "");
    locked.current = true;
    setBusy(true);
    setError(false);
    try {
      await requestQuote({ service: "Paquete", servicio: "Paquete", locale, currency, turnstileToken: token, fields: { Paquete: item.nombre, Origen: origin, Destino: item.destino, Fechas: dates, Adultos: adults, Niños: children, Notas: notes }, formData: {
        slug: item.slug, nombre: item.nombre, destino: item.destino,
        origin, dates, adults, children, notes,
      } });
    } catch {
      setError(true);
    } finally {
      locked.current = false;
      setBusy(false);
      setChallenge(value => value + 1);
    }
  }

  return <>
    <Button variant="whatsapp" className="h-auto min-h-12 w-full whitespace-normal" onClick={() => setOpen(true)}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{t("open")}</Button>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={`package-quote-title-${item.id}`} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-panel border border-line bg-canvas p-6 shadow-md sm:rounded-panel sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4"><div className="space-y-2"><h2 id={`package-quote-title-${item.id}`} className="t-h2">{t("title")}</h2><p className="t-body text-ink-soft">{item.nombre}</p></div><button type="button" aria-label={t("close")} onClick={() => setOpen(false)} className="flex size-12 shrink-0 items-center justify-center rounded-btn text-ink-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"><X size={20} aria-hidden="true" /></button></div>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><label htmlFor={`quote-origin-${item.id}`} className="t-small">{t("origin")}</label><Input id={`quote-origin-${item.id}`} name="origin" required maxLength={120} autoComplete="address-level2" /></div>
            <div className="space-y-2"><label htmlFor={`quote-destination-${item.id}`} className="t-small">{t("destination")}</label><Input id={`quote-destination-${item.id}`} value={item.destino} readOnly aria-readonly="true" /></div>
            <div className="space-y-2 sm:col-span-2"><label htmlFor={`quote-dates-${item.id}`} className="t-small">{t("dates")}</label><Input id={`quote-dates-${item.id}`} name="dates" required maxLength={120} placeholder={t("datesHint")} /></div>
            <div className="space-y-2"><label htmlFor={`quote-adults-${item.id}`} className="t-small">{t("adults")}</label><Input id={`quote-adults-${item.id}`} name="adults" type="number" min={1} max={20} step={1} defaultValue={1} required /></div>
            <div className="space-y-2"><label htmlFor={`quote-children-${item.id}`} className="t-small">{t("children")}</label><Input id={`quote-children-${item.id}`} name="children" type="number" min={0} max={20} step={1} defaultValue={0} required /></div>
            <div className="space-y-2 sm:col-span-2"><label htmlFor={`quote-notes-${item.id}`} className="t-small">{t("notes")} <span className="font-normal text-ink-soft">({t("optional")})</span></label><textarea id={`quote-notes-${item.id}`} name="notes" maxLength={3000} rows={3} className="w-full rounded-btn border border-line bg-canvas p-3 t-body text-ink focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand-tint" /></div>
          </div>
          <Turnstile onToken={setToken} resetKey={challenge} />
          {error && <p role="alert" className="t-small text-error">{t("error")}</p>}
          <Button type="submit" variant="whatsapp" disabled={busy || !token} aria-busy={busy} className="w-full"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{busy ? t("sending") : t("submit")}</Button>
        </form>
      </section>
    </div>}
  </>;
}
