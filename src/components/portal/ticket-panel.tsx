"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortalTicket } from "@/lib/portal-data";

export function TicketPanel() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/mi-reserva/tickets", { cache: "no-store" });
    if (response.ok) setTickets((await response.json()).tickets ?? []);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/mi-reserva/tickets", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(body => {
      if (active && body) setTickets(body.tickets ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/mi-reserva/tickets", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "No se pudo enviar su solicitud.");
      event.currentTarget.reset();
      setStatus("Su solicitud fue enviada.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo enviar su solicitud.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="mt-6 grid gap-8 lg:grid-cols-2"><form onSubmit={submit} className="space-y-5"><label className="t-small block">Asunto<input name="asunto" required maxLength={160} className="mt-2 h-12 w-full rounded-btn border border-line bg-canvas px-3" /></label><label className="t-small block">Detalle de su solicitud<textarea name="mensaje" required maxLength={4000} rows={6} className="mt-2 w-full resize-y rounded-btn border border-line bg-canvas px-3 py-3" /></label><Button type="submit" disabled={busy}><Send size={18} strokeWidth={1.75} aria-hidden="true" />{busy ? "Enviando" : "Enviar solicitud"}</Button>{status ? <p className="t-small text-ink-soft" role="status">{status}</p> : null}</form><div className="space-y-4"><h3 className="t-h3">Sus solicitudes</h3>{!tickets.length ? <p className="rounded-card border border-line bg-canvas p-5 t-small text-ink-soft">Aún no hay solicitudes.</p> : tickets.map(ticket => <article key={ticket.id} className="rounded-card border border-line bg-canvas p-5"><div className="flex flex-wrap justify-between gap-3"><h4 className="font-semibold">{ticket.asunto}</h4><span className="t-small text-ink-soft">{ticket.estado}</span></div><p className="mt-3 whitespace-pre-wrap break-words t-small">{ticket.mensaje}</p>{ticket.respuesta ? <div className="mt-4 border-t border-line pt-4"><p className="t-small font-semibold">Respuesta de viatour</p><p className="mt-2 whitespace-pre-wrap break-words t-small text-ink-soft">{ticket.respuesta}</p></div> : null}</article>)}</div></div>;
}
