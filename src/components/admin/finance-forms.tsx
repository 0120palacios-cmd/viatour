"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelReservation, recordRefund, type FinanceState } from "@/app/admin/reservas/finance-actions";
import { paymentMethodLabel, paymentMethods } from "@/lib/reservation-types";

const control = "w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand";

// A refund (money returned) or the reversal of a payment recorded by mistake. The request id makes a double
// click or a retry record the movement once; after success a new id starts the next one.
export function RefundForm({ reservationId, currency, received, reversible }: { reservationId: string; currency: string; received: string; reversible: { id: string; label: string }[] }) {
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState<"reembolso" | "reverso">("reembolso");
  const [state, action, pending] = useActionState<FinanceState, FormData>(async (previous, form) => { const result = await recordRefund(previous, form); if (result.success) setRequest(crypto.randomUUID()); return result; }, {});
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="request_id" value={request} /><input type="hidden" name="reservation_id" value={reservationId} />
    <fieldset className="space-y-2 sm:col-span-2"><legend className="t-small font-semibold">Tipo</legend>
      <label className="flex min-h-11 items-center gap-3"><input type="radio" name="tipo" value="reembolso" checked={kind === "reembolso"} onChange={() => setKind("reembolso")} className="size-4 accent-brand" />Devolución al cliente (hasta {received})</label>
      <label className="flex min-h-11 items-center gap-3"><input type="radio" name="tipo" value="reverso" checked={kind === "reverso"} onChange={() => setKind("reverso")} disabled={!reversible.length} className="size-4 accent-brand" />Revertir un pago registrado por error{reversible.length ? "" : " (ninguno sin recibo)"}</label>
    </fieldset>
    {kind === "reembolso" ? <>
      <label className="block t-small">Monto devuelto ({currency}) *<input className={control} required name="monto" type="number" min="0.01" step="0.01" /></label>
      <label className="block t-small">Método *<select className={control} name="metodo" defaultValue="transferencia">{paymentMethods.map(method => <option key={method} value={method}>{paymentMethodLabel(method)}</option>)}</select></label>
      <label className="block t-small">Fecha de la devolución *<input className={control} required name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      <label className="block t-small">Referencia<input className={control} name="referencia" maxLength={200} /></label>
    </> : <label className="block t-small sm:col-span-2">Pago a revertir *<select className={control} name="revierte_a" required defaultValue="">{[<option key="" value="" disabled>Elegir pago</option>, ...reversible.map(payment => <option key={payment.id} value={payment.id}>{payment.label}</option>)]}</select></label>}
    <label className="block t-small sm:col-span-2">Motivo *<textarea className={control} name="motivo" required minLength={3} maxLength={500} rows={2} placeholder={kind === "reverso" ? "Por ejemplo: registrado en la reserva equivocada" : "Por ejemplo: cancelación con devolución parcial"} /></label>
    <div className="sm:col-span-2" aria-live="polite">{state.error && <p role="alert" className="mb-3 t-small text-error">{state.error}</p>}{state.success && <p className="mb-3 t-small text-success">{state.success}</p>}
      <Button type="submit" variant="ghost" disabled={pending}>{pending ? "Registrando" : kind === "reverso" ? "Revertir pago" : "Registrar devolución"}</Button></div>
  </form>;
}

// Guided cancellation: the checklist is computed by the page from the reservation's real data.
export function CancelReservationForm({ id, checklist, openInvoices }: { id: string; checklist: { label: string; warn: boolean }[]; openInvoices: number }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(cancelReservation, {});
  if (state.success) return <p aria-live="polite" className="t-small text-success">{state.success}</p>;
  return <form action={action} className="space-y-4">
    <input type="hidden" name="id" value={id} />
    <ul className="space-y-2">{checklist.map(item => <li key={item.label} className={`t-small ${item.warn ? "text-ink" : "text-ink-soft"}`}>{item.warn ? "Revisar: " : ""}{item.label}</li>)}</ul>
    <label className="block t-small">Motivo de la cancelación *<textarea className={control} name="motivo" required minLength={3} maxLength={500} rows={2} placeholder="Por ejemplo: el cliente desistió del viaje" /></label>
    {openInvoices ? <label className="flex items-start gap-3 t-small"><input type="checkbox" name="anular" value="si" defaultChecked className="mt-0.5 size-4 accent-brand" />Anular {openInvoices === 1 ? "la factura pendiente" : `las ${openInvoices} facturas pendientes`} (las pagadas se conservan).</label> : null}
    <label className="flex items-start gap-3 t-small"><input type="checkbox" name="revisado" value="si" required className="mt-0.5 size-4 accent-brand" />Revisé pagos, facturas, proveedor y boletos. La cancelación es definitiva y el cliente la verá en Mi viaje.</label>
    {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : null}
    <Button type="submit" variant="ghost" className="text-error" disabled={pending}>{pending ? "Cancelando" : "Cancelar reserva"}</Button>
  </form>;
}
