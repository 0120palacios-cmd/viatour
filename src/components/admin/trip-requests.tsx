"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateServiceRequest } from "@/app/admin/reservas/request-actions";
import { requestStatusLabels, requestStatuses, serviceLabels } from "@/lib/trip-requests";
import type { AdminFeedback, AdminServiceRequest } from "@/lib/trip-request-admin";

const day = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tegucigalpa" });

function RequestRow({ request, reservationId }: { request: AdminServiceRequest; reservationId: string }) {
  const [state, action, pending] = useActionState(updateServiceRequest, {});
  return <li className="space-y-3 p-4 sm:px-6">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="font-semibold text-ink">{serviceLabels[request.service]}<span className="t-small ml-2 rounded-btn bg-brand-tint px-2 py-0.5 text-brand-deep">{requestStatusLabels[request.status]}</span></p>
      <p className="t-small text-ink-soft"><time dateTime={request.created_at}>{day.format(new Date(request.created_at))}</time></p>
    </div>
    <p className="t-small text-ink-soft">{[request.destination, [request.trip_start, request.trip_end].filter(Boolean).join(" a "), request.travelers ? `${request.travelers} viajeros` : ""].filter(Boolean).join(" · ")}</p>
    {request.note ? <p className="whitespace-pre-wrap break-words rounded-btn bg-surface px-3 py-2">{request.note}</p> : <p className="t-small text-ink-soft">Sin nota del cliente.</p>}
    <form action={action} className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="id" value={request.id} /><input type="hidden" name="reservation_id" value={reservationId} />
      <label className="t-small font-semibold">Estado<select name="status" defaultValue={request.status} className="mt-1 block min-h-11 w-full rounded-btn border border-line bg-canvas px-3 font-normal">{requestStatuses.map(status => <option key={status} value={status}>{requestStatusLabels[status]}</option>)}</select></label>
      <label className="t-small font-semibold">Nota interna<input name="staff_note" defaultValue={request.staff_note ?? ""} maxLength={600} className="mt-1 block min-h-11 w-full rounded-btn border border-line bg-canvas px-3 font-normal" /></label>
      <Button type="submit" variant="ghost" disabled={pending} className="min-h-11">{pending ? "Guardando" : "Guardar"}</Button>
    </form>
    {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : state.success ? <p role="status" className="t-small text-success">{state.success}</p> : null}
  </li>;
}

// The services this reservation's traveller asked for from Mi viaje, and their private feedback.
export function TripRequests({ reservationId, available, requests, feedback }: { reservationId: string; available: boolean; requests: AdminServiceRequest[]; feedback: AdminFeedback | null }) {
  const open = requests.filter(request => request.status === "nueva").length;
  return <section id="solicitudes" aria-labelledby="requests-heading" className="scroll-mt-6 rounded-panel border border-line bg-canvas">
    <div className="border-b border-line px-4 py-4 sm:px-6">
      <h2 id="requests-heading" className="t-h3 flex flex-wrap items-center gap-2">Solicitudes desde Mi viaje{open ? <span className="t-small rounded-btn bg-brand px-2 text-white">{open} nuevas</span> : null}</h2>
      <p className="t-small mt-1 text-ink-soft">Servicios que el cliente pidió cotizar (auto, traslado, hotel...) y su opinión privada del viaje. El cliente ve el estado de cada solicitud.</p>
    </div>
    {!available ? <p className="t-small m-4 rounded-card border border-line bg-surface p-4 sm:m-6">Las solicitudes y opiniones de Mi viaje requieren <code>docs/sql/mi_viaje_premium.sql</code>. Mientras tanto llegan como solicitudes de soporte (asunto «Solicitud de servicio: …» u «Opinión del viaje») en <Link className="text-brand underline" href="/admin/tickets">Tickets</Link>, con aviso al correo de soporte.</p> : <>
      {requests.length ? <ul className="divide-y divide-line">{requests.map(request => <RequestRow key={request.id} request={request} reservationId={reservationId} />)}</ul> : <p className="t-small p-4 text-ink-soft sm:px-6">El cliente no ha pedido servicios adicionales.</p>}
      <div className="border-t border-line p-4 sm:px-6">
        <h3 className="font-semibold">Opinión privada del viaje</h3>
        {feedback ? <div className="mt-2 space-y-1"><p className="flex items-center gap-1" aria-label={`${feedback.rating} de 5`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={18} strokeWidth={1.75} className={value <= feedback.rating ? "fill-amber text-amber" : "text-ink-soft"} aria-hidden="true" />)}<span className="t-small ml-2 text-ink-soft">{feedback.rating} de 5 · {day.format(new Date(feedback.updated_at ?? feedback.created_at))}</span></p>{feedback.comment ? <p className="whitespace-pre-wrap break-words">{feedback.comment}</p> : null}</div> : <p className="t-small mt-1 text-ink-soft">Sin opinión todavía. Se pide al final del viaje.</p>}
      </div>
    </>}
  </section>;
}
