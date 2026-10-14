"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { inclusionStateLabels, newId, type Inclusion, type InclusionState } from "@/lib/quotation-details";
import { IconButton, inputClass, Notice, Segmented, SmallButton } from "./fields";
import { cn } from "cn";

// Included / not included / with a charge, one line per service. A suggestion only adds the line; the
// advisor must choose its state and then confirm the whole list, so nothing is promised by default.
export function InclusionsEditor({ title, items, confirmed, suggestions, onChange }: { title: string; items: Inclusion[]; confirmed: boolean; suggestions: string[]; onChange: (items: Inclusion[], confirmed: boolean) => void }) {
  const [custom, setCustom] = useState("");
  const names = new Set(items.map(item => item.nombre.toLowerCase()));
  const add = (nombre: string) => { const value = nombre.trim().slice(0, 80); if (value && !names.has(value.toLowerCase())) onChange([...items, { id: newId(), nombre: value, estado: "", detalle: "" }], false); };
  const set = (id: string, change: Partial<Inclusion>) => onChange(items.map(item => item.id === id ? { ...item, ...change } : item), false);
  const undecided = items.filter(item => !item.estado).length;
  return <fieldset className="space-y-3 rounded-card border border-line bg-canvas p-3 sm:p-4">
    <legend className="px-1 font-semibold text-ink">{title}</legend>
    <p className="t-small text-ink-soft">Agregue cada servicio y marque si está incluido, no incluido o con cargo, según lo confirmado con el proveedor.</p>
    <div className="flex flex-wrap gap-1.5">{suggestions.filter(item => !names.has(item.toLowerCase())).map(item => <SmallButton key={item} className="min-h-8 px-2 text-[13px]" onClick={() => add(item)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{item}</SmallButton>)}</div>
    <div className="flex gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">Otro servicio</span><input className={inputClass} placeholder="Otro servicio o beneficio" maxLength={80} value={custom} onChange={event => setCustom(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(custom); setCustom(""); } }} /></label>
      <SmallButton disabled={!custom.trim()} onClick={() => { add(custom); setCustom(""); }}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar</SmallButton>
    </div>
    {items.length ? <ul className="space-y-2">{items.map(item => <li key={item.id} className={cn("grid gap-2 rounded-btn border p-2 sm:grid-cols-[minmax(0,1fr)_auto]", item.estado ? "border-line" : "border-error/50")}>
      <div className="min-w-0 space-y-2">
        <Segmented<InclusionState> label={item.nombre} value={item.estado} onChange={estado => set(item.id, { estado })} options={Object.entries(inclusionStateLabels) as [InclusionState, string][]} />
        {item.estado ? <label className="block"><span className="sr-only">Detalle de {item.nombre}</span><input className={inputClass} placeholder={item.estado === "con_cargo" ? "Precio o condición, por ejemplo: USD 15 por persona" : "Detalle opcional, por ejemplo: horario o restricciones"} maxLength={200} value={item.detalle} onChange={event => set(item.id, { detalle: event.target.value })} /></label> : null}
      </div>
      <div className="flex items-start"><IconButton label={`Quitar ${item.nombre}`} className="text-error" onClick={() => onChange(items.filter(entry => entry.id !== item.id), false)}><Trash2 size={15} strokeWidth={2} /></IconButton></div>
    </li>)}</ul> : <Notice>Aún no hay servicios en esta lista.</Notice>}
    {items.length ? <label className="flex items-start gap-3 t-small text-ink">
      <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={confirmed} disabled={undecided > 0} onChange={event => onChange(items, event.target.checked)} />
      <span>Confirmé con el proveedor lo que incluye y lo que no.{undecided ? <span className="block text-ink-soft">Indique el estado de {undecided === 1 ? "1 servicio" : `${undecided} servicios`} para poder confirmar.</span> : null}</span>
    </label> : null}
  </fieldset>;
}
