"use client";

import { useId, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { CalendarDays, MapPin, Plane, Hotel, Package, Compass, Users, UserRound, Armchair, NotebookPen, Plus, Trash2, MessageCircle, Wallet, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrency } from "@/components/currency-provider";
import { launchDestinations } from "@/lib/launch-destinations";
import { requestQuote } from "@/lib/quote";

const services = [{ name: "Vuelos", icon: Plane }, { name: "Hoteles", icon: Hotel }, { name: "Paquetes", icon: Package }, { name: "Viaje a medida", icon: Compass }];
const controlClass = "t-body h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 text-ink focus-visible:border-brand aria-invalid:border-error";

// Copy pendiente de aprobación final
// Functional labels, validation messages and message wording are drafts for final review.
function Field({ label, icon: Icon, options, multiline, ...props }: ComponentProps<"input"> & { label: string; icon: LucideIcon; options?: string[]; multiline?: boolean }) {
  const id = useId();
  const shared = { id, name: props.name, required: props.required, disabled: props.disabled, defaultValue: props.defaultValue, className: controlClass };
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="t-small flex items-center gap-2"><Icon size={16} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{label}{props.required && <span aria-hidden="true">*</span>}</label>
    {options ? <select {...shared}>{options.map(option => <option key={option}>{option}</option>)}</select> : multiline ? <textarea {...shared} className={`${controlClass} h-24 resize-y`} /> : <Input {...props} id={id} />}
  </div>;
}

function QuoteForm({ service }: { service: string }) {
  const { currency } = useCurrency();
  const [type, setType] = useState("Ida y vuelta");
  const [segments, setSegments] = useState([0, 1]);
  const nextSegment = useRef(2);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const errorId = useId();
  const flight = service === "Vuelos";
  const hotel = service === "Hoteles";
  const custom = service === "Viaje a medida";
  const multi = flight && type === "Multidestino";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    setError("");
    const dates = multi ? segments.map(id => value(`date-${id}`)) : [value("start"), value("end")].filter(Boolean);
    if (dates.some((date, index) => index > 0 && date < dates[index - 1])) {
      setError("Revise las fechas: deben seguir el orden de su viaje.");
      form.querySelector<HTMLInputElement>(multi ? `[name="date-${segments[1]}"]` : '[name="end"]')?.focus();
      return;
    }
    const fields: Record<string, string> = {
      Nombre: value("name"), Tipo: flight ? type : "", Origen: value("origin"), Destino: value("destination"),
      Fechas: dates.length ? dates.join(" / ") : value("approximate"),
      [hotel ? "Huéspedes" : "Pasajeros"]: `Adultos: ${value("adults")}; niños: ${value("children")}`,
      Clase: value("class"), Habitaciones: value("rooms"),
      "Presupuesto aproximado": value("budget") ? `${value("budget")} ${currency}` : "", Notas: value("notes"),
    };
    if (multi) segments.forEach((id, index) => { fields[`Tramo ${index + 1}`] = `Origen: ${value(`origin-${id}`)}; Destino: ${value(`destination-${id}`)}; Fecha: ${value(`date-${id}`)}`; });
    locked.current = true; setBusy(true);
    try { await requestQuote({ service, fields, currency, formData: Object.fromEntries(Array.from(data.entries(), ([key, entry]) => [key, String(entry)])) }); }
    catch { setError("No se pudo enviar su solicitud. Por favor, inténtelo de nuevo."); }
    finally { locked.current = false; setBusy(false); }
  }

  return <form onSubmit={submit} onInvalid={event => {
    (event.target as HTMLInputElement).setAttribute("aria-invalid", "true");
    setError("Revise los campos obligatorios y los valores indicados.");
  }} onInput={event => {
    const field = event.target as HTMLInputElement;
    if (field.validity?.valid) field.removeAttribute("aria-invalid");
  }} className="quote-form space-y-6" aria-label={`Cotización de ${service}`} aria-describedby={error ? errorId : undefined}>
    <p className="t-small text-ink-soft">Los campos marcados con * son obligatorios.</p>
    {flight && <div className="sm:max-w-64"><label className="t-small mb-2 block" htmlFor="flight-type">Tipo de viaje *</label><select id="flight-type" className={controlClass} value={type} onChange={event => { setType(event.target.value); setError(""); }}><option>Ida y vuelta</option><option>Solo ida</option><option>Multidestino</option></select></div>}
    {multi ? <div className="space-y-4">{segments.map((id, index) => <fieldset key={id} className="rounded-card border border-line p-4"><legend className="t-small px-2">Tramo {index + 1}</legend><div className="grid gap-6 sm:grid-cols-3">
      <Field label="Origen" name={`origin-${id}`} icon={Plane} required />
      <Field label="Destino" name={`destination-${id}`} icon={MapPin} required />
      <Field label="Fecha" name={`date-${id}`} type="date" min={today} icon={CalendarDays} required />
    </div>{segments.length > 2 && <Button type="button" variant="ghost" className="mt-4" aria-label={`Eliminar tramo ${index + 1}`} onClick={() => setSegments(segments.filter(segment => segment !== id))}><Trash2 size={16} className="text-ink-soft" aria-hidden="true" />Eliminar tramo</Button>}</fieldset>)}<Button type="button" variant="ghost" onClick={() => setSegments([...segments, nextSegment.current++])}><Plus size={16} className="text-ink-soft" aria-hidden="true" />Agregar tramo</Button></div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {flight && <Field label="Origen" name="origin" icon={Plane} required />}
      <Field label={hotel ? "Destino / ciudad" : custom ? "Destino(s) de interés" : "Destino"} name="destination" icon={MapPin} required options={service === "Paquetes" ? launchDestinations : undefined} />
      {flight || hotel ? <><Field label={hotel ? "Entrada" : "Salida"} name="start" type="date" min={today} icon={CalendarDays} required /><Field label={hotel ? "Salida" : "Regreso"} name="end" type="date" min={today} icon={CalendarDays} disabled={flight && type === "Solo ida"} required={hotel || type === "Ida y vuelta"} /></> : <Field label="Fechas aproximadas" name="approximate" icon={CalendarDays} required />}
    </div>}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Adultos" name="adults" type="number" min={1} step={1} defaultValue={1} icon={Users} required />
      <Field label="Niños" name="children" type="number" min={0} step={1} defaultValue={0} icon={Users} required />
      {flight && <Field label="Clase" name="class" options={["Económica", "Premium", "Ejecutiva", "Primera"]} icon={Armchair} required />}
      {hotel && <Field label="Habitaciones" name="rooms" type="number" min={1} step={1} defaultValue={1} icon={Hotel} required />}
      {custom && <Field label={`Presupuesto aproximado (${currency}, opcional)`} name="budget" type="number" min={0} step="0.01" icon={Wallet} />}
      <Field label="Nombre (opcional)" name="name" autoComplete="given-name" icon={UserRound} />
    </div>
    <Field label="Notas (opcional)" name="notes" icon={NotebookPen} multiline />
    {error && <p id={errorId} role="alert" className="t-small text-error">{error}</p>}
    <div className="flex justify-end border-t border-line pt-6"><Button type="submit" variant="whatsapp" disabled={busy} aria-busy={busy} className="h-auto min-h-12 w-full whitespace-normal leading-normal sm:w-auto"><MessageCircle size={24} strokeWidth={1.75} className="shrink-0 text-ink-soft" aria-hidden="true" />Solicitar cotización por WhatsApp</Button></div>
  </form>;
}

export function FlightTool() {
  return <Tabs defaultValue="Vuelos" className="rounded-panel border border-line bg-canvas text-left shadow-sm"><TabsList aria-label="Servicio de viaje">{services.map(({ name, icon: Icon }) => <TabsTrigger key={name} value={name}><Icon size={20} strokeWidth={1.75} aria-hidden="true" />{name}</TabsTrigger>)}</TabsList>{services.map(({ name }) => <TabsContent key={name} value={name}><QuoteForm service={name} /></TabsContent>)}</Tabs>;
}
