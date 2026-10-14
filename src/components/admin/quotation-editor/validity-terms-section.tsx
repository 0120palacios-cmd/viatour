"use client";

import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { expiryFromPreset, expiryPresets, formatInstant, isExpired, isoToZoned, termsFingerprint, termsPendingReview, termsTemplates, zonedToIso, type QuotationDetails, type QuotationKind } from "@/lib/quotation-details";
import { AreaField, IconButton, Notice, Section, SmallButton, TextField, textareaClass } from "./fields";
import { cn } from "cn";

type Update = (change: (details: QuotationDetails) => QuotationDetails) => void;

export function ValiditySection({ details, update, sent }: { details: QuotationDetails; update: Update; sent: boolean }) {
  const { validez } = details;
  const zone = validez.zona;
  const set = (field: "venceEn" | "limitePago" | "limiteEmision" | "nota", value: string) => update(current => ({ ...current, validez: { ...current.validez, [field]: value } }));
  const expired = isExpired(validez.venceEn);
  return <Section id="validez" title="Validez" description="La validez es un plazo de trabajo, no una garantía de tarifa: la disponibilidad se reconfirma antes de reservar o emitir.">
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Validez rápida desde ahora">
        {expiryPresets.map(hours => <SmallButton key={hours} onClick={() => set("venceEn", expiryFromPreset(hours))}>{hours} horas</SmallButton>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Válida hasta (hora de Honduras)" type="datetime-local" value={isoToZoned(validez.venceEn, zone)} onChange={value => set("venceEn", zonedToIso(value, zone))} />
        <TextField label="Nota de validez" value={validez.nota} onChange={value => set("nota", value.slice(0, 300))} placeholder="Opcional" />
        <TextField label="Fecha límite de pago" type="datetime-local" value={isoToZoned(validez.limitePago, zone)} onChange={value => set("limitePago", zonedToIso(value, zone))} hint="Opcional" />
        <TextField label="Fecha límite de emisión del boleto" type="datetime-local" value={isoToZoned(validez.limiteEmision, zone)} onChange={value => set("limiteEmision", zonedToIso(value, zone))} hint="Opcional, según la aerolínea" />
      </div>
      {validez.venceEn ? <Notice tone={expired ? "error" : "info"}>{expired ? "Vencida: " : "El PDF mostrará: "}Cotización válida hasta {formatInstant(validez.venceEn, zone)}.</Notice> : <Notice tone="error">Indique la validez antes de enviar la cotización.</Notice>}
      {sent ? <p className="t-small text-ink-soft">Las versiones ya enviadas conservan la validez con la que se emitieron. Un cambio aquí aplica a la próxima versión que envíe.</p> : null}
    </div>
  </Section>;
}

export function TermsSection({ details, update, kind }: { details: QuotationDetails; update: Update; kind: QuotationKind }) {
  const clauses = details.condiciones;
  const fingerprint = termsFingerprint(clauses);
  const approved = Boolean(clauses.length) && details.aprobacionCondiciones?.huella === fingerprint;
  // Any change to the text voids the approval; the server records who approved and when.
  const set = (next: string[]) => update(current => ({ ...current, condiciones: next, aprobacionCondiciones: null }));
  const approve = (checked: boolean) => update(current => ({ ...current, aprobacionCondiciones: checked ? { huella: termsFingerprint(current.condiciones), por: "", en: "" } : null }));
  const move = (index: number, direction: -1 | 1) => { const list = [...clauses]; const target = index + direction; [list[index], list[target]] = [list[target], list[index]]; set(list); };
  return <Section id="condiciones" title="Condiciones" description="Se guardan con cada cotización: cambiar la plantilla no modifica cotizaciones ya emitidas."
    actions={<><SmallButton onClick={() => set([...termsTemplates[kind]])}><RotateCcw size={16} strokeWidth={2} aria-hidden="true" />Usar plantilla de {kind === "vuelo" ? "vuelos" : kind === "hotel" ? "hoteles" : kind === "paquete" || kind === "combinado" ? "paquetes" : kind === "ferry" ? "ferry" : "servicios"}</SmallButton><SmallButton onClick={() => set([...clauses, ""])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar condición</SmallButton></>}>
    <div className="space-y-2">
      {termsPendingReview ? <Notice>Texto de las plantillas en borrador, pendiente de revisión legal antes de considerarse aprobado. El bloque «Importante» del PDF es el texto aprobado y siempre se incluye.</Notice> : null}
      {clauses.map((clause, index) => <div key={index} className="flex gap-2">
        <span className="mt-3 w-6 shrink-0 text-right font-semibold text-brand">{index + 1}.</span>
        <label className="min-w-0 flex-1"><span className="sr-only">Condición {index + 1}</span><textarea className={cn(textareaClass, "min-h-[72px]")} rows={2} maxLength={1000} value={clause} onChange={event => set(clauses.map((item, position) => position === index ? event.target.value : item))} /></label>
        <div className="flex flex-col gap-1">
          <IconButton label={`Subir condición ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} strokeWidth={2} /></IconButton>
          <IconButton label={`Bajar condición ${index + 1}`} disabled={index === clauses.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} strokeWidth={2} /></IconButton>
          <IconButton label={`Quitar condición ${index + 1}`} className="text-error" onClick={() => set(clauses.filter((_, position) => position !== index))}><Trash2 size={15} strokeWidth={2} /></IconButton>
        </div>
      </div>)}
      {!clauses.length ? <Notice tone="error">La cotización no tiene condiciones. Use la plantilla o agregue las que correspondan.</Notice> : null}
      {clauses.length ? <label className={cn("flex items-start gap-3 rounded-card border p-4 t-small text-ink", approved ? "border-success/40 bg-canvas" : "border-error/40 bg-canvas")}>
        <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand)]" checked={approved} onChange={event => approve(event.target.checked)} />
        <span>Revisé estas condiciones y las apruebo para esta cotización.<span className="block text-ink-soft">{approved ? details.aprobacionCondiciones?.en ? `Aprobadas el ${formatInstant(details.aprobacionCondiciones.en)}. Si cambia el texto, deberá aprobarlas de nuevo.` : "Se registrará quién las aprobó al guardar." : "Sin aprobación no se puede enviar la cotización. Cualquier cambio en el texto anula la aprobación."}</span></span>
      </label> : null}
    </div>
  </Section>;
}

export function NotesSection({ notes, setNotes, details, update }: { notes: string; setNotes: (value: string) => void; details: QuotationDetails; update: Update }) {
  return <Section id="notas" title="Observaciones y notas internas">
    <div className="grid gap-4 sm:grid-cols-2">
      <AreaField label="Observaciones para el cliente" value={notes} onChange={value => setNotes(value.slice(0, 5000))} rows={4} hint="Aparecen en el PDF." />
      <AreaField label="Notas internas" value={details.notasInternas} onChange={value => update(current => ({ ...current, notasInternas: value.slice(0, 5000) }))} rows={4} hint="Solo para el equipo. Nunca aparecen en el PDF ni en el correo." />
    </div>
  </Section>;
}
