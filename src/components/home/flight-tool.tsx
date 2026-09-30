"use client";

import { Turnstile } from "@/components/turnstile";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { CalendarDays, MapPin, Plane, Hotel, Package, Compass, Users, Armchair, NotebookPen, Plus, ChevronDown, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrency } from "@/components/currency-provider";
import { launchDestinations } from "@/lib/launch-destinations";
import { requestQuote, type QuoteResult } from "@/lib/quote";
import { ContactFields, QuoteSubmit, QuoteSuccess } from "@/components/quote/quote-parts";

const serviceData = [{ value: "Vuelos", key: "flights", icon: Plane }, { value: "Hoteles", key: "hotels", icon: Hotel }, { value: "Paquetes", key: "packages", icon: Package }, { value: "Viaje a medida", key: "customTrip", icon: Compass }];
export type FlightToolTab = "vuelos" | "hoteles" | "paquetes" | "medida";
const tabServices: Record<FlightToolTab, string> = { vuelos: "Vuelos", hoteles: "Hoteles", paquetes: "Paquetes", medida: "Viaje a medida" };
const controlClass = "t-body h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 text-ink transition-colors duration-(--duration-fast) ease-out hover:border-ink-soft/40 focus-visible:border-brand aria-invalid:border-error";
type Option = { value: string; label: string };

// Compact mode (home hero): a summary field that opens its inputs. Full mode renders the inputs directly
// (a <details> with display: contents is not honoured by every browser, which collapsed the full grid).
function CompactGroup({ compact, label, summary, children }: { compact: boolean; label: string; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!compact) return <>{children}</>;
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="relative min-w-0">
    <summary className="cursor-pointer list-none space-y-2 rounded-btn focus-visible:outline-brand [&::-webkit-details-marker]:hidden"><span className="t-small block">{label}</span><span className={`${controlClass} flex items-center justify-between gap-2`}><span className="truncate">{summary}</span><ChevronDown size={16} strokeWidth={1.75} className={`shrink-0 text-ink-soft transition-transform duration-(--duration-fast) ${open ? "rotate-180" : ""}`} aria-hidden="true" /></span></summary>
    <div className="relative z-20 mt-2 space-y-4 rounded-card border border-line bg-canvas p-4 shadow-md lg:absolute lg:left-0 lg:top-full lg:min-w-72">{children}</div>
  </details>;
}

function Field({ label, icon: Icon, options, multiline, otherOption = false, otherLabel = "Other", otherHint, enterDestination = "Enter your destination", selectLabel = label, ...props }: ComponentProps<"input"> & { label: string; icon: LucideIcon; options?: Option[]; multiline?: boolean; otherOption?: boolean; otherLabel?: string; otherHint?: string; enterDestination?: string; selectLabel?: string }) { const id = useId(); const [other, setOther] = useState(false); const shared = { id, name: other ? `${props.name}-choice` : props.name, required: props.required && !other, disabled: props.disabled, defaultValue: props.defaultValue, className: controlClass }; return <div className="min-w-0 space-y-2"><label htmlFor={id} className="t-small flex items-center gap-2"><Icon size={16} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden="true" />{label}{props.required && <span aria-hidden="true" className="text-ink-soft">*</span>}</label>{options ? <><select {...shared} onChange={event => setOther(otherOption && event.target.value === "__other__")}><option value="">{selectLabel}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}{otherOption && <option value="__other__">{otherLabel}</option>}</select>{other && <Input name={props.name} required={props.required} maxLength={120} placeholder={enterDestination} aria-label={enterDestination} autoFocus />}</> : multiline ? <textarea {...shared} className={`${controlClass} h-24 resize-y`} /> : <Input {...props} id={id} />}{otherOption && otherHint && <p className="t-small text-ink-soft">{otherHint}</p>}</div>; }

// Trip type as a segmented control: all three options are visible and one tap away.
function TripType({ value, options, label, onChange }: { value: string; options: Option[]; label: string; onChange: (value: string) => void }) {
  const name = useId();
  return <fieldset className="min-w-0"><legend className="t-small mb-2">{label}</legend><div className="inline-flex max-w-full flex-wrap gap-1 rounded-btn border border-line bg-surface p-1">{options.map(option => <label key={option.value} className={`t-small flex min-h-10 cursor-pointer items-center rounded-btn px-3 transition-colors duration-(--duration-fast) ease-out has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-tint ${value === option.value ? "bg-canvas font-semibold text-brand shadow-sm" : "text-ink-soft hover:text-ink"}`}><input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />{option.label}</label>)}</div></fieldset>;
}

function QuoteForm({ service, compact = false, serviceControl, optionsControl, onExpand }: { service: string; compact?: boolean; serviceControl?: ReactNode; optionsControl?: ReactNode; onExpand?: () => void }) {
  const t = useTranslations();
  const [turnstileToken, setTurnstileToken] = useState(""); const [challenge, setChallenge] = useState(0); const { currency } = useCurrency(); const [type, setType] = useState("Ida y vuelta"); const [segments, setSegments] = useState([0, 1]); const nextSegment = useRef(2); const [busy, setBusy] = useState(false); const locked = useRef(false); const [error, setError] = useState(""); const errorId = useId(); const [summary, setSummary] = useState<Record<string, string>>({ adults: "1", children: "0" }); const [result, setResult] = useState<QuoteResult | null>(null); const contactId = useId();
  const flight = service === "Vuelos"; const hotel = service === "Hoteles"; const custom = service === "Viaje a medida"; const multi = flight && type === "Multidestino"; const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const typeOptions: Option[] = [{ value: "Ida y vuelta", label: t("quote.roundTrip") }, { value: "Solo ida", label: t("quote.oneWay") }, { value: "Multidestino", label: t("quote.multiCity") }];
  const classOptions: Option[] = [{ value: "Económica", label: t("quote.economy") }, { value: "Premium", label: t("quote.premium") }, { value: "Ejecutiva", label: t("quote.business") }, { value: "Primera", label: t("quote.first") }];
  const destinationOptions = launchDestinations.map(value => ({ value, label: value }));
  const destinationProps = { icon: MapPin, required: true, options: destinationOptions, otherOption: true, otherLabel: t("quote.otherDestination"), otherHint: t("quote.otherDestinationHint"), enterDestination: t("quote.enterDestination"), selectLabel: t("quote.destination") };

  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (locked.current) return; const form = event.currentTarget; const data = new FormData(form); const value = (name: string) => String(data.get(name) ?? "").trim(); setError(""); const dates = multi ? segments.map(id => value(`date-${id}`)) : [value("start"), value("end")].filter(Boolean); if (dates.some((date, index) => index > 0 && date < dates[index - 1])) { setError(t("quote.dateOrderError")); const field = form.querySelector<HTMLInputElement>(multi ? `[name="date-${segments[1]}"]` : '[name="end"]'); const group = field?.closest("details"); if (group) group.open = true; field?.focus(); return; } const fields: Record<string, string> = { Nombre: value("name"), Tipo: flight ? type : "", Origen: value("origin"), Destino: value("destination"), Fechas: dates.length ? dates.join(" / ") : value("approximate"), [hotel ? "Huéspedes" : "Pasajeros"]: `Adultos: ${value("adults")}; niños: ${value("children")}`, Clase: value("class"), Habitaciones: value("rooms"), "Presupuesto aproximado": value("budget") ? `${value("budget")} ${currency}` : "", Notas: value("notes") }; if (multi) segments.forEach((id, index) => { fields[`Tramo ${index + 1}`] = `Origen: ${value(`origin-${id}`)}; Destino: ${value(`destination-${id}`)}; Fecha: ${value(`date-${id}`)}`; }); locked.current = true; setBusy(true); try { setResult(await requestQuote({ service, fields, currency, turnstileToken, website: value("website"), formData: Object.fromEntries(Array.from(data.entries(), ([key, entry]) => [key, String(entry)])) })); } catch { setError(t("quote.error")); } finally { locked.current = false; setBusy(false); setChallenge(n => n + 1); } }

  if (result) return <QuoteSuccess result={result} service={service} onReset={() => setResult(null)} />;
  const datesSummary = [summary.start, summary.end].filter(Boolean).join(" / ") || summary.approximate || t("quote.dates");
  const dateFields = flight || hotel
    ? <><Field label={hotel ? t("quote.checkIn") : t("quote.departure")} name="start" type="date" min={today} icon={CalendarDays} required /><Field label={hotel ? t("quote.checkOut") : t("quote.return")} name="end" type="date" min={today} icon={CalendarDays} disabled={flight && type === "Solo ida"} required={hotel || type === "Ida y vuelta"} /></>
    : <Field label={t("quote.approxDates")} name="approximate" icon={CalendarDays} required />;
  const travelerFields = <><Field label={t("quote.adults")} name="adults" type="number" inputMode="numeric" min={1} step={1} defaultValue={1} icon={Users} required /><Field label={t("quote.children")} name="children" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} icon={Users} required />{hotel && <Field label={t("quote.rooms")} name="rooms" type="number" inputMode="numeric" min={1} step={1} defaultValue={1} icon={Hotel} required />}</>;

  return <form onSubmit={submit} onInvalid={event => { const group = (event.target as HTMLInputElement).closest("details"); if (group) group.open = true; (event.target as HTMLInputElement).setAttribute("aria-invalid", "true"); setError(t("quote.requiredError")); }} onInput={event => { const field = event.target as HTMLInputElement; if (field.validity?.valid) field.removeAttribute("aria-invalid"); if (compact) setSummary(previous => ({ ...previous, [field.name]: field.value })); }} className="quote-form flex flex-col gap-6" aria-label={t("quote.quoteFor", { service: t(`common.${serviceData.find(item => item.value === service)?.key || "flights"}`) })} aria-describedby={error ? errorId : undefined}>
    {compact
      ? <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">{serviceControl}</div>
          <CompactGroup compact label={t("quote.destination")} summary={summary.destination || t("quote.destination")}>{flight && <Field label={t("quote.origin")} name="origin" icon={Plane} required />}<Field label={hotel ? t("quote.destinationCity") : custom ? t("quote.destinationInterest") : t("quote.destination")} name="destination" {...destinationProps} /></CompactGroup>
          <CompactGroup compact label={t("quote.dates")} summary={datesSummary}>{dateFields}</CompactGroup>
          <CompactGroup compact label={t("quote.travelers")} summary={`${t("quote.adults")}: ${summary.adults}; ${t("quote.children")}: ${summary.children}`}>{travelerFields}</CompactGroup>
        </div>
      : <div className="space-y-6">
          {flight && <TripType value={type} options={typeOptions} label={t("quote.serviceType")} onChange={value => { setType(value); setError(""); if (value === "Multidestino") onExpand?.(); }} />}
          {multi
            ? <div className="space-y-4">{segments.map((id, index) => <fieldset key={id} className="rounded-card border border-line p-4"><legend className="t-small px-2">{t("quote.segment", { number: index + 1 })}</legend><div className="grid gap-4 sm:grid-cols-3"><Field label={t("quote.origin")} name={`origin-${id}`} icon={Plane} required /><Field label={t("quote.destination")} name={`destination-${id}`} {...destinationProps} /><Field label={t("quote.dates")} name={`date-${id}`} type="date" min={today} icon={CalendarDays} required /></div>{segments.length > 2 && <Button type="button" variant="ghost" className="mt-4" aria-label={t("quote.removeSegment", { number: index + 1 })} onClick={() => setSegments(segments.filter(segment => segment !== id))}><Trash2 size={16} className="text-ink-soft" aria-hidden="true" />{t("quote.removeSegment", { number: index + 1 })}</Button>}</fieldset>)}<Button type="button" variant="ghost" disabled={segments.length >= 6} onClick={() => setSegments([...segments, nextSegment.current++])}><Plus size={16} className="text-ink-soft" aria-hidden="true" />{t("quote.addSegment")}</Button></div>
            : <div className={`grid gap-4 sm:grid-cols-2 ${flight || hotel ? "lg:grid-cols-4" : ""}`}>{flight && <Field label={t("quote.origin")} name="origin" icon={Plane} required />}<div className={hotel ? "min-w-0 lg:col-span-2" : "min-w-0"}><Field label={hotel ? t("quote.destinationCity") : custom ? t("quote.destinationInterest") : t("quote.destination")} name="destination" {...destinationProps} /></div>{dateFields}</div>}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{travelerFields}{flight && <div className="col-span-2 min-w-0 sm:col-span-1"><Field label={t("quote.class")} name="class" options={classOptions} icon={Armchair} required /></div>}{custom && <div className="col-span-2 min-w-0"><Field label={t("quote.budget", { currency })} name="budget" type="number" inputMode="decimal" min={0} step="0.01" icon={Wallet} /></div>}</div>
          <Field label={t("quote.notes")} name="notes" icon={NotebookPen} multiline />
        </div>}
    <div className="border-t border-line pt-6"><ContactFields idPrefix={contactId} columns={compact ? 2 : 3} hideEmail={compact} /></div>
    <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
    <Turnstile onToken={setTurnstileToken} resetKey={challenge} />
    {error && <p id={errorId} role="alert" className="t-small rounded-btn border border-error/40 bg-canvas p-3 text-error">{error}</p>}
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {optionsControl ?? <p className="t-small text-ink-soft">{t("common.requiredFields")}</p>}
      <QuoteSubmit ready={!!turnstileToken} busy={busy} label={t("common.requestQuoteWhatsapp")} />
    </div>
  </form>;
}

export function FlightTool({ compact = false, heading, defaultTab = "vuelos" }: { compact?: boolean; heading?: ReactNode; defaultTab?: FlightToolTab }) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(!compact);
  const [service, setService] = useState(() => tabServices[defaultTab]);
  const serviceId = useId(); const panelId = useId();
  const tool = useRef<HTMLDivElement>(null);
  const compactView = compact && !expanded;
  const expand = () => { setExpanded(true); window.requestAnimationFrame(() => tool.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus()); };
  return <Tabs ref={tool} value={service} onValueChange={setService} className="min-w-0 rounded-panel border border-line bg-canvas text-left text-ink shadow-md">
    {heading}
    <div id={panelId}>
      <div hidden={compactView}><TabsList aria-label={t("common.services")}>{serviceData.map(({ value, key, icon: Icon }) => <TabsTrigger key={value} value={value}><Icon size={20} strokeWidth={1.75} aria-hidden="true" />{t(`common.${key}`)}</TabsTrigger>)}</TabsList></div>
      {serviceData.map(({ value, key }) => <TabsContent key={value} value={value} {...(compactView ? { "aria-label": t("quote.quoteFor", { service: t(`common.${key}`) }), "aria-labelledby": undefined } : {})}>
        <QuoteForm service={value} compact={compactView} onExpand={compact ? expand : undefined}
          optionsControl={compactView ? <button type="button" className="t-small inline-flex min-h-12 items-center gap-2 self-center rounded-btn px-2 text-brand underline underline-offset-4 hover:text-brand-deep sm:self-auto" aria-expanded={expanded} aria-controls={panelId} onClick={expand}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />{t("quote.moreOptions")}</button> : undefined}
          serviceControl={compactView ? <div className="space-y-2"><label htmlFor={serviceId} className="t-small block">{t("quote.serviceType")}</label><select id={serviceId} className={controlClass} value={service} onChange={event => setService(event.target.value)}>{serviceData.map(item => <option key={item.value} value={item.value}>{t(`common.${item.key}`)}</option>)}</select></div> : undefined} />
      </TabsContent>)}
    </div>
  </Tabs>;
}
