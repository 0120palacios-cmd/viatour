"use client";

import { Plus, Trash2, Wand2 } from "lucide-react";
import { emptyBaggage, emptyFare, baggageLabels, newId, type BaggageAllowance, type BaggagePiece, type BaggageState, type FareRules, type QuotationDetails, type Refundability } from "@/lib/quotation-details";
import { journeyAirlines, journeyTitle } from "@/lib/flight-itinerary";
import { baggageLine } from "@/lib/quotation-text";
import { Field, inputClass, Section, Segmented, SelectField, SmallButton, TextField } from "./fields";

type Props = { details: QuotationDetails; update: (change: (details: QuotationDetails) => QuotationDetails) => void };

const changeOptions = ["Permitidos sin cargo", "Permitidos con diferencia de tarifa", "Con penalidad", "Con penalidad más diferencia de tarifa", "No permitidos"];
const cancelOptions = ["Con penalidad", "Crédito para un viaje futuro", "No permite cancelación", "Sin cargo"];
const refundOptions = [["reembolsable", "Reembolsable"], ["parcial", "Reembolso parcial"], ["no_reembolsable", "No reembolsable"]] as const;
const baggageOptions = [["incluido", "Incluido"], ["no_incluido", "No incluido"], ["con_cargo", "Con cargo"]] as const;

function Suggest({ id, options }: { id: string; options: string[] }) {
  return <datalist id={id}>{options.map(option => <option key={option} value={option} />)}</datalist>;
}

function FareEditor({ fare, multiple, onChange, onRemove }: { fare: FareRules; multiple: boolean; onChange: (fare: FareRules) => void; onRemove: () => void }) {
  const set = <K extends keyof FareRules>(field: K, value: FareRules[K]) => onChange({ ...fare, [field]: value });
  return <div className="space-y-3 rounded-card border border-line bg-canvas p-3 sm:p-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      {multiple ? <TextField label="Aplica a" value={fare.alcance} onChange={value => set("alcance", value)} maxLength={80} placeholder="Ida (Frontier)" className="w-64" /> : <p className="font-semibold text-ink">Tarifa</p>}
      {multiple ? <SmallButton tone="danger" onClick={onRemove}><Trash2 size={16} strokeWidth={2} aria-hidden="true" />Quitar</SmallButton> : null}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <TextField label="Aerolínea" value={fare.aerolinea} onChange={value => set("aerolinea", value)} maxLength={80} />
      <TextField label="Operado por" value={fare.operadoPor} onChange={value => set("operadoPor", value)} maxLength={120} hint="Opcional" />
      <Field label="Cabina">{id => <input id={id} list="fare-cabins" className={inputClass} value={fare.cabina} onChange={event => set("cabina", event.target.value.slice(0, 60))} />}</Field>
      <TextField label="Tipo de tarifa" value={fare.tipoTarifa} onChange={value => set("tipoTarifa", value)} maxLength={80} placeholder="Económica Estándar" hint="Como la nombra la aerolínea" />
      <TextField label="Clase de reserva" value={fare.claseReserva} onChange={value => set("claseReserva", value.toUpperCase().slice(0, 2))} hint="Opcional, por ejemplo Y o V" />
      <SelectField<Refundability> label="Reembolso" value={fare.reembolso} onChange={value => set("reembolso", value)} options={refundOptions} placeholder="Sin indicar" />
      <Field label="Cambios">{id => <input id={id} list="fare-changes" className={inputClass} value={fare.cambios} onChange={event => set("cambios", event.target.value.slice(0, 400))} />}</Field>
      <Field label="Cancelación">{id => <input id={id} list="fare-cancel" className={inputClass} value={fare.cancelacion} onChange={event => set("cancelacion", event.target.value.slice(0, 400))} />}</Field>
      <TextField label="Selección de asientos" value={fare.asientos} onChange={value => set("asientos", value)} maxLength={300} hint="Opcional" />
      <TextField label="Restricciones de la tarifa" value={fare.restricciones} onChange={value => set("restricciones", value)} maxLength={600} className="sm:col-span-2 lg:col-span-3" hint="Opcional. Solo condiciones confirmadas con la aerolínea." />
    </div>
  </div>;
}

function PieceEditor({ kind, piece, onChange }: { kind: keyof typeof baggageLabels; piece: BaggagePiece; onChange: (piece: BaggagePiece) => void }) {
  const preview = baggageLine(kind, piece);
  return <div className="space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
    <Segmented<BaggageState> label={baggageLabels[kind]} value={piece.estado} onChange={estado => onChange({ ...piece, estado })} options={baggageOptions} />
    {piece.estado === "incluido" || piece.estado === "con_cargo" ? <div className="grid gap-3 sm:grid-cols-3">
      {piece.estado === "incluido" ? <TextField label="Piezas por pasajero" inputMode="numeric" value={piece.piezas === null ? "" : String(piece.piezas)} onChange={value => onChange({ ...piece, piezas: value === "" ? null : Math.min(9, Number(value.replace(/\D/g, "")) || 0) })} placeholder="1" /> : null}
      <TextField label="Peso" value={piece.peso} onChange={value => onChange({ ...piece, peso: value.slice(0, 40) })} placeholder={kind === "documentado" ? "23 kg" : "10 kg"} />
      <TextField label="Medidas" value={piece.medidas} onChange={value => onChange({ ...piece, medidas: value.slice(0, 60) })} placeholder="56 x 36 x 23 cm" />
    </div> : null}
    {preview ? <p className="t-small text-ink-soft">En el PDF: «{preview}»</p> : null}
  </div>;
}

function BaggageEditor({ bag, multiple, onChange, onRemove }: { bag: BaggageAllowance; multiple: boolean; onChange: (bag: BaggageAllowance) => void; onRemove: () => void }) {
  return <div className="space-y-3 rounded-card border border-line bg-canvas p-3 sm:p-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <TextField label="Aplica a" value={bag.alcance} onChange={value => onChange({ ...bag, alcance: value.slice(0, 80) })} placeholder="Todos los vuelos" className="w-64" hint={multiple ? "Por ejemplo: Regreso (Avianca) o Niños" : undefined} />
      {multiple ? <SmallButton tone="danger" onClick={onRemove}><Trash2 size={16} strokeWidth={2} aria-hidden="true" />Quitar</SmallButton> : null}
    </div>
    {(["personal", "mano", "documentado"] as const).map(kind => <PieceEditor key={kind} kind={kind} piece={bag[kind]} onChange={piece => onChange({ ...bag, [kind]: piece })} />)}
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Equipaje adicional" value={bag.adicional} onChange={value => onChange({ ...bag, adicional: value.slice(0, 300) })} placeholder="Equipaje adicional disponible con cargo." />
      <TextField label="Notas de equipaje" value={bag.notas} onChange={value => onChange({ ...bag, notas: value.slice(0, 600) })} hint="Equipaje especial, infantes u otras diferencias" />
    </div>
  </div>;
}

export function FareBaggageSection({ details, update }: Props) {
  const fares = details.tarifas;
  const bags = details.equipaje;
  const journeys = details.vuelos.journeys.filter(journey => journey.segmentos.length);
  const setFares = (next: FareRules[]) => update(current => ({ ...current, tarifas: next }));
  const setBags = (next: BaggageAllowance[]) => update(current => ({ ...current, equipaje: next, equipajeConfirmado: false }));
  // Copies only what the pasted itinerary states (airline, operator, cabin); fare rules are never inferred.
  const fromItinerary = () => {
    const segments = journeys.flatMap(journey => journey.segmentos);
    const airlines = Array.from(new Set(segments.map(segment => segment.aerolinea).filter(Boolean)));
    const cabinsUsed = Array.from(new Set(segments.map(segment => segment.cabina).filter(Boolean)));
    if (airlines.length > 1 && journeys.length > 1 && journeys.every(journey => journeyAirlines(journey).length === 1)) {
      setFares(journeys.map((journey, index) => ({ ...(fares[index] ?? emptyFare()), alcance: `${journeyTitle(journey, index)} (${journeyAirlines(journey)[0]})`, aerolinea: journeyAirlines(journey)[0], cabina: Array.from(new Set(journey.segmentos.map(segment => segment.cabina).filter(Boolean))).join(" / ") })));
      return;
    }
    setFares([{ ...(fares[0] ?? emptyFare()), aerolinea: airlines.join(" / "), cabina: cabinsUsed.join(" / ") }]);
  };
  return <Section id="tarifa" title="Clase y equipaje" description="Indique solo condiciones confirmadas con la aerolínea o el sistema de reservas. La cabina no determina el equipaje incluido.">
    <Suggest id="fare-cabins" options={["Económica", "Económica básica", "Económica Premium", "Ejecutiva (Business)", "Primera clase"]} />
    <Suggest id="fare-changes" options={changeOptions} />
    <Suggest id="fare-cancel" options={cancelOptions} />
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {journeys.length ? <SmallButton onClick={fromItinerary}><Wand2 size={16} strokeWidth={2} aria-hidden="true" />Tomar aerolínea y cabina del itinerario</SmallButton> : null}
        <SmallButton onClick={() => setFares([...fares.map(fare => ({ ...fare, alcance: fare.alcance === "Todos los vuelos" ? "" : fare.alcance })), { ...emptyFare(), alcance: "" }])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Tarifa distinta por tramo</SmallButton>
      </div>
      {fares.map(fare => <FareEditor key={fare.id} fare={fare} multiple={fares.length > 1} onChange={next => setFares(fares.map(item => item.id === fare.id ? next : item))} onRemove={() => setFares(fares.filter(item => item.id !== fare.id))} />)}
      {!fares.length ? <SmallButton onClick={() => setFares([emptyFare()])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar tarifa</SmallButton> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2"><h3 className="font-semibold text-ink">Franquicia de equipaje</h3><SmallButton onClick={() => setBags([...bags, { ...emptyBaggage(newId()), alcance: "" }])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Franquicia distinta por tramo o pasajero</SmallButton></div>
      {bags.map(bag => <BaggageEditor key={bag.id} bag={bag} multiple={bags.length > 1} onChange={next => setBags(bags.map(item => item.id === bag.id ? next : item))} onRemove={() => setBags(bags.filter(item => item.id !== bag.id))} />)}
      {!bags.length ? <SmallButton onClick={() => setBags([emptyBaggage()])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar franquicia de equipaje</SmallButton> : null}
      <label className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4 t-small text-ink">
        <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={details.equipajeConfirmado} disabled={!bags.length || bags.some(bag => !bag.personal.estado || !bag.mano.estado || !bag.documentado.estado)} onChange={event => update(current => ({ ...current, equipajeConfirmado: event.target.checked }))} />
        <span>Confirmé el equipaje con las condiciones de esta tarifa.<span className="block text-ink-soft">Indique artículo personal, equipaje de mano y documentado para poder confirmarlo.</span></span>
      </label>
    </div>
  </Section>;
}
