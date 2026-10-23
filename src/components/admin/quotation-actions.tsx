"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignQuotationToMe, cleanupUnusedHotelPhotos, duplicateQuotation, registerQuotationSent, sendQuotation, updateQuotationStatus, type PhotoCleanupState, type QuotationActionState } from "@/app/admin/cotizaciones/actions";
import { quotationStatusLabel, quotationStatuses, type QuotationStatus } from "@/lib/quotation-types";

export function QuotationStatusForm({ id, status }: { id: string; status: QuotationStatus }) {
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(updateQuotationStatus, {});
  const manualStatuses = quotationStatuses.filter(value => ["rechazada", "expirada"].includes(value));
  // No preselection for drafts or sent quotations: recording the customer's answer must be a deliberate choice.
  const defaultStatus = manualStatuses.includes(status as "aceptada" | "rechazada" | "expirada") ? status : "";
  const [choice, setChoice] = useState<string>(defaultStatus);
  return <form action={action} className="flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={id} /><label className="sr-only" htmlFor={`status-${id}`}>Estado manual de la cotización</label><select id={`status-${id}`} name="estado" value={choice} onChange={event => setChoice(event.target.value)} required className="h-12 rounded-btn border border-line bg-canvas px-3 text-ink"><option value="" disabled>Elegir respuesta del cliente</option>{manualStatuses.map(value => <option key={value} value={value}>{quotationStatusLabel(value)}</option>)}</select>{choice === "rechazada" ? <label className="w-full t-small text-ink">Motivo del rechazo<textarea name="motivo" required minLength={3} maxLength={500} rows={2} placeholder="Por ejemplo: eligió otra fecha, el presupuesto no alcanzó, viajará con otra agencia" className="mt-1 block w-full rounded-btn border border-line bg-canvas px-3 py-2 text-ink" /></label> : null}<Button type="submit" variant="ghost" disabled={pending}>Guardar estado</Button>{state.error && <span role="alert" className="w-full text-error t-small">{state.error}</span>}{state.success && <span aria-live="polite" className="w-full text-success t-small">{state.success}</span>}</form>;
}

export function SendQuotationForm({ id, disabled = false, reason }: { id: string; disabled?: boolean; reason?: string }) {
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(sendQuotation, {});
  return <div className="space-y-3"><form action={action}><input type="hidden" name="id" value={id} /><Button type="submit" disabled={pending || disabled}>{pending ? "Enviando" : "Enviar al cliente"}</Button></form>{reason && !pending ? <p className="t-small text-ink-soft">{reason}</p> : null}{state.error && <p role="alert" className="t-small text-error">{state.error}</p>}{state.success && <p aria-live="polite" className="t-small text-success">{state.success}</p>}{state.whatsappUrl && <a className="inline-flex min-h-12 items-center rounded-btn border border-wa px-4 py-3 font-semibold text-wa-deep underline underline-offset-4" href={state.whatsappUrl} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>}</div>;
}

// The usual path: the quotation goes to the customer by WhatsApp or in person. Registering it freezes the
// version the customer receives (so it can be accepted later) and offers that exact PDF and a WhatsApp chat.
export function RegisterSendForm({ id, disabled = false, reason, hasPhone }: { id: string; disabled?: boolean; reason?: string; hasPhone: boolean }) {
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(registerQuotationSent, {});
  return <div className="space-y-3">
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <fieldset className="space-y-2">
        <legend className="t-small font-semibold text-ink">Medio</legend>
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="canal" value="presencial" defaultChecked className="size-4 accent-brand" />Entregada en persona, impresa o por otro medio</label>
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="canal" value="whatsapp" className="size-4 accent-brand" />Ya la envié por WhatsApp desde fuera del panel</label>
      </fieldset>
      <label className="flex items-start gap-3 t-small"><input type="checkbox" name="confirmado" value="si" required className="mt-0.5 size-4 accent-brand" />El cliente recibirá exactamente el PDF de esta versión.</label>
      <Button type="submit" variant="ghost" disabled={pending || disabled}>{pending ? "Registrando" : "Registrar envío"}</Button>
    </form>
    {reason && !pending ? <p className="t-small text-ink-soft">{reason}</p> : null}
    {state.error && <p role="alert" className="t-small text-error">{state.error}</p>}
    {state.success && <div aria-live="polite" className="space-y-2"><p className="t-small text-success">{state.success}</p>
      <div className="flex flex-wrap gap-2">
        {state.versionPdf ? <a className="inline-flex min-h-11 items-center rounded-btn border border-line px-4 font-semibold text-ink hover:bg-surface" href={state.versionPdf}>Descargar PDF de la versión</a> : null}
        {state.whatsappUrl ? <a className="inline-flex min-h-11 items-center rounded-btn border border-wa px-4 font-semibold text-wa-deep" href={state.whatsappUrl} target="_blank" rel="noreferrer">Abrir chat de WhatsApp</a> : hasPhone ? null : <p className="t-small text-ink-soft">Sin teléfono válido: comparta el PDF por su cuenta.</p>}
      </div>
    </div>}
  </div>;
}

export function AssignQuotationForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(assignQuotationToMe, {});
  return <form action={action} className="space-y-2"><input type="hidden" name="id" value={id} /><Button type="submit" variant="ghost" disabled={pending}>{pending ? "Asignando" : "Asignarme esta cotización"}</Button>{state.error && <p role="alert" className="t-small text-error">{state.error}</p>}{state.success && <p aria-live="polite" className="t-small text-success">{state.success}</p>}</form>;
}

export function PhotoCleanupForm() {
  const [state, action, pending] = useActionState<PhotoCleanupState, FormData>(cleanupUnusedHotelPhotos, {});
  return <div className="space-y-3">
    <form action={action} className="flex flex-wrap gap-2">
      <Button type="submit" name="accion" value="revisar" variant="ghost" disabled={pending}>{pending ? "Revisando" : "Buscar fotos sin uso"}</Button>
      {state.unused ? <Button type="submit" name="accion" value="eliminar" variant="ghost" className="text-error" disabled={pending}>Eliminar {state.unused} {state.unused === 1 ? "foto" : "fotos"}</Button> : null}
    </form>
    <div aria-live="polite" className="t-small">
      {state.error ? <p role="alert" className="text-error">{state.error}</p> : null}
      {state.success ? <p className="text-success">{state.success}</p> : null}
      {state.checked !== undefined && !state.success && !state.error ? <p className="text-ink-soft">{state.checked} {state.checked === 1 ? "foto revisada" : "fotos revisadas"}; {state.unused ?? 0} sin uso desde hace más de 7 días.</p> : null}
    </div>
  </div>;
}

// Row action in the quotation list: start a new draft from any previous quotation (same services,
// prices and conditions; dates, validity and confirmations are reset by duplicateQuotation).
export function DuplicateQuotationButton({ id, codigo }: { id: string; codigo: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return <span className="inline-flex items-center gap-2">
    <button type="button" disabled={pending} title="Usar como base para una cotización nueva" aria-label={`Usar ${codigo} como base para una cotización nueva`} onClick={() => start(async () => { const result = await duplicateQuotation(id, "copia"); if (result?.error) setError(result.error); })}
      className="inline-flex size-11 items-center justify-center rounded-btn border border-line text-ink hover:bg-canvas disabled:opacity-50"><Copy size={18} strokeWidth={1.75} aria-hidden="true" /></button>
    {error ? <span role="alert" className="t-small text-error">{error}</span> : null}
  </span>;
}
