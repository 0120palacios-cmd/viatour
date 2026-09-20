"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { convertQuotationToReservation, createInvoice, recordPayment, sendInvoice, updateInvoiceStatus, type InvoiceActionState, type ReservationActionState } from "@/app/admin/reservas/actions";
import { invoiceStatusLabel, invoiceStatuses, paymentMethodLabel, paymentMethods, type Invoice, type Reservation } from "@/lib/reservation-types";

const control = "w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand";

export function ConvertQuotationForm({ quotationId, enabled }: { quotationId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<ReservationActionState, FormData>(convertQuotationToReservation, {});
  return <div className="space-y-3"><form action={action}><input type="hidden" name="quotation_id" value={quotationId} /><Button type="submit" disabled={!enabled || pending}>{pending ? "Creando reserva" : "Convertir en reserva"}</Button></form>{!enabled && <p className="t-small text-ink-soft">La cotización debe estar aceptada para crear una reserva.</p>}{state.error && <p role="alert" className="t-small text-error">{state.error}</p>}</div>;
}

export function PaymentForm({ reservation }: { reservation: Reservation }) {
  const [state, action, pending] = useActionState<ReservationActionState, FormData>(recordPayment, {});
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="reservation_id" value={reservation.id} /><label className="block t-small">Monto *<input className={control} required name="monto" type="number" min="0.01" step="0.01" /></label><label className="block t-small">Moneda *<select className={control} name="moneda" defaultValue={reservation.moneda}>{[reservation.moneda].map(currency => <option key={currency}>{currency}</option>)}</select></label><label className="block t-small">Método *<select className={control} name="metodo" defaultValue="transferencia">{paymentMethods.map(method => <option key={method} value={method}>{paymentMethodLabel(method)}</option>)}</select></label><label className="block t-small">Fecha del pago *<input className={control} required name="fecha_pago" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="block t-small sm:col-span-2">Referencia<input className={control} name="referencia" maxLength={200} /></label><label className="block t-small sm:col-span-2">Notas<textarea className={control} name="notas" rows={3} maxLength={5000} /></label><div className="sm:col-span-2" aria-live="polite">{state.error && <p role="alert" className="mb-3 t-small text-error">{state.error}</p>}{state.success && <p className="mb-3 t-small text-success">{state.success}</p>}<Button type="submit" disabled={pending}>{pending ? "Guardando" : "Registrar pago"}</Button></div></form>;
}

export function InvoiceCreateForm({ reservationId }: { reservationId: string }) {
  const [state, action, pending] = useActionState<InvoiceActionState, FormData>(createInvoice, {});
  return <form action={action} className="flex flex-wrap items-end gap-4"><input type="hidden" name="reservation_id" value={reservationId} /><label className="block t-small">Fecha de vencimiento *<input className={control} required type="date" name="fecha_vencimiento" /></label><Button type="submit" disabled={pending}>{pending ? "Creando" : "Crear factura"}</Button>{state.error && <p role="alert" className="w-full t-small text-error">{state.error}</p>}{state.invoiceId && <a className="text-brand underline underline-offset-4" href={`/admin/facturacion/${state.invoiceId}`}>Abrir factura</a>}</form>;
}

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const [sendState, sendAction, sendPending] = useActionState<InvoiceActionState, FormData>(sendInvoice, {});
  const [statusState, statusAction, statusPending] = useActionState<InvoiceActionState, FormData>(updateInvoiceStatus, {});
  return <div className="space-y-4"><div className="flex flex-wrap gap-3"><a className="inline-flex min-h-12 items-center rounded-btn border border-line px-5 py-3 text-brand underline underline-offset-4" href={`/api/admin/facturacion/${invoice.id}/pdf`}>Descargar PDF</a><form action={sendAction}><input type="hidden" name="id" value={invoice.id} /><Button type="submit" disabled={sendPending}>{sendPending ? "Enviando" : "Enviar al cliente"}</Button></form>{sendState.whatsappUrl && <a className="inline-flex min-h-12 items-center rounded-btn border border-wa px-5 py-3 font-semibold text-wa-deep underline underline-offset-4" href={sendState.whatsappUrl} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>}</div>{sendState.error && <p role="alert" className="t-small text-error">{sendState.error}</p>}{sendState.success && <p aria-live="polite" className="t-small text-success">{sendState.success}</p>}<form action={statusAction} className="flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={invoice.id} /><label className="block t-small">Estado<select className={control} name="estado" defaultValue={invoice.estado}>{invoiceStatuses.map(status => <option key={status} value={status}>{invoiceStatusLabel(status)}</option>)}</select></label><Button type="submit" variant="ghost" disabled={statusPending}>Guardar estado</Button>{statusState.error && <p role="alert" className="w-full t-small text-error">{statusState.error}</p>}{statusState.success && <p aria-live="polite" className="w-full t-small text-success">{statusState.success}</p>}</form></div>;
}
