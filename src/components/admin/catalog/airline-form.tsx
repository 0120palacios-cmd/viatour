"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAirlineEntry, saveFarePreset } from "@/app/admin/catalogos/actions";
import { emptyPreset, type AirlineEntry, type FarePreset } from "@/lib/catalog";
import { baggageLabels, type BaggagePiece, type BaggageState, type Refundability } from "@/lib/quotation-details";
import { baggageLine } from "@/lib/quotation-text";
import { AreaField, Notice, Section, Segmented, SelectField, SmallButton, TextField } from "@/components/admin/quotation-editor/fields";
import { cn } from "cn";

const pieceOptions = [["incluido", "Incluido"], ["no_incluido", "No incluido"], ["con_cargo", "Con cargo"]] as const;
const refundOptions = [["reembolsable", "Reembolsable"], ["parcial", "Reembolso parcial"], ["no_reembolsable", "No reembolsable"]] as const;
type Message = { tone: "error" | "success"; text: string } | null;

function PieceFields({ kind, piece, onChange }: { kind: keyof typeof baggageLabels; piece: BaggagePiece; onChange: (piece: BaggagePiece) => void }) {
  const preview = baggageLine(kind, piece);
  return <div className="space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
    <Segmented<BaggageState> label={baggageLabels[kind]} value={piece.estado} onChange={estado => onChange({ ...piece, estado })} options={pieceOptions} />
    {piece.estado === "incluido" || piece.estado === "con_cargo" ? <div className="grid gap-3 sm:grid-cols-3">
      {piece.estado === "incluido" ? <TextField label="Piezas por pasajero" inputMode="numeric" value={piece.piezas === null ? "" : String(piece.piezas)} onChange={value => onChange({ ...piece, piezas: value === "" ? null : Math.min(9, Number(value.replace(/\D/g, "")) || 0) })} /> : null}
      <TextField label="Peso" value={piece.peso} onChange={value => onChange({ ...piece, peso: value.slice(0, 40) })} placeholder={kind === "documentado" ? "23 kg" : "10 kg"} />
      <TextField label="Medidas" value={piece.medidas} onChange={value => onChange({ ...piece, medidas: value.slice(0, 60) })} placeholder="56 x 36 x 23 cm" />
    </div> : null}
    {preview ? <p className="t-small text-ink-soft">En el PDF: «{preview}»</p> : null}
  </div>;
}

function PresetEditor({ initial, airlineName, open, onToggle }: { initial: FarePreset; airlineName: string; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [preset, setPreset] = useState(initial);
  const [message, setMessage] = useState<Message>(null);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof FarePreset>(field: K, value: FarePreset[K]) => setPreset(current => ({ ...current, [field]: value }));
  const setBag = (change: Partial<FarePreset["equipaje"]>) => setPreset(current => ({ ...current, equipaje: { ...current.equipaje, ...change } }));
  const save = () => startSaving(async () => {
    const result = await saveFarePreset(JSON.stringify(preset));
    if (result.error) { setMessage({ tone: "error", text: result.error }); return; }
    setPreset(current => ({ ...current, id: result.id ?? current.id, updatedAt: result.updatedAt ?? current.updatedAt }));
    setMessage({ tone: "success", text: result.success ?? "Tarifa guardada." });
    if (!preset.id) router.refresh();
  });
  const title = preset.nombre || "Tarifa nueva";
  return <li className="rounded-card border border-line bg-canvas">
    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
      <p className="min-w-0"><span className="font-semibold text-ink">{title}</span><span className="block t-small text-ink-soft">{[preset.cabina, preset.aplicaA, preset.verificadoEn ? `verificada ${preset.verificadoEn}` : "sin fecha de verificación", !preset.activo ? "inactiva" : ""].filter(Boolean).join(" · ")}</span></p>
      <SmallButton aria-expanded={open} onClick={onToggle}>{open ? <ChevronUp size={16} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />}{open ? "Cerrar" : "Editar"}</SmallButton>
    </div>
    {open ? <div className="space-y-4 border-t border-line p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Nombre de la tarifa *" value={preset.nombre} onChange={value => set("nombre", value.slice(0, 120))} placeholder="Main Cabin" hint={`Como la nombra ${airlineName}`} />
        <TextField label="Cabina" value={preset.cabina} onChange={value => set("cabina", value.slice(0, 60))} placeholder="Económica" />
        <TextField label="Tipo de tarifa en el PDF" value={preset.tipoTarifa} onChange={value => set("tipoTarifa", value.slice(0, 80))} hint="Si lo deja vacío se usa el nombre" />
        <TextField label="Verificada para" value={preset.aplicaA} onChange={value => set("aplicaA", value.slice(0, 300))} placeholder="Rutas Honduras – Estados Unidos" className="sm:col-span-2" hint="Rutas, mercado o tipo de pasajero para los que se confirmó" />
        <TextField label="Fecha de verificación" type="date" value={preset.verificadoEn} onChange={value => set("verificadoEn", value)} />
        <TextField label="Fuente" value={preset.fuente} onChange={value => set("fuente", value.slice(0, 300))} placeholder="Página de equipaje de la aerolínea, GDS" className="sm:col-span-2 lg:col-span-3" />
      </div>
      <fieldset className="space-y-3 rounded-card border border-line p-3 sm:p-4">
        <legend className="px-1 font-semibold text-ink">Equipaje de esta tarifa</legend>
        {(["personal", "mano", "documentado"] as const).map(kind => <PieceFields key={kind} kind={kind} piece={preset.equipaje[kind]} onChange={piece => setBag({ [kind]: piece })} />)}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Equipaje adicional" value={preset.equipaje.adicional} onChange={value => setBag({ adicional: value.slice(0, 300) })} />
          <TextField label="Notas de equipaje" value={preset.equipaje.notas} onChange={value => setBag({ notas: value.slice(0, 600) })} />
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Cambios" value={preset.cambios} onChange={value => set("cambios", value.slice(0, 400))} />
        <TextField label="Cancelación" value={preset.cancelacion} onChange={value => set("cancelacion", value.slice(0, 400))} />
        <SelectField<Refundability> label="Reembolso" value={preset.reembolso} onChange={value => set("reembolso", value)} options={refundOptions} placeholder="Sin indicar" />
        <TextField label="Selección de asientos" value={preset.asientos} onChange={value => set("asientos", value.slice(0, 300))} />
        <AreaField label="Restricciones" value={preset.restricciones} onChange={value => set("restricciones", value.slice(0, 600))} rows={2} className="lg:col-span-2" />
        <AreaField label="Otras inclusiones" value={preset.otrasInclusiones} onChange={value => set("otrasInclusiones", value.slice(0, 600))} rows={2} className="sm:col-span-2 lg:col-span-3" hint="Comidas, prioridad de abordaje u otros beneficios confirmados" />
      </div>
      <label className="flex items-center gap-3 t-small text-ink"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={preset.activo} onChange={event => set("activo", event.target.checked)} />Disponible al cotizar</label>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <SmallButton tone="primary" disabled={saving} onClick={save}><Save size={16} strokeWidth={2} aria-hidden="true" />{saving ? "Guardando" : preset.id ? "Guardar tarifa" : "Agregar tarifa"}</SmallButton>
    </div> : null}
  </li>;
}

export function AirlineCatalogForm({ initial }: { initial: AirlineEntry }) {
  const router = useRouter();
  const [entry, setEntry] = useState(initial);
  const [message, setMessage] = useState<Message>(null);
  const [saving, startSaving] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FarePreset[]>([]);
  const set = <K extends keyof AirlineEntry>(field: K, value: AirlineEntry[K]) => setEntry(current => ({ ...current, [field]: value }));
  const save = () => startSaving(async () => {
    const result = await saveAirlineEntry(JSON.stringify({ ...entry, presets: [] }));
    if (result.error) { setMessage({ tone: "error", text: result.error }); return; }
    setEntry(current => ({ ...current, id: result.id ?? current.id, updatedAt: result.updatedAt ?? current.updatedAt }));
    setMessage({ tone: "success", text: result.success ?? "Aerolínea guardada." });
    if (!entry.id && result.id) router.replace(`/admin/catalogos/aerolineas/${result.id}`);
  });
  const presets = [...entry.presets, ...drafts];
  return <div className="space-y-6">
    <Section id="aerolinea" title="Aerolínea" actions={<Button type="button" className="min-h-10 px-4" disabled={saving} onClick={save}><Save size={17} strokeWidth={2} aria-hidden="true" />{entry.id ? "Guardar" : "Agregar al catálogo"}</Button>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="Nombre *" value={entry.nombre} onChange={value => set("nombre", value.slice(0, 120))} placeholder="American Airlines" className="lg:col-span-2" />
        <TextField label="Código IATA" value={entry.iata} onChange={value => set("iata", value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2))} placeholder="AA" hint="2 caracteres" />
        <TextField label="Código OACI" value={entry.icao} onChange={value => set("icao", value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} placeholder="AAL" hint="3 letras, opcional" />
        <TextField label="País" value={entry.pais} onChange={value => set("pais", value.slice(0, 80))} />
        <AreaField label="Aerolíneas operadoras" value={entry.operadora} onChange={value => set("operadora", value.slice(0, 600))} rows={2} className="sm:col-span-2 lg:col-span-3" hint="Regionales o socios que operan sus vuelos, por ejemplo American Eagle (Envoy, Piedmont)" />
        <AreaField label="Notas internas" value={entry.notasInternas} onChange={value => set("notasInternas", value.slice(0, 3000))} rows={2} className="sm:col-span-2 lg:col-span-4" />
        <label className="flex items-center gap-3 t-small text-ink"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={entry.activo} onChange={event => set("activo", event.target.checked)} />Disponible al cotizar</label>
      </div>
      {message ? <div className="mt-4"><Notice tone={message.tone}>{message.text}</Notice></div> : null}
    </Section>
    <Section id="tarifas" title="Plantillas de tarifa y equipaje" description="El equipaje y las condiciones cambian según familia de tarifa, ruta, país, aerolínea operadora, fecha de emisión y tipo de pasajero. Guarde lo que verificó y dónde; al cotizar, el asesor lo confirma de nuevo."
      actions={entry.id ? <SmallButton onClick={() => { const draft = { ...emptyPreset(entry.id), id: "" }; const key = `nueva-${drafts.length}`; setDrafts(list => [...list, draft]); setOpen(key); }}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar tarifa</SmallButton> : undefined}>
      {!entry.id ? <Notice>Guarde la aerolínea para agregar sus tarifas.</Notice>
        : presets.length ? <ul className="space-y-2">{presets.map((preset, index) => { const key = preset.id || `nueva-${index - entry.presets.length}`; return <PresetEditor key={key} initial={preset} airlineName={entry.nombre} open={open === key} onToggle={() => setOpen(open === key ? null : key)} />; })}</ul>
        : <p className={cn("t-small text-ink-soft")}>Sin plantillas. Por ejemplo: Main Cabin, Basic Economy o Business, con su equipaje.</p>}
    </Section>
  </div>;
}
