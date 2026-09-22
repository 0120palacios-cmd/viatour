"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { respondToTicket, type TicketActionState } from "@/app/admin/tickets/actions";

const initialState: TicketActionState = {};
export function TicketResponseForm({ id, respuesta, estado }: { id: string; respuesta: string | null; estado: string }) {
  const [state, action, pending] = useActionState(respondToTicket, initialState);
  return <form action={action} className="mt-5 space-y-4"><input type="hidden" name="id" value={id} /><label className="t-small block">Respuesta<textarea name="respuesta" defaultValue={respuesta ?? ""} maxLength={4000} rows={4} className="mt-2 w-full resize-y rounded-btn border border-line bg-canvas px-3 py-3" /></label><label className="t-small block">Estado<select name="estado" defaultValue={estado} className="mt-2 h-12 w-full rounded-btn border border-line bg-canvas px-3"><option value="abierto">Abierto</option><option value="en_revision">En revisión</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></select></label><Button type="submit" disabled={pending}>{pending ? "Guardando" : "Guardar respuesta"}</Button>{state.error ? <p className="t-small text-error" role="alert">{state.error}</p> : null}{state.success ? <p className="t-small text-success" role="status">{state.success}</p> : null}</form>;
}
