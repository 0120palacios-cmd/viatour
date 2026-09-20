"use client";

import { useActionState } from "react";
import { accessReservation, type PortalAccessState } from "@/app/mi-reserva/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PortalAccessState = {};

export function PortalAccessForm() {
  const [state, formAction, pending] = useActionState(accessReservation, initialState);
  return (
    <form action={formAction} className="space-y-6" aria-describedby="portal-access-help portal-access-error">
      <div className="space-y-2">
        <label className="t-small font-semibold" htmlFor="portal-codigo">Código de reserva</label>
        <Input id="portal-codigo" name="codigo" autoComplete="off" required maxLength={100} />
      </div>
      <div className="space-y-2">
        <label className="t-small font-semibold" htmlFor="portal-apellido">Apellido</label>
        <Input id="portal-apellido" name="apellido" autoComplete="family-name" required maxLength={120} />
      </div>
      <p id="portal-access-help" className="t-small text-ink-soft">Use los datos que recibió de su asesor de viatour.</p>
      {state.error ? <p id="portal-access-error" className="t-small text-error" role="alert">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Ingresando" : "Ver mi reserva"}</Button>
    </form>
  );
}
