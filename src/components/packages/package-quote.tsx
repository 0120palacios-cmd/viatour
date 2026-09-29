"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/turnstile";
import { useCurrency } from "@/components/currency-provider";
import { ContactFields, QuoteHowItWorks, QuoteSubmit, QuoteSuccess, contactFormData } from "@/components/quote/quote-parts";
import { requestQuote, type QuoteResult } from "@/lib/quote";
import type { Package } from "@/lib/packages";

export function PackageQuote({ item }: { item: Package }) {
  const t = useTranslations("packageQuote");
  const locale = useLocale() as "es" | "en";
  const { currency } = useCurrency();
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [otherDestination, setOtherDestination] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const locked = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !token) return;
    const form = new FormData(event.currentTarget);
    const origin = String(form.get("origin") ?? "");
    const destination = otherDestination ? String(form.get("destination") ?? "").trim() : item.destino;
    const dates = String(form.get("dates") ?? "");
    const adults = String(form.get("adults") ?? "");
    const children = String(form.get("children") ?? "");
    const notes = String(form.get("notes") ?? "");
    const contact = contactFormData(form);
    locked.current = true;
    setBusy(true);
    setError(false);
    try {
      setResult(await requestQuote({ service: "Paquete", servicio: "Paquete", locale, currency, turnstileToken: token, fields: { Paquete: item.nombre, Nombre: contact.name, Origen: origin, Destino: destination, Fechas: dates, Adultos: adults, Niños: children, Notas: notes }, formData: {
        slug: item.slug, nombre: item.nombre, destino: destination,
        origin, dates, adults, children, notes, ...contact,
      } }));
    } catch {
      setError(true);
    } finally {
      locked.current = false;
      setBusy(false);
      setChallenge(value => value + 1);
    }
  }

  if (result) return <QuoteSuccess result={result} service="Paquete" onReset={() => setResult(null)} />;
  return <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><h2 id={`package-quote-title-${item.id}`} className="t-h3">{t("title")}</h2><p className="t-small text-ink-soft">{item.nombre}</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><label htmlFor={`quote-origin-${item.id}`} className="t-small">{t("origin")}</label><Input id={`quote-origin-${item.id}`} name="origin" required maxLength={120} autoComplete="address-level2" /></div>
            <div className="space-y-2"><label htmlFor={`quote-destination-${item.id}`} className="t-small">{t("destination")}</label><select id={`quote-destination-${item.id}`} name="destination-choice" className="t-body h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 text-ink focus-visible:border-brand" defaultValue={item.destino} onChange={event => setOtherDestination(event.target.value === "__other__")}><option value={item.destino}>{item.destino}</option><option value="__other__">{t("otherDestination")}</option></select>{otherDestination && <Input name="destination" required maxLength={120} placeholder={t("enterDestination")} />}<p className="t-small text-ink-soft">{t("otherDestinationHint")}</p></div>
            <div className="space-y-2 sm:col-span-2"><label htmlFor={`quote-dates-${item.id}`} className="t-small">{t("dates")}</label><Input id={`quote-dates-${item.id}`} name="dates" required maxLength={120} placeholder={t("datesHint")} /></div>
            <div className="space-y-2"><label htmlFor={`quote-adults-${item.id}`} className="t-small">{t("adults")}</label><Input id={`quote-adults-${item.id}`} name="adults" type="number" min={1} max={20} step={1} defaultValue={1} required /></div>
            <div className="space-y-2"><label htmlFor={`quote-children-${item.id}`} className="t-small">{t("children")}</label><Input id={`quote-children-${item.id}`} name="children" type="number" min={0} max={20} step={1} defaultValue={0} required /></div>
            <div className="space-y-2 sm:col-span-2"><label htmlFor={`quote-notes-${item.id}`} className="t-small">{t("notes")} <span className="font-normal text-ink-soft">({t("optional")})</span></label><textarea id={`quote-notes-${item.id}`} name="notes" maxLength={3000} rows={3} className="w-full rounded-btn border border-line bg-canvas p-3 t-body text-ink focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand-tint" /></div>
          </div>
          <ContactFields idPrefix={`quote-contact-${item.id}`} columns={1} />
          <Turnstile onToken={setToken} resetKey={challenge} />
          {error && <p role="alert" className="t-small text-error">{t("error")}</p>}
          <QuoteSubmit ready={!!token} busy={busy} label={t("submit")} className="sm:w-full" />
          <QuoteHowItWorks />
        </form>
}
