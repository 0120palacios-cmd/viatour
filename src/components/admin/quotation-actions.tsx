"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendQuotation, updateQuotationStatus, type QuotationActionState } from "@/app/admin/cotizaciones/actions";
import { quotationStatusLabel, quotationStatuses, type QuotationStatus } from "@/lib/quotation-types";

export function QuotationStatusForm({ id, status }: { id: string; status: QuotationStatus }) {
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(updateQuotationStatus, {});
  const manualStatuses = quotationStatuses.filter(value => ["aceptada", "rechazada", "expirada"].includes(value));
  const defaultStatus = manualStatuses.includes(status as "aceptada" | "rechazada" | "expirada") ? status : "aceptada";
  return <form action={action} className="flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={id} /><label className="sr-only" htmlFor={`status-${id}`}>Estado manual de la cotización</label><select id={`status-${id}`} name="estado" defaultValue={defaultStatus} className="h-12 rounded-btn border border-line bg-canvas px-3 text-ink">{manualStatuses.map(value => <option key={value} value={value}>{quotationStatusLabel(value)}</option>)}</select><Button type="submit" variant="ghost" disabled={pending}>Guardar estado</Button>{state.error && <span role="alert" className="w-full text-error t-small">{state.error}</span>}{state.success && <span aria-live="polite" className="w-full text-success t-small">{state.success}</span>}</form>;
}

export function SendQuotationForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(sendQuotation, {});
  return <div className="space-y-3"><form action={action}><input type="hidden" name="id" value={id} /><Button type="submit" disabled={pending}>{pending ? "Enviando" : "Enviar al cliente"}</Button></form>{state.error && <p role="alert" className="t-small text-error">{state.error}</p>}{state.success && <p aria-live="polite" className="t-small text-success">{state.success}</p>}{state.whatsappUrl && <a className="inline-flex min-h-12 items-center rounded-btn border border-wa px-4 py-3 font-semibold text-wa-deep underline underline-offset-4" href={state.whatsappUrl} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>}</div>;
}
