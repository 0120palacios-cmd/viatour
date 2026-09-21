"use client";

import { useActionState } from "react";
import { accessReservation, verifyPortalOtp, type PortalAccessState } from "@/app/mi-reserva/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PortalAccessState = {};

export function PortalAccessForm({ showOtp = false }: { showOtp?: boolean }) {
  const [state, formAction, pending] = useActionState(accessReservation, initialState);
  const [otpState, otpAction, otpPending] = useActionState(verifyPortalOtp, initialState);
  const otpVisible = showOtp || state.step === "otp" || otpState.step === "otp";
  return (
    <div className="space-y-8">
      {!otpVisible ? <form action={formAction} className="space-y-6" aria-describedby="portal-access-help portal-access-error">
        <div className="space-y-2">
          <label className="t-small font-semibold" htmlFor="portal-codigo">Código de reserva</label>
          <Input id="portal-codigo" name="codigo" autoComplete="off" required maxLength={100} />
        </div>
        <div className="space-y-2">
          <label className="t-small font-semibold" htmlFor="portal-apellido">Apellido</label>
          <Input id="portal-apellido" name="apellido" autoComplete="family-name" required maxLength={120} />
        </div>
        <p id="portal-access-help" className="t-small text-ink-soft">Use los datos que recibió de su asesor de viatour.</p>
        <Button type="submit" disabled={pending}>Continuar</Button>
        {state.notice ? <p id="portal-access-notice" className="t-small text-ink-soft" role="status">{state.notice}</p> : null}
        {state.error ? <p id="portal-access-error" className="t-small text-error" role="alert">{state.error}</p> : null}
      </form> : null}
      {otpVisible ? <form action={otpAction} className="space-y-6" aria-describedby="portal-otp-help portal-otp-error">
        <div className="space-y-2">
          <label className="t-small font-semibold" htmlFor="portal-otp">Código de verificación</label>
          <Input id="portal-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
        </div>
        <p id="portal-otp-help" className="t-small text-ink-soft">Si los datos coinciden con una reserva, recibirá un código en el correo registrado. Ingréselo para continuar.</p>
        <Button type="submit" disabled={otpPending}>Verificar código</Button>
        {otpState.error ? <p id="portal-otp-error" className="t-small text-error" role="alert">{otpState.error}</p> : null}
      </form> : null}
    </div>
  );
}
