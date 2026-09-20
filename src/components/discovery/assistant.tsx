"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Compass, MessageCircle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/turnstile";
import { requestQuote } from "@/lib/quote";
import { discoveryImage, discoveryDestinations, scoreDestinations, type DiscoveryAnswers, type DiscoveryDestinationProfile } from "@/lib/discovery-data";
import type { Package } from "@/lib/packages";

type PublishedDestination = { id: string; slug: string; nombre: string };

const steps = [
  { id: "travelerType", title: "¿Con quién viaja?", type: "single" },
  { id: "experiences", title: "¿Qué tipo de experiencia busca?", type: "multi" },
  { id: "budget", title: "¿Cuál es su presupuesto aproximado por persona?", type: "single" },
  { id: "climate", title: "¿Qué clima prefiere?", type: "single" },
  { id: "duration", title: "¿Qué duración tiene en mente?", type: "single" },
  { id: "interests", title: "¿Qué intereses quiere incluir?", type: "multi" },
  { id: "travelers", title: "¿Cuántas personas viajarán?", type: "number" },
] as const;

const labels = {
  travelerType: { pareja: "Pareja", familia: "Familia", amigos: "Amigos", solo: "Solo" },
  experiences: { playa: "Playa y relax", ciudad: "Ciudad y cultura", aventura: "Aventura y naturaleza", lujo: "Lujo", familiar: "Familiar", fiesta: "Fiesta y vida nocturna", romance: "Romance" },
  budget: { económico: "Económico", medio: "Medio", alto: "Alto" },
  climate: { cálido: "Cálido", templado: "Templado", indiferente: "Indiferente" },
  duration: { corta: "Fin de semana", media: "Una semana", larga: "Dos semanas o más" },
  interests: { gastronomía: "Gastronomía", cultura: "Historia y cultura", naturaleza: "Naturaleza", compras: "Compras", playa: "Playa", "vida nocturna": "Vida nocturna", familia: "Familia" },
} as const;

const initialAnswers: DiscoveryAnswers = { travelerType: "pareja", experiences: [], budget: "medio", climate: "indiferente", duration: "media", interests: [], travelers: 1 };

function displayPackagePrice(item: Package) {
  if (item.precio_desde === null) return "Precio referencial; pida su cotización";
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(item.precio_desde);
  return `desde ${item.moneda === "USD" ? "$" : item.moneda === "HNL" ? "L " : ""}${amount} ${item.moneda}`;
}

function slugForDestination(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function DiscoveryAssistant({ destinations, packages }: { destinations: PublishedDestination[]; packages: Package[] }) {
  const [answers, setAnswers] = useState<DiscoveryAnswers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [completedAnswers, setCompletedAnswers] = useState<DiscoveryAnswers | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const profiles = useMemo(() => destinations.map(destination => discoveryDestinations.find(profile => profile.slug === destination.slug)).filter((profile): profile is DiscoveryDestinationProfile => Boolean(profile)), [destinations]);
  const recommendations = useMemo(() => {
    if (!completedAnswers) return [];
    return scoreDestinations(completedAnswers, profiles).map(recommendation => ({
      ...recommendation,
      destinationId: destinations.find(destination => destination.slug === recommendation.slug)?.id,
      displayName: destinations.find(destination => destination.slug === recommendation.slug)?.nombre || recommendation.nombre,
    }));
  }, [completedAnswers, destinations, profiles]);

  const currentStep = steps[step];
  const isComplete = currentStep.id === "travelers" ? answers.travelers >= 1 && answers.travelers <= 20 : currentStep.id === "experiences" ? answers.experiences.length > 0 : currentStep.id === "interests" ? answers.interests.length > 0 : true;

  function updateAnswer(field: keyof DiscoveryAnswers, value: string | string[] | number) {
    setAnswers(current => ({ ...current, [field]: value } as DiscoveryAnswers));
  }

  function toggleMulti(field: "experiences" | "interests", value: string) {
    const current = answers[field] as string[];
    updateAnswer(field, current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  }

  function advance() {
    if (!isComplete) return;
    if (step === steps.length - 1) { setCompletedAnswers(answers); return; }
    setStep(current => current + 1);
  }

  function startOver() {
    setAnswers(initialAnswers);
    setStep(0);
    setCompletedAnswers(null);
    setTurnstileToken("");
    setError(false);
  }

  async function sendToWhatsApp() {
    if (!completedAnswers || !turnstileToken || busy) return;
    setBusy(true); setError(false);
    const pickNames = recommendations.map(item => item.displayName).join(", ");
    const payload = {
      service: "Descubrimiento", servicio: "descubrimiento", turnstileToken,
      fields: {
        Destino: pickNames,
        "Con quién viaja": labels.travelerType[completedAnswers.travelerType],
        Experiencia: completedAnswers.experiences.map(item => labels.experiences[item]).join(", "),
        Presupuesto: labels.budget[completedAnswers.budget],
        Clima: labels.climate[completedAnswers.climate],
        Duración: labels.duration[completedAnswers.duration],
        Intereses: completedAnswers.interests.map(item => labels.interests[item]).join(", "),
        Viajeros: String(completedAnswers.travelers),
        Recomendaciones: pickNames,
      },
      formData: {
        travelerType: completedAnswers.travelerType,
        experiences: completedAnswers.experiences.join(", "),
        budget: completedAnswers.budget,
        climate: completedAnswers.climate,
        duration: completedAnswers.duration,
        interests: completedAnswers.interests.join(", "),
        travelers: String(completedAnswers.travelers),
        recommendations: pickNames,
      },
    };
    try { await requestQuote(payload); } catch { setError(true); setBusy(false); }
  }

  if (completedAnswers) return <DiscoveryResults recommendations={recommendations} answers={completedAnswers} packages={packages} turnstileToken={turnstileToken} setTurnstileToken={setTurnstileToken} busy={busy} error={error} onSend={sendToWhatsApp} onStartOver={startOver} />;

  return <section className="rounded-panel border border-line bg-canvas p-4 shadow-sm sm:p-8" aria-labelledby="discovery-form-title">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><p className="t-small mb-2 text-brand">Paso {step + 1} de {steps.length}</p><h2 id="discovery-form-title" className="t-h2">{currentStep.title}</h2></div>
      <Compass size={32} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
    </div>
    <div className="mb-8" role="progressbar" aria-label={`Progreso: paso ${step + 1} de ${steps.length}`} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><div className="h-2 overflow-hidden rounded-btn bg-surface"><div className="h-full bg-brand transition-[width] duration-(--duration-fast) ease-out motion-reduce:transition-none" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
    <fieldset className="space-y-4"><legend className="sr-only">{currentStep.title}</legend>
      {currentStep.id === "travelerType" && <OptionList name="travelerType" options={Object.entries(labels.travelerType)} selected={answers.travelerType} onSingle={value => updateAnswer("travelerType", value)} />}
      {currentStep.id === "experiences" && <OptionList name="experiences" options={Object.entries(labels.experiences)} selected={answers.experiences} onMulti={value => toggleMulti("experiences", value)} multi />}
      {currentStep.id === "budget" && <OptionList name="budget" options={Object.entries(labels.budget)} selected={answers.budget} onSingle={value => updateAnswer("budget", value)} />}
      {currentStep.id === "climate" && <OptionList name="climate" options={Object.entries(labels.climate)} selected={answers.climate} onSingle={value => updateAnswer("climate", value)} />}
      {currentStep.id === "duration" && <OptionList name="duration" options={Object.entries(labels.duration)} selected={answers.duration} onSingle={value => updateAnswer("duration", value)} />}
      {currentStep.id === "interests" && <OptionList name="interests" options={Object.entries(labels.interests)} selected={answers.interests} onMulti={value => toggleMulti("interests", value)} multi />}
      {currentStep.id === "travelers" && <div className="max-w-sm space-y-2"><label className="t-small block" htmlFor="discovery-travelers">Número de viajeros</label><input id="discovery-travelers" type="number" inputMode="numeric" min={1} max={20} value={answers.travelers} onChange={event => updateAnswer("travelers", Math.min(20, Math.max(0, Number(event.target.value))))} className="t-body h-12 w-full rounded-btn border border-line bg-canvas px-3 py-2 focus-visible:border-brand" aria-describedby="discovery-travelers-help" /><p id="discovery-travelers-help" className="t-small text-ink-soft">Indique un número entre 1 y 20.</p></div>}
    </fieldset>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
      <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(current => current - 1)}><ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />Anterior</Button>
      <Button type="button" disabled={!isComplete} onClick={advance}>{step === steps.length - 1 ? "Ver recomendaciones" : "Continuar"}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Button>
    </div>
  </section>;
}

function OptionList({ name, options, selected, onSingle, onMulti, multi = false }: { name: string; options: [string, string][]; selected: string | string[]; onSingle?: (value: string) => void; onMulti?: (value: string) => void; multi?: boolean }) {
  return <div className="grid gap-3 sm:grid-cols-2">{options.map(([value, label]) => { const active = Array.isArray(selected) ? selected.includes(value) : selected === value; return <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-btn border px-4 py-3 transition-colors duration-(--duration-fast) ease-out ${active ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-canvas hover:bg-surface"}`}><input type={multi ? "checkbox" : "radio"} name={name} value={value} checked={active} onChange={() => multi ? onMulti?.(value) : onSingle?.(value)} className="h-4 w-4 accent-brand" /> <span className="t-body">{label}</span>{active && <Check size={18} strokeWidth={2} className="ml-auto" aria-hidden="true" />}</label>; })}</div>;
}

function DiscoveryResults({ recommendations, answers, packages, turnstileToken, setTurnstileToken, busy, error, onSend, onStartOver }: { recommendations: Array<ReturnType<typeof scoreDestinations>[number] & { destinationId?: string; displayName: string }>; answers: DiscoveryAnswers; packages: Package[]; turnstileToken: string; setTurnstileToken: (token: string) => void; busy: boolean; error: boolean; onSend: () => void; onStartOver: () => void }) {
  return <section aria-labelledby="discovery-results-title">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div className="space-y-3"><p className="t-small text-brand">Resultado de su selección</p><h2 id="discovery-results-title" className="t-h2">Recomendaciones personalizadas según sus preferencias</h2><p className="t-body-lg measure text-ink-soft">Estas opciones parten de sus respuestas. Un asesor confirma los detalles y le ayuda a elegir el viaje adecuado para usted.</p></div><Button type="button" variant="ghost" onClick={onStartOver}><RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />Cambiar respuestas</Button></div>
    <div className="grid gap-6 lg:grid-cols-3">{recommendations.map(item => <article key={item.slug} className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm"><Link href={`/destinos/${item.slug}`} className="group block"><div className="relative aspect-[4/3] overflow-hidden bg-surface"><Image src={discoveryImage(item.slug)} alt={`Fotografía de ${item.displayName}`} fill sizes="(max-width: 1023px) calc(100vw - 32px), (max-width: 1199px) calc((100vw - 72px) / 2), 368px" className="object-cover transition-transform duration-(--duration-reveal) ease-out group-hover:scale-[1.03] motion-reduce:transition-none" /></div><div className="p-6"><div className="flex items-start justify-between gap-4"><h3 className="t-h3">{item.displayName}</h3><ArrowRight size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-brand" aria-hidden="true" /></div><p className="t-body mt-4 text-ink-soft">{item.why}</p><span className="t-small mt-4 inline-flex text-brand underline underline-offset-4">Conocer destino</span></div></Link><MatchingPackages destinationId={item.destinationId} destinationName={item.displayName} packages={packages} /></article>)}</div>
    <div className="mt-8 rounded-panel border border-line bg-surface p-6 sm:p-8"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><h3 className="t-h3">Lleve estas opciones a una conversación</h3><p className="t-body mt-2 text-ink-soft">Comparta sus preferencias y destinos recomendados con un asesor de viatour.</p></div><div className="min-w-0"><Turnstile onToken={setTurnstileToken} /><Button type="button" variant="whatsapp" disabled={busy || !turnstileToken} aria-busy={busy} onClick={onSend}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{busy ? "Guardando solicitud" : "Reciba estas opciones por WhatsApp"}</Button>{error && <p role="alert" className="t-small mt-3 text-error">No se pudo enviar su solicitud. Inténtelo nuevamente.</p>}</div></div></div>
    <p className="t-small mt-6 text-ink-soft">Usted seleccionó {labels.travelerType[answers.travelerType].toLowerCase()}, para {labels.duration[answers.duration].toLowerCase()} y {answers.travelers} {answers.travelers === 1 ? "viajero" : "viajeros"}.</p>
  </section>;
}

function MatchingPackages({ destinationId, destinationName, packages }: { destinationId?: string; destinationName: string; packages: Package[] }) {
  const matches = packages.filter(item => (destinationId && item.destination_id === destinationId) || slugForDestination(item.destino) === slugForDestination(destinationName));
  if (!matches.length) return null;
  return <div className="border-t border-line bg-surface p-6"><p className="t-small mb-4 text-ink-soft">Paquetes publicados para {destinationName}</p><div className="space-y-4">{matches.map(item => <div key={item.id} className="space-y-2"><Link href={`/paquetes/${item.slug}`} className="t-body inline-flex min-h-12 items-center text-brand underline underline-offset-4">{item.nombre}</Link><p className="t-small text-ink-soft">{item.duracion} · {displayPackagePrice(item)}</p></div>)}</div></div>;
}
