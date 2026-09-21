"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publishedRequirementDestinations } from "@/lib/requirements/destinations";
import { siteConfig } from "@/lib/site-config";
import type { RequirementsResult } from "@/lib/requirements/types";

const iataTravelCentreUrl = "https://www.iatatravelcentre.com/";
const otherDestination = "__otro__";
const selectClassName = "h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 t-body text-ink transition-colors duration-(--duration-fast) ease-out focus-visible:border-brand";

function whatsappHref({ destino, fechas, transitos }: { destino: string; fechas: string; transitos: string }) {
  const lines = [
    "Hola, quisiera confirmar los requisitos de mi viaje.",
    "Nacionalidad: Honduras",
    `Destino: ${destino}`,
    fechas.trim() ? `Fechas: ${fechas.trim()}` : "Fechas: por confirmar",
  ];
  if (transitos.trim()) lines.push(`Tránsitos: ${transitos.trim()}`);
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function LinkIcon() {
  return <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />;
}

export function RequirementsChecker() {
  const [destinationChoice, setDestinationChoice] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [dates, setDates] = useState("");
  const [transits, setTransits] = useState("");
  const [result, setResult] = useState<RequirementsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState(false);

  const destination = destinationChoice === otherDestination ? customDestination.trim() : destinationChoice;
  const contactHref = useMemo(() => whatsappHref({ destino: destination || "por confirmar", fechas: dates, transitos: transits }), [destination, dates, transits]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destination) return;
    setBusy(true);
    setResult(null);
    setRequestError(false);
    try {
      const response = await fetch("/api/requisitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nacionalidad: "HN", destino: destination, fechas: dates || undefined, transitos: transits || undefined }),
      });
      const payload = (await response.json()) as RequirementsResult;
      if (!response.ok || (payload.status !== "ok" && payload.status !== "unknown" && payload.status !== "error")) {
        setRequestError(true);
      } else {
        setResult(payload);
      }
    } catch {
      setRequestError(true);
    } finally {
      setBusy(false);
    }
  }

  const showFallback = requestError || result?.status === "unknown" || result?.status === "error";
  const data = result?.status === "ok" ? result.data : undefined;

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8" aria-describedby="requirements-form-help">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="requirements-nationality" className="t-small">Nacionalidad del pasaporte</label>
            <select id="requirements-nationality" className={selectClassName} value="HN" disabled aria-readonly="true">
              <option value="HN">Honduras</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="requirements-destination" className="t-small">Destino</label>
            <select id="requirements-destination" className={selectClassName} value={destinationChoice} onChange={event => setDestinationChoice(event.target.value)} required>
              <option value="">Seleccione un destino</option>
              {publishedRequirementDestinations.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              <option value={otherDestination}>Otro destino</option>
            </select>
          </div>

          {destinationChoice === otherDestination && (
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="requirements-custom-destination" className="t-small">Escriba su destino</label>
              <Input id="requirements-custom-destination" value={customDestination} onChange={event => setCustomDestination(event.target.value)} placeholder="Por ejemplo, Madrid" required maxLength={120} />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="requirements-dates" className="t-small">Fechas del viaje <span className="font-normal text-ink-soft">(opcional)</span></label>
            <Input id="requirements-dates" value={dates} onChange={event => setDates(event.target.value)} placeholder="Por ejemplo, del 10 al 18 de julio" maxLength={120} />
          </div>

          <div className="space-y-2">
            <label htmlFor="requirements-transits" className="t-small">Tránsitos o escalas <span className="font-normal text-ink-soft">(opcional)</span></label>
            <Input id="requirements-transits" value={transits} onChange={event => setTransits(event.target.value)} placeholder="Por ejemplo, escala en Panamá" maxLength={300} />
          </div>
        </div>
        <p id="requirements-form-help" className="t-small mt-6 text-ink-soft">La consulta es una orientación inicial. Las condiciones pueden variar según su ruta, propósito y documentos.</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={busy || !destination}>{busy ? "Consultando requisitos" : "Consultar requisitos"}</Button>
          {busy && <span className="t-small text-ink-soft" role="status">Estamos revisando la información indicada.</span>}
        </div>
      </form>

      <aside className="rounded-panel border border-brand bg-brand-tint p-6" aria-label="Aviso importante">
        <p className="t-body font-semibold text-ink">Información referencial. Verifique siempre con la autoridad oficial.</p>
      </aside>

      {data && (
        <section className="rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8" aria-labelledby="requirements-result-title" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} strokeWidth={1.75} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 space-y-2">
              <h2 id="requirements-result-title" className="t-h2">Resultado para {destination}</h2>
              <p className="t-body text-ink-soft">Orientación referencial para un pasaporte hondureño en un viaje de turismo.</p>
            </div>
          </div>
          <dl className="mt-8 grid gap-6 border-y border-line py-6 md:grid-cols-2">
            <div><dt className="t-small text-ink-soft">Visa</dt><dd className="t-body mt-2">{data.visaRequirement}</dd></div>
            <div><dt className="t-small text-ink-soft">Permanencia autorizada</dt><dd className="t-body mt-2">{data.allowedStay}</dd></div>
            <div className="md:col-span-2"><dt className="t-small text-ink-soft">Pasaporte y documentos</dt><dd className="t-body mt-2"><ul className="list-disc space-y-2 pl-5">{data.passportRules.map(rule => <li key={rule}>{rule}</li>)}</ul></dd></div>
            {data.transitRequirements && <div className="md:col-span-2"><dt className="t-small text-ink-soft">Tránsitos</dt><dd className="t-body mt-2">{data.transitRequirements}</dd></div>}
          </dl>
          {data.notes?.length ? <ul className="t-small space-y-2 text-ink-soft">{data.notes.map(note => <li key={note}>{note}</li>)}</ul> : null}
          {data.updatedAt && <p className="t-small mt-6 text-ink-soft">Última actualización referencial: {data.updatedAt}</p>}
          <p className="t-small mt-6 font-semibold text-ink">Información referencial. Verifique siempre con la autoridad oficial.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {result?.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4">Fuente oficial del destino <LinkIcon /></a>}
            <a href={iataTravelCentreUrl} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4">IATA Travel Centre <LinkIcon /></a>
          </div>
        </section>
      )}

      {showFallback && (
        <section className="rounded-panel border border-line bg-surface p-6 sm:p-8" aria-live="polite" aria-labelledby="requirements-fallback-title">
          <h2 id="requirements-fallback-title" className="t-h3">No pudimos confirmar esta consulta en línea</h2>
          <p className="t-body mt-3 max-w-2xl text-ink-soft">En este momento no podemos confirmar los requisitos en línea. Con gusto se los confirmamos por WhatsApp.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button asChild variant="whatsapp"><a href={contactHref} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />Escríbanos por WhatsApp</a></Button>
            <a href={iataTravelCentreUrl} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4">Consultar IATA Travel Centre <LinkIcon /></a>
          </div>
        </section>
      )}
    </div>
  );
}
