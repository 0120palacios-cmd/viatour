"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Turnstile, useHumanToken } from "@/components/turnstile";
import { useCurrency } from "@/components/currency-provider";
import { ContactFields, QuoteHowItWorks, QuoteSubmit, QuoteSuccess, contactFormData } from "@/components/quote/quote-parts";
import { requestQuote, type QuoteResult } from "@/lib/quote";
import { trackQuoteStart } from "@/lib/analytics";
import type { Package } from "@/lib/packages";
import { hotelHash, optionHash, type PackageOption, type PackageStay } from "@/lib/package-sheet";

const roomKeys = ["roomKing", "roomTwoBeds", "roomView", "roomConnecting"] as const;

// Packages with a ficha add their choices: an option (A/B), a hotel per stay, a room preference and extras.
// All of them are optional except the option, and each one reaches the lead and the WhatsApp message.
export function PackageQuote({ item, intro, options = [], extras = [], stays = [] }: { item: Package; intro?: string; options?: PackageOption[]; extras?: string[]; stays?: PackageStay[] }) {
  const t = useTranslations("packageQuote");
  const locale = useLocale() as "es" | "en";
  const { currency } = useCurrency();
  const human = useHumanToken();
  const [challenge, setChallenge] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [otherDestination, setOtherDestination] = useState(false);
  const [option, setOption] = useState(options[0]?.id ?? "");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuoteResult | null>(null);
  const locked = useRef(false);
  // A stay tied to one option (the resort night of option B) only applies while that option is chosen.
  const activeStays = stays.filter(stay => !stay.opcion || stay.opcion === option);

  useEffect(() => {
    if (!options.length && !stays.length) return;
    const pick = () => {
      const hash = window.location.hash;
      const match = options.find(value => hash === `#${optionHash(value.id)}`);
      if (match) setOption(match.id);
      for (const stay of stays) {
        const hotel = stay.hoteles.find(value => hash === `#${hotelHash(value.id)}`);
        if (!hotel) continue;
        setPicks(current => ({ ...current, [stay.campo]: hotel.id }));
        if (stay.opcion) setOption(stay.opcion);
      }
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [options, stays]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = new FormData(event.currentTarget);
    const origin = String(form.get("origin") ?? "");
    const destination = otherDestination ? String(form.get("destination") ?? "").trim() : item.destino;
    const dates = String(form.get("dates") ?? "");
    const adults = String(form.get("adults") ?? "");
    const children = String(form.get("children") ?? "");
    const notes = String(form.get("notes") ?? "");
    const chosen = options.find(value => value.id === option)?.cotizacion ?? "";
    const addons = form.getAll("extras").map(String).filter(value => extras.includes(value)).join("; ");
    const room = String(form.get("room") ?? "");
    const hotelName = (campo: "hotel" | "resort") => { const stay = activeStays.find(value => value.campo === campo); return stay?.hoteles.find(value => value.id === picks[campo])?.nombre ?? ""; };
    const hotel = hotelName("hotel"), resort = hotelName("resort");
    const contact = contactFormData(form);
    locked.current = true;
    setError(false);
    try {
      const turnstileToken = await human.ensure();
      setBusy(true);
      setResult(await requestQuote({ service: "Paquete", servicio: "Paquete", locale, currency, turnstileToken, fields: { Paquete: item.nombre, Opción: chosen, Resort: resort, Hotel: hotel, Habitación: room, Nombre: contact.name, Origen: origin, Destino: destination, Fechas: dates, Adultos: adults, Niños: children, Adicionales: addons, Notas: notes }, formData: {
        slug: item.slug, nombre: item.nombre, destino: destination,
        origin, dates, adults, children, notes,
        ...(chosen ? { option: chosen } : {}), ...(resort ? { resort } : {}), ...(hotel ? { hotel } : {}), ...(room ? { room } : {}), ...(addons ? { extras: addons } : {}),
        ...contact,
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
  const selectClass = "t-body h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 text-ink focus-visible:border-brand";
  const hasPreferences = extras.length > 0 || stays.length > 0;
  return <form onSubmit={submit} onFocusCapture={event => trackQuoteStart(event.currentTarget, "Paquete")} className="quote-form space-y-5">
    <div className="space-y-2"><h2 id={`package-quote-title-${item.id}`} className="t-h3">{t("title")}</h2>{intro && <p className="t-small text-ink-soft">{intro}</p>}</div>
    <div className="grid gap-4">
      {options.length > 1 && <fieldset className="min-w-0 space-y-3"><legend className="t-small mb-2 block">{t("option")} <span aria-hidden="true" className="text-ink-soft">*</span></legend>{options.map(value => <label key={value.id} id={optionHash(value.id)} className="flex scroll-mt-28 cursor-pointer items-start gap-3 rounded-btn border border-line bg-canvas p-3 has-checked:border-brand has-checked:bg-brand-tint"><input type="radio" name="option" value={value.id} checked={option === value.id} onChange={() => setOption(value.id)} required className="mt-1 size-4 shrink-0 accent-brand" /><span className="min-w-0"><span className="t-small block font-semibold text-ink">{value.titulo}</span>{value.costo_adicional && <span className="t-small block text-ink-soft">{t("optionExtraCost")}</span>}</span></label>)}</fieldset>}
      {activeStays.map(stay => <div key={stay.id} className="space-y-2">
        {/* "Prefiero este hotel" links land here and preselect the hotel. */}
        {stay.hoteles.map(hotel => <span key={hotel.id} id={hotelHash(hotel.id)} className="block scroll-mt-28" aria-hidden="true" />)}
        <label htmlFor={`quote-${stay.campo}-${item.id}`} className="t-small block">{t(stay.campo === "resort" ? "resort" : "hotel")} <span className="text-ink-soft">({t("optional")})</span></label>
        <select id={`quote-${stay.campo}-${item.id}`} className={selectClass} value={picks[stay.campo] ?? ""} onChange={event => setPicks(current => ({ ...current, [stay.campo]: event.target.value }))}>
          <option value="">{t("advisorPick")}</option>
          {stay.hoteles.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.nombre} · {hotel.categoria}</option>)}
        </select>
      </div>)}
      <div className="space-y-2"><label htmlFor={`quote-origin-${item.id}`} className="t-small block">{t("origin")} <span aria-hidden="true" className="text-ink-soft">*</span></label><Input id={`quote-origin-${item.id}`} name="origin" required maxLength={120} autoComplete="address-level2" /></div>
      <div className="space-y-2"><label htmlFor={`quote-destination-${item.id}`} className="t-small block">{t("destination")}</label><select id={`quote-destination-${item.id}`} name="destination-choice" className={selectClass} defaultValue={item.destino} onChange={event => setOtherDestination(event.target.value === "__other__")}><option value={item.destino}>{item.destino}</option><option value="__other__">{t("otherDestination")}</option></select>{otherDestination && <Input name="destination" required maxLength={120} placeholder={t("enterDestination")} aria-label={t("enterDestination")} autoFocus />}</div>
      <div className="space-y-2"><label htmlFor={`quote-dates-${item.id}`} className="t-small block">{t("dates")} <span aria-hidden="true" className="text-ink-soft">*</span></label><Input id={`quote-dates-${item.id}`} name="dates" required maxLength={120} placeholder={t("datesHint")} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><label htmlFor={`quote-adults-${item.id}`} className="t-small block">{t("adults")} <span aria-hidden="true" className="text-ink-soft">*</span></label><Input id={`quote-adults-${item.id}`} name="adults" type="number" inputMode="numeric" min={1} max={20} step={1} defaultValue={1} required /></div>
        <div className="space-y-2"><label htmlFor={`quote-children-${item.id}`} className="t-small block">{t("children")} <span aria-hidden="true" className="text-ink-soft">*</span></label><Input id={`quote-children-${item.id}`} name="children" type="number" inputMode="numeric" min={0} max={20} step={1} defaultValue={0} required /></div>
      </div>
      {hasPreferences && <details className="group rounded-btn border border-line bg-canvas px-3">
        <summary className="t-small flex min-h-12 cursor-pointer items-center font-semibold text-ink">{t("morePreferences")}</summary>
        <div className="space-y-5 pb-4">
          {stays.length > 0 && <div className="space-y-2"><label htmlFor={`quote-room-${item.id}`} className="t-small block">{t("room")}</label><select id={`quote-room-${item.id}`} name="room" className={selectClass} defaultValue=""><option value="">{t("roomAny")}</option>{roomKeys.map(key => <option key={key} value={t(key)}>{t(key)}</option>)}</select></div>}
          {extras.length > 0 && <fieldset className="min-w-0 space-y-2"><legend className="t-small mb-2 block">{t("extras")}</legend><p className="t-small text-ink-soft">{t("extrasHint")}</p>{extras.map((value, index) => <label key={value} htmlFor={`quote-extra-${item.id}-${index}`} className="t-small flex min-h-11 cursor-pointer items-center gap-3 text-ink"><input id={`quote-extra-${item.id}-${index}`} type="checkbox" name="extras" value={value} className="size-4 shrink-0 accent-brand" />{value}</label>)}</fieldset>}
        </div>
      </details>}
      <div className="space-y-2"><label htmlFor={`quote-notes-${item.id}`} className="t-small block">{t("notes")} <span className="text-ink-soft">({t("optional")})</span></label><textarea id={`quote-notes-${item.id}`} name="notes" maxLength={3000} rows={3} className="t-body w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand" /></div>
    </div>
    <div className="border-t border-line pt-5"><ContactFields idPrefix={`quote-contact-${item.id}`} columns={1} /></div>
    <Turnstile onToken={human.onToken} resetKey={challenge} />
    {error && <p role="alert" className="t-small rounded-btn border border-error/40 p-3 text-error">{t("error")}</p>}
    <QuoteSubmit verifying={human.verifying} busy={busy} label={t("submit")} className="sm:w-full" />
    <QuoteHowItWorks />
  </form>;
}
