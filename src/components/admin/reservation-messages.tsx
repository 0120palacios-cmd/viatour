"use client";

import { useActionState, useEffect, useRef } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markConversationRead, replyToReservation } from "@/app/admin/reservas/message-actions";
import { messageMaxLength, type MessageThread } from "@/lib/reservation-messages";

const topicLabels: Record<string, string> = { vuelo: "Vuelos", hotel: "Hotel", documentos: "Documentos", cambios: "Cambios", pagos: "Pagos", otro: "Otro" };
const time = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tegucigalpa" });

// The reservation's conversation with the traveller, the same thread the customer sees in Mi viaje.
export function ReservationMessages({ reservationId, code, customer, thread }: { reservationId: string; code: string; customer: string; thread: MessageThread }) {
  const [state, action, pending] = useActionState(replyToReservation, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) form.current?.reset(); }, [state]);
  const unread = thread.messages.filter(message => message.sender === "cliente" && !message.agency_read_at).length;
  return <section id="mensajes" aria-labelledby="messages-heading" className="scroll-mt-6 rounded-panel border border-line bg-canvas p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="messages-heading" className="t-h3 flex items-center gap-2">Mensajes del viaje{unread ? <span className="t-small rounded-btn bg-brand px-2 text-white">{unread} sin leer</span> : null}</h2>
      {unread ? <form action={markConversationRead}><input type="hidden" name="reservation_id" value={reservationId} /><Button type="submit" variant="ghost" className="min-h-10 px-3">Marcar como leídos</Button></form> : null}
    </div>
    <p className="t-small mt-1 text-ink-soft">Conversación con {customer} sobre la reserva {code}. El cliente la ve en Mi viaje.</p>
    {!thread.available ? <p className="t-small mt-4 rounded-card border border-line bg-surface p-4">La conversación por reserva requiere aplicar <code>docs/sql/reservation_messages.sql</code>. Mientras tanto, el cliente usa las solicitudes de soporte y WhatsApp.</p> : <>
      <ol className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto rounded-card border border-line bg-surface p-3">
        {thread.messages.length ? thread.messages.map(message => {
          const agency = message.sender === "agencia";
          return <li key={message.id} className={`flex ${agency ? "justify-end" : "justify-start"}`}>
            <article className={`max-w-[85%] rounded-card px-4 py-3 ${agency ? "bg-brand-tint" : "border border-line bg-canvas"}`}>
              <p className="t-small flex flex-wrap gap-x-2 font-semibold">{agency ? "viatour" : customer}{message.topic ? <span className="font-normal text-ink-soft">· {topicLabels[message.topic]}</span> : null}{!agency && !message.agency_read_at ? <span className="rounded-btn bg-brand px-2 text-[12px] leading-5 text-white">Nuevo</span> : null}</p>
              {message.body ? <p className="mt-1 whitespace-pre-wrap break-words">{message.body}</p> : null}
              {message.attachments?.length ? <ul className="mt-2 space-y-1">{message.attachments.map(file => <li key={file.id}><a className="t-small inline-flex min-h-10 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline" href={`/api/admin/reservas/${reservationId}/adjuntos/${file.id}`} target="_blank" rel="noopener noreferrer"><Paperclip size={16} strokeWidth={1.75} aria-hidden="true" />{file.name} <span className="font-normal text-ink-soft">({Math.max(1, Math.round(file.size / 1024))} KB)</span></a></li>)}</ul> : null}
              <p className="t-small mt-1 text-ink-soft"><time dateTime={message.created_at}>{time.format(new Date(message.created_at))}</time>{agency && message.customer_read_at ? " · Leído por el cliente" : ""}</p>
            </article>
          </li>;
        }) : <li className="t-small p-2 text-ink-soft">Aún no hay mensajes en esta reserva.</li>}
      </ol>
      <form ref={form} action={action} className="mt-4 space-y-3">
        <input type="hidden" name="reservation_id" value={reservationId} />
        <label className="t-small block font-semibold">Responder al cliente
          <textarea name="body" required maxLength={messageMaxLength} rows={4} className="mt-2 w-full resize-y rounded-btn border border-line bg-canvas px-3 py-3 font-normal" />
        </label>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={pending}><Send size={18} strokeWidth={1.75} aria-hidden="true" />{pending ? "Publicando" : "Publicar respuesta"}</Button><p className="t-small text-ink-soft">Se publica en Mi viaje. No incluya datos de pasaporte ni de pago.</p></div>
        {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : null}
        {state.success ? <p role="status" className="t-small text-success">{state.success}</p> : null}
      </form>
    </>}
  </section>;
}
