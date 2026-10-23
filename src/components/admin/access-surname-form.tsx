"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { setAccessEmail, setAccessSurname } from "@/app/admin/reservas/portal-access-actions";

// Shown only while the reservation has no access surname: without it the customer cannot sign in to Mi viaje.
export function AccessSurnameForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(setAccessSurname, {});
  return <form action={action} className="space-y-3 rounded-card border border-error/40 bg-surface p-4">
    <input type="hidden" name="id" value={id} />
    <p className="font-semibold text-error">Falta el apellido de acceso a Mi viaje</p>
    <p className="t-small text-ink-soft">Sin este dato el cliente no puede entrar al portal con su código de reserva. Use el apellido exactamente como el cliente lo escribirá. Solo se puede registrar una vez.</p>
    <label className="t-small block font-semibold">Apellido de acceso
      <input name="apellido" required maxLength={120} autoComplete="off" className="mt-1 min-h-11 w-full rounded-btn border border-line bg-canvas px-3 font-normal" />
    </label>
    <label className="t-small flex items-start gap-3"><input type="checkbox" name="confirmed" value="si" required className="mt-1" />Confirmo que el apellido es correcto.</label>
    <Button type="submit" disabled={pending}>{pending ? "Guardando" : "Guardar apellido de acceso"}</Button>
    {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="t-small text-success">{state.success}</p> : null}
  </form>;
}

// Shown only while the reservation has no e-mail (customers who only use WhatsApp): Mi viaje sends its
// sign-in code to this address, so without it the customer cannot enter the portal.
export function AccessEmailForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(setAccessEmail, {});
  return <form action={action} className="space-y-3 rounded-card border border-line bg-surface p-4">
    <input type="hidden" name="id" value={id} />
    <p className="font-semibold text-ink">Sin correo: el cliente no puede entrar a Mi viaje</p>
    <p className="t-small text-ink-soft">Mi viaje envía el código de acceso a este correo. Si el cliente desea usarlo, registre su correo. Solo se puede registrar una vez.</p>
    <label className="t-small block font-semibold">Correo del cliente
      <input name="email" type="email" required maxLength={254} autoComplete="off" className="mt-1 min-h-11 w-full rounded-btn border border-line bg-canvas px-3 font-normal" />
    </label>
    <label className="t-small flex items-start gap-3"><input type="checkbox" name="confirmed" value="si" required className="mt-1" />Confirmo que el correo pertenece al cliente.</label>
    <Button type="submit" variant="ghost" disabled={pending}>{pending ? "Guardando" : "Guardar correo de acceso"}</Button>
    {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="t-small text-success">{state.success}</p> : null}
  </form>;
}
