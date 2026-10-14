"use client";

import { useId, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Info, Plane, Plus, Trash2, Wand2 } from "lucide-react";
import { parseItinerary, maxItineraryText, type ParseResult } from "@/lib/flight-parser";
import { computedDuration, emptySegment, formatDuration, isOvernightConnection, journeyRoute, journeyTitle, layoverMinutes, segmentStatus, segmentStatusLabels, validateItinerary, type FlightJourney, type FlightSegment, type ItineraryIssue, type JourneyKind, type SegmentStatus } from "@/lib/flight-itinerary";
import { airportInfo } from "@/lib/flight-reference";
import { newId, separateTicketsClause, type QuotationDetails } from "@/lib/quotation-details";
import { AreaField, Field, IconButton, inputClass, Notice, Section, SelectField, SmallButton, TextField } from "./fields";
import { useCatalogs } from "./catalog-context";
import { cn } from "cn";

type Props = { details: QuotationDetails; update: (change: (details: QuotationDetails) => QuotationDetails) => void; onApplyItinerary?: (journeys: FlightJourney[]) => void; sectionId?: string };

const statusStyles: Record<SegmentStatus, string> = { verificado: "border-success/40 text-success", confirmar: "border-brand/40 bg-brand-tint text-brand-deep", faltante: "border-error/40 text-error", contradictorio: "border-error/40 bg-canvas text-error" };

export function StatusChip({ status }: { status: SegmentStatus }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-btn border px-2 py-0.5 text-[12px] font-semibold", statusStyles[status])}>{status === "verificado" ? <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" /> : <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />}{segmentStatusLabels[status]}</span>;
}

const cabins = ["Económica", "Económica básica", "Económica Premium", "Ejecutiva (Business)", "Primera clase"];

export function IssueList({ issues, empty }: { issues: { nivel: string; mensaje: string }[]; empty?: string }) {
  if (!issues.length) return empty ? <p className="flex items-center gap-2 t-small text-success"><CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />{empty}</p> : null;
  return <ul className="space-y-1.5">{issues.map((issue, index) => <li key={index} className={cn("flex items-start gap-2 t-small", issue.nivel === "error" ? "text-error" : issue.nivel === "aviso" ? "text-ink" : "text-ink-soft")}>
    {issue.nivel === "info" ? <Info className="mt-0.5 shrink-0" size={15} strokeWidth={2} aria-hidden="true" /> : <AlertTriangle className={cn("mt-0.5 shrink-0", issue.nivel === "error" ? "text-error" : "text-brand")} size={15} strokeWidth={2} aria-hidden="true" />}
    <span><span className="sr-only">{issue.nivel === "error" ? "Error: " : issue.nivel === "aviso" ? "Aviso: " : "Nota: "}</span>{issue.mensaje}</span>
  </li>)}</ul>;
}

function DurationInput({ value, onChange, review }: { value: number | null; onChange: (value: number | null) => void; review: boolean }) {
  const hours = value === null ? "" : String(Math.floor(value / 60));
  const minutes = value === null ? "" : String(value % 60);
  const set = (h: string, m: string) => { if (h === "" && m === "") { onChange(null); return; } const total = (Number(h) || 0) * 60 + (Number(m) || 0); onChange(total > 0 ? Math.min(total, 72 * 60) : null); };
  return <Field label="Duración del vuelo" review={review}>{id => <div className="flex items-center gap-2">
    <input id={id} aria-label="Horas" className={cn(inputClass, "w-16")} inputMode="numeric" value={hours} onChange={event => set(event.target.value.replace(/\D/g, "").slice(0, 2), minutes)} /><span className="t-small text-ink-soft">h</span>
    <input aria-label="Minutos" className={cn(inputClass, "w-16")} inputMode="numeric" value={minutes} onChange={event => set(hours, event.target.value.replace(/\D/g, "").slice(0, 2))} /><span className="t-small text-ink-soft">min</span>
  </div>}</Field>;
}

function SegmentEditor({ segment, index, count, onChange, onMove, onRemove, airlineList }: { segment: FlightSegment; index: number; count: number; onChange: (segment: FlightSegment) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void; airlineList: string }) {
  const set = <K extends keyof FlightSegment>(field: K, value: FlightSegment[K]) => onChange({ ...segment, [field]: value, revisar: segment.revisar.filter(item => item !== field) });
  const flagged = (field: string) => segment.revisar.includes(field);
  const computed = computedDuration(segment);
  const code = (field: "origen" | "destino", value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    const known = airportInfo(upper);
    onChange({ ...segment, [field]: upper, ...(known ? { [field === "origen" ? "origenNombre" : "destinoNombre"]: known.nombre } : {}), revisar: segment.revisar.filter(item => item !== field) });
  };
  const origin = airportInfo(segment.origen);
  const destination = airportInfo(segment.destino);
  return <div className="rounded-card border border-line bg-canvas p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 font-semibold text-ink"><Plane size={16} strokeWidth={2} className="text-brand" aria-hidden="true" />Vuelo {index + 1}{segment.origen || segment.destino ? <span className="font-normal text-ink-soft">· {segment.origen || "???"} – {segment.destino || "???"}</span> : null}</p>
      <div className="flex gap-1.5">
        {segment.revisar.length ? <SmallButton onClick={() => onChange({ ...segment, revisar: [] })}><CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />Confirmar datos marcados</SmallButton> : null}
        <IconButton label={`Subir vuelo ${index + 1}`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={16} strokeWidth={2} /></IconButton>
        <IconButton label={`Bajar vuelo ${index + 1}`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={16} strokeWidth={2} /></IconButton>
        <IconButton label={`Quitar vuelo ${index + 1}`} className="text-error" onClick={onRemove}><Trash2 size={16} strokeWidth={2} /></IconButton>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TextField label="Origen (IATA)" value={segment.origen} onChange={value => code("origen", value)} review={flagged("origen")} maxLength={3} autoCapitalize="characters" hint={origin ? origin.ciudad : segment.origenNombre || undefined} />
      <TextField label="Destino (IATA)" value={segment.destino} onChange={value => code("destino", value)} review={flagged("destino")} maxLength={3} autoCapitalize="characters" hint={destination ? destination.ciudad : segment.destinoNombre || undefined} />
      <TextField label="Número de vuelo" value={segment.vuelo} onChange={value => set("vuelo", value.toUpperCase().slice(0, 10))} review={flagged("vuelo")} placeholder="AM 675" />
      <TextField label="Aerolínea" value={segment.aerolinea} onChange={value => set("aerolinea", value)} review={flagged("aerolinea")} maxLength={80} list={airlineList} />
      <TextField label="Fecha de salida" type="date" value={segment.salidaFecha} onChange={value => set("salidaFecha", value)} review={flagged("salidaFecha")} />
      <TextField label="Hora de salida" type="time" value={segment.salidaHora} onChange={value => set("salidaHora", value)} review={flagged("salidaHora")} hint="Hora local del origen" />
      <TextField label="Fecha de llegada" type="date" value={segment.llegadaFecha} onChange={value => set("llegadaFecha", value)} review={flagged("llegadaFecha")} />
      <TextField label="Hora de llegada" type="time" value={segment.llegadaHora} onChange={value => set("llegadaHora", value)} review={flagged("llegadaHora")} hint="Hora local del destino" />
      <Field label="Cabina">{id => <><input id={id} list="cabin-options" className={inputClass} value={segment.cabina} onChange={event => set("cabina", event.target.value.slice(0, 60))} /><datalist id="cabin-options">{cabins.map(cabin => <option key={cabin} value={cabin} />)}</datalist></>}</Field>
      <TextField label="Aeronave" value={segment.aeronave} onChange={value => set("aeronave", value)} maxLength={80} review={flagged("aeronave")} />
      <TextField label="Operado por" value={segment.operadoPor} onChange={value => set("operadoPor", value)} maxLength={120} review={flagged("operadoPor")} hint="Solo si otra aerolínea opera el vuelo" />
      <DurationInput value={segment.duracionMin} onChange={value => set("duracionMin", value)} review={flagged("duracionMin")} />
    </div>
    {computed !== null && segment.duracionMin === null ? <p className="mt-2 t-small text-ink-soft">Duración según horarios y zonas horarias: {formatDuration(computed)}.</p> : null}
  </div>;
}

export function FlightSection({ details, update, onApplyItinerary, sectionId = "vuelos" }: Props) {
  const [text, setText] = useState(details.vuelos.textoOriginal);
  const [result, setResult] = useState<ParseResult | null>(null);
  const journeys = details.vuelos.journeys;
  const airlineList = `${useId()}-airlines`;
  const catalogs = useCatalogs();
  const resultIssues = useMemo(() => result ? validateItinerary(result.journeys) : [], [result]);
  const issues = useMemo<ItineraryIssue[]>(() => journeys.length ? validateItinerary(journeys) : [], [journeys]);
  const pending = journeys.some(journey => journey.segmentos.some(segment => segment.revisar.length));
  const hasErrors = issues.some(issue => issue.nivel === "error");

  const setJourneys = (next: FlightJourney[]) => update(current => ({ ...current, vuelos: { ...current.vuelos, journeys: next, confirmado: false } }));
  const setJourney = (index: number, journey: FlightJourney) => setJourneys(journeys.map((item, position) => position === index ? journey : item));

  const interpret = () => setResult(parseItinerary(text, { referencia: new Date().toISOString().slice(0, 10), idPrefix: newId().slice(0, 6) }));
  const apply = () => {
    if (!result) return;
    update(current => ({
      ...current,
      vuelos: { journeys: result.journeys, textoOriginal: text.slice(0, maxItineraryText), confirmado: false, boletosSeparados: result.boletosSeparados },
      condiciones: result.boletosSeparados && !current.condiciones.includes(separateTicketsClause) ? [...current.condiciones, separateTicketsClause] : current.condiciones,
    }));
    onApplyItinerary?.(result.journeys);
    setResult(null);
  };

  const segmentsFound = result?.journeys.reduce((sum, journey) => sum + journey.segmentos.length, 0) ?? 0;
  return <Section id={sectionId} title="Itinerario de vuelo" description="Pegue el itinerario desde Google Flights, el correo de la aerolínea o el sistema de reservas. Revise cada vuelo antes de confirmarlo."
    actions={journeys.length ? <SmallButton onClick={() => setJourneys([...journeys, { id: newId(), tipo: journeys.length === 1 ? "regreso" : "tramo", segmentos: [{ ...emptySegment(newId()) }] }])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar tramo</SmallButton> : null}>
    <div className="space-y-3">
      <AreaField label="Itinerario copiado" value={text} onChange={value => setText(value.slice(0, maxItineraryText))} rows={journeys.length ? 4 : 9} hint="Se acepta texto en español o inglés, con o sin saltos de línea, y segmentos de Amadeus o Sabre. El texto se guarda solo para uso interno." />
      <div className="flex flex-wrap gap-2">
        <SmallButton tone="primary" disabled={!text.trim()} onClick={interpret}><Wand2 size={16} strokeWidth={2} aria-hidden="true" />Interpretar itinerario</SmallButton>
        {!journeys.length ? <SmallButton onClick={() => setJourneys([{ id: newId(), tipo: "ida", segmentos: [emptySegment(newId())] }])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Ingresar vuelos manualmente</SmallButton> : null}
      </div>
      {result ? <div className="space-y-3 rounded-card border border-brand/40 bg-canvas p-4" aria-live="polite">
        <p className="font-semibold text-ink">{segmentsFound ? `Se encontraron ${segmentsFound} ${segmentsFound === 1 ? "vuelo" : "vuelos"} en ${result.journeys.length} ${result.journeys.length === 1 ? "tramo" : "tramos"}.` : "No se encontraron vuelos."}</p>
        {result.journeys.map((journey, index) => <div key={journey.id} className="space-y-1.5">
          <p className="t-small text-ink"><span className="font-semibold">{journeyTitle(journey, index)}:</span> {journeyRoute(journey)}{journey.segmentos[0]?.salidaFecha ? ` · ${new Intl.DateTimeFormat("es-HN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${journey.segmentos[0].salidaFecha}T12:00:00Z`))}` : ""}</p>
          <ul className="space-y-1">{journey.segmentos.map((segment, position) => {
            const previous = journey.segmentos[position - 1];
            const wait = previous ? layoverMinutes(previous, segment) : null;
            return <li key={segment.id} className="space-y-1">
              {previous && wait !== null ? <p className="pl-3 text-[13px] text-ink-soft">Conexión en {segment.origen} · {formatDuration(wait)}{isOvernightConnection(previous, segment, wait) ? " · nocturna" : ""}</p> : null}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-btn border border-line px-3 py-1.5 t-small text-ink">
                <span className="font-semibold">{segment.vuelo || "Sin número de vuelo"}</span>
                <span>{segment.origen || "?"} – {segment.destino || "?"}</span>
                <span className="text-ink-soft">{segment.salidaFecha ? segment.salidaFecha.slice(5).split("-").reverse().join("/") : "sin fecha"} {segment.salidaHora} → {segment.llegadaHora}{segment.llegadaFecha && segment.llegadaFecha !== segment.salidaFecha ? ` (${segment.llegadaFecha.slice(5).split("-").reverse().join("/")})` : ""}</span>
                {segment.aeronave ? <span className="text-ink-soft">{segment.aeronave}</span> : null}
                <StatusChip status={segmentStatus(segment, resultIssues, index, position)} />
              </p>
            </li>;
          })}</ul>
        </div>)}
        <IssueList issues={result.issues} />
        {result.ignoradas.length ? <details className="t-small text-ink-soft"><summary className="cursor-pointer">Líneas no utilizadas ({result.ignoradas.length})</summary><ul className="mt-2 list-disc space-y-0.5 pl-5">{result.ignoradas.map((line, index) => <li key={index}>{line}</li>)}</ul></details> : null}
        <div className="flex flex-wrap gap-2">
          {segmentsFound ? <SmallButton tone="primary" onClick={apply}>{journeys.length ? "Reemplazar el itinerario actual" : "Usar este itinerario"}</SmallButton> : null}
          <SmallButton onClick={() => setResult(null)}>Descartar</SmallButton>
        </div>
      </div> : null}
      {journeys.map((journey, journeyIndex) => <div key={journey.id} className="space-y-3 rounded-card border border-line p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SelectField<JourneyKind> label={`Tramo ${journeyIndex + 1}`} value={journey.tipo} onChange={tipo => setJourney(journeyIndex, { ...journey, tipo })} options={[["ida", "Vuelo de ida"], ["regreso", "Vuelo de regreso"], ["tramo", "Tramo (multidestino)"]]} className="w-56" />
          <div className="flex gap-2">
            <SmallButton onClick={() => { const last = journey.segmentos.at(-1); setJourney(journeyIndex, { ...journey, segmentos: [...journey.segmentos, { ...emptySegment(newId()), origen: last?.destino ?? "", origenNombre: last?.destinoNombre ?? "", salidaFecha: last?.llegadaFecha ?? "" }] }); }}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar conexión</SmallButton>
            <SmallButton tone="danger" onClick={() => setJourneys(journeys.filter((_, index) => index !== journeyIndex))}><Trash2 size={16} strokeWidth={2} aria-hidden="true" />Quitar tramo</SmallButton>
          </div>
        </div>
        {journey.segmentos.map((segment, index) => <div key={segment.id} className="space-y-2">
          {index > 0 ? (() => { const wait = layoverMinutes(journey.segmentos[index - 1], segment); return <p className="rounded-btn border border-dashed border-line bg-surface px-3 py-2 t-small text-ink">Conexión en {segment.origen || "?"}{wait !== null ? ` · espera de ${formatDuration(wait) || `${wait} min`}` : ""}</p>; })() : null}
          <SegmentEditor segment={segment} index={index} count={journey.segmentos.length} airlineList={airlineList}
            onChange={next => setJourney(journeyIndex, { ...journey, segmentos: journey.segmentos.map(item => item.id === segment.id ? next : item) })}
            onMove={direction => { const list = [...journey.segmentos]; const target = index + direction; [list[index], list[target]] = [list[target], list[index]]; setJourney(journeyIndex, { ...journey, segmentos: list }); }}
            onRemove={() => setJourney(journeyIndex, { ...journey, segmentos: journey.segmentos.filter(item => item.id !== segment.id) })} />
        </div>)}
      </div>)}
      {journeys.length ? <div className="space-y-3 rounded-card border border-line bg-canvas p-4">
        <h3 className="font-semibold text-ink">Revisión del itinerario</h3>
        <IssueList issues={issues} empty="Fechas, horarios, aeropuertos y conexiones son coherentes." />
        <label className="flex items-start gap-3 t-small text-ink">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={details.vuelos.confirmado} disabled={hasErrors || pending} onChange={event => update(current => ({ ...current, vuelos: { ...current.vuelos, confirmado: event.target.checked } }))} />
          <span>Revisé cada vuelo contra la fuente original y el itinerario es correcto.{hasErrors || pending ? <span className="block text-ink-soft">Corrija los errores y confirme los datos marcados para poder confirmar.</span> : null}</span>
        </label>
        <label className="flex items-start gap-3 t-small text-ink">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={details.vuelos.boletosSeparados} onChange={event => { const checked = event.target.checked; update(current => ({ ...current, vuelos: { ...current.vuelos, boletosSeparados: checked }, condiciones: checked ? (current.condiciones.includes(separateTicketsClause) ? current.condiciones : [...current.condiciones, separateTicketsClause]) : current.condiciones.filter(clause => clause !== separateTicketsClause) })); }} />
          <span>El itinerario usa boletos separados (agrega la condición correspondiente).</span>
        </label>
      </div> : null}
      {catalogs.airlines.length ? <datalist id={airlineList}>{catalogs.airlines.map(airline => <option key={airline.id} value={airline.nombre} />)}</datalist> : null}
      {!journeys.length && !result ? <Notice>Aún no hay vuelos. Pegue el itinerario y presione «Interpretar itinerario», o ingréselos manualmente.</Notice> : null}
    </div>
  </Section>;
}
