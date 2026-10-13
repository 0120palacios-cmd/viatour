"use client";

import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { emptyFerryLeg, ferryInclusionSuggestions, newId, type FerryDetails, type FerryLeg, type QuotationDetails, type Refundability } from "@/lib/quotation-details";
import { formatDuration } from "@/lib/flight-itinerary";
import { AreaField, Field, IconButton, inputClass, Notice, Section, SelectField, SmallButton, TextField } from "./fields";
import { InclusionsEditor } from "./inclusions-editor";
import { cn } from "cn";

type Props = { details: QuotationDetails; update: (change: (details: QuotationDetails) => QuotationDetails) => void };

const legTitles: Record<FerryLeg["tipo"], string> = { ida: "Ida", regreso: "Regreso", tramo: "Trayecto" };

function LegEditor({ leg, index, onChange, onRemove }: { leg: FerryLeg; index: number; onChange: (leg: FerryLeg) => void; onRemove: () => void }) {
  const set = <K extends keyof FerryLeg>(field: K, value: FerryLeg[K]) => onChange({ ...leg, [field]: value });
  const hours = leg.duracionMin === null ? "" : String(Math.floor(leg.duracionMin / 60));
  const minutes = leg.duracionMin === null ? "" : String(leg.duracionMin % 60);
  const duration = (h: string, m: string) => { const total = (Number(h) || 0) * 60 + (Number(m) || 0); set("duracionMin", h === "" && m === "" ? null : total > 0 ? Math.min(total, 72 * 60) : null); };
  return <div className="space-y-3 rounded-card border border-line bg-canvas p-3 sm:p-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <SelectField<FerryLeg["tipo"]> label={`Trayecto ${index + 1}`} value={leg.tipo} onChange={tipo => set("tipo", tipo)} options={[["ida", "Ida"], ["regreso", "Regreso"], ["tramo", "Trayecto adicional"]]} className="w-52" />
      <IconButton label={`Quitar trayecto ${index + 1}`} className="text-error" onClick={onRemove}><Trash2 size={16} strokeWidth={2} /></IconButton>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TextField label="Naviera *" value={leg.operador} onChange={value => set("operador", value.slice(0, 120))} placeholder="Nombre de la naviera" className="lg:col-span-2" />
      <TextField label="Embarcación" value={leg.embarcacion} onChange={value => set("embarcacion", value.slice(0, 120))} hint="Opcional, si se conoce" className="lg:col-span-2" />
      <TextField label="Puerto de salida *" value={leg.origenPuerto} onChange={value => set("origenPuerto", value.slice(0, 120))} placeholder="La Ceiba" className="lg:col-span-2" />
      <TextField label="Puerto de llegada *" value={leg.destinoPuerto} onChange={value => set("destinoPuerto", value.slice(0, 120))} placeholder="Roatán" className="lg:col-span-2" />
      <TextField label="Fecha de salida *" type="date" value={leg.salidaFecha} onChange={value => set("salidaFecha", value)} />
      <TextField label="Hora de salida *" type="time" value={leg.salidaHora} onChange={value => set("salidaHora", value)} />
      <TextField label="Fecha de llegada" type="date" value={leg.llegadaFecha} onChange={value => set("llegadaFecha", value)} />
      <TextField label="Hora de llegada" type="time" value={leg.llegadaHora} onChange={value => set("llegadaHora", value)} />
      <Field label="Duración" hint={leg.duracionMin ? formatDuration(leg.duracionMin) : "Opcional"}>{id => <div className="flex items-center gap-2"><input id={id} aria-label="Horas" className={cn(inputClass, "w-16")} inputMode="numeric" value={hours} onChange={event => duration(event.target.value.replace(/\D/g, "").slice(0, 2), minutes)} /><span className="t-small text-ink-soft">h</span><input aria-label="Minutos" className={cn(inputClass, "w-16")} inputMode="numeric" value={minutes} onChange={event => duration(hours, event.target.value.replace(/\D/g, "").slice(0, 2))} /><span className="t-small text-ink-soft">min</span></div>}</Field>
    </div>
  </div>;
}

export function FerrySection({ details, update }: Props) {
  const ferry = details.ferry;
  const set = (change: Partial<FerryDetails>, keepConfirmation = false) => update(current => ({ ...current, ferry: { ...current.ferry, ...change, confirmado: keepConfirmation ? current.ferry.confirmado : false } }));
  const legs = ferry.legs;
  // A return leg starts as the mirror of the last leg: ports swapped, same operator; dates stay empty.
  const addReturn = () => { const last = legs.at(-1); set({ legs: [...legs, { ...emptyFerryLeg(legs.length ? "regreso" : "ida"), operador: last?.operador ?? "", origenPuerto: last?.destinoPuerto ?? "", destinoPuerto: last?.origenPuerto ?? "" }] }); };
  return <Section id="ferry" title="Ferry" description="Trayectos, clase, equipaje y condiciones confirmadas con la naviera. Para un viaje solo de pasajeros basta con naviera, puertos, fecha y hora."
    actions={<><SmallButton onClick={() => set({ legs: [...legs, emptyFerryLeg(legs.length ? "tramo" : "ida")] })}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar trayecto</SmallButton>{legs.length ? <SmallButton onClick={addReturn}><ArrowLeftRight size={16} strokeWidth={2} aria-hidden="true" />Agregar regreso</SmallButton> : null}</>}>
    <div className="space-y-4">
      {legs.map((leg, index) => <LegEditor key={leg.id} leg={leg} index={index} onChange={next => set({ legs: legs.map(item => item.id === leg.id ? next : item) })} onRemove={() => set({ legs: legs.filter(item => item.id !== leg.id) })} />)}
      {!legs.length ? <Notice>Agregue el primer trayecto en ferry.</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Clase" value={ferry.clase} onChange={value => set({ clase: value.slice(0, 80) })} placeholder="Turista, Primera, Ejecutiva" />
        <TextField label="Asiento" value={ferry.asiento} onChange={value => set({ asiento: value.slice(0, 120) })} placeholder="Asignado, libre" hint="Opcional" />
        <TextField label="Cabina" value={ferry.cabina} onChange={value => set({ cabina: value.slice(0, 120) })} hint="Solo si aplica" />
        <TextField label="Equipaje incluido" value={ferry.equipajeIncluido} onChange={value => set({ equipajeIncluido: value.slice(0, 300) })} placeholder="1 maleta de hasta 23 kg por pasajero" className="sm:col-span-2" />
        <TextField label="Equipaje adicional" value={ferry.equipajeAdicional} onChange={value => set({ equipajeAdicional: value.slice(0, 300) })} hint="Opcional: costo o condición" />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-ink">Vehículos</p>
        {ferry.vehiculos.map(vehicle => <div key={vehicle.id} className="flex flex-wrap items-end gap-2">
          <TextField label="Tipo de vehículo" value={vehicle.tipo} onChange={value => set({ vehiculos: ferry.vehiculos.map(item => item.id === vehicle.id ? { ...item, tipo: value.slice(0, 80) } : item) })} placeholder="Automóvil, motocicleta" className="min-w-48 flex-1" />
          <TextField label="Cantidad" inputMode="numeric" value={String(vehicle.cantidad)} onChange={value => set({ vehiculos: ferry.vehiculos.map(item => item.id === vehicle.id ? { ...item, cantidad: Math.max(1, Math.min(20, Number(value.replace(/\D/g, "")) || 1)) } : item) })} className="w-28" />
          <IconButton label="Quitar vehículo" className="mb-0.5 text-error" onClick={() => set({ vehiculos: ferry.vehiculos.filter(item => item.id !== vehicle.id) })}><Trash2 size={15} strokeWidth={2} /></IconButton>
        </div>)}
        <SmallButton onClick={() => set({ vehiculos: [...ferry.vehiculos, { id: newId(), tipo: "", cantidad: 1 }] })}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar vehículo</SmallButton>
      </div>
      <InclusionsEditor title="¿Qué incluye el viaje en ferry?" items={ferry.inclusiones} confirmed={ferry.inclusionesConfirmadas} suggestions={ferryInclusionSuggestions} onChange={(inclusiones, inclusionesConfirmadas) => set({ inclusiones, inclusionesConfirmadas }, true)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AreaField label="Embarque y check-in" value={ferry.embarque} onChange={value => set({ embarque: value.slice(0, 800) }, true)} rows={2} hint="Por ejemplo: presentarse 45 minutos antes en el muelle" />
        <AreaField label="Documentos requeridos" value={ferry.documentos} onChange={value => set({ documentos: value.slice(0, 600) }, true)} rows={2} hint="Según la naviera y las autoridades del puerto" />
        <TextField label="Cambios" value={ferry.cambios} onChange={value => set({ cambios: value.slice(0, 400) }, true)} placeholder="Con cargo, hasta 24 horas antes" />
        <SelectField<Refundability> label="Reembolso" value={ferry.reembolso} onChange={reembolso => set({ reembolso }, true)} options={[["reembolsable", "Reembolsable"], ["parcial", "Reembolso parcial"], ["no_reembolsable", "No reembolsable"]]} placeholder="Sin indicar" />
        <AreaField label="Política de cancelación" value={ferry.cancelacion} onChange={value => set({ cancelacion: value.slice(0, 600) }, true)} rows={2} className="sm:col-span-2" />
      </div>
      {legs.length ? <label className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4 t-small text-ink">
        <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={ferry.confirmado} onChange={event => update(current => ({ ...current, ferry: { ...current.ferry, confirmado: event.target.checked } }))} />
        <span>Confirmé con la naviera los horarios, la clase y las condiciones de este viaje.<span className="block text-ink-soft">Cambiar un trayecto, la clase o el equipaje quita esta confirmación.</span></span>
      </label> : null}
      {legs.length ? <p className="t-small text-ink-soft">{legs.map((leg, index) => `${legTitles[leg.tipo]} ${index + 1}: ${leg.origenPuerto || "?"} – ${leg.destinoPuerto || "?"}`).join(" · ")}</p> : null}
    </div>
  </Section>;
}
