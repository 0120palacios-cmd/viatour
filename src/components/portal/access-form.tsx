"use client";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { accessReservation, verifyPortalOtp, type PortalAccessState } from "@/app/mi-reserva/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
const initialState: PortalAccessState = {};

export function PortalAccessForm({ showOtp = false, reference = "" }: { showOtp?: boolean; reference?: string }) {
  const t = useTranslations("portal");
  const v4 = useTranslations("v4.portal");
  const [state, formAction, pending] = useActionState(accessReservation, initialState);
  const [otpState, otpAction, otpPending] = useActionState(verifyPortalOtp, initialState);
  // A customer who mistyped the booking code or surname would otherwise wait on the code step until it
  // expires; "Ingresar otros datos" shows the first step again (a new request replaces the pending one).
  // The restart holds until the request step answers again (every answer is a new state object).
  const [restartedAt, setRestartedAt] = useState<PortalAccessState | null>(null);
  const otpVisible = restartedAt !== state && (showOtp || state.step === "otp" || otpState.step === "otp");
  return <div className="space-y-8">
    {!otpVisible ? <form action={formAction} onSubmit={() => trackEvent("portal_code_requested", { placement: "mi-reserva" })} className="space-y-6" aria-describedby="portal-access-help portal-access-error">
      <div className="space-y-2"><label className="t-small font-semibold" htmlFor="portal-codigo">{t("bookingCode")}</label><Input id="portal-codigo" name="codigo" defaultValue={reference} autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={100} /></div>
      <div className="space-y-2"><label className="t-small font-semibold" htmlFor="portal-apellido">{t("lastName")}</label><Input id="portal-apellido" name="apellido" autoComplete="family-name" required maxLength={120} autoFocus={Boolean(reference)} /></div>
      <p id="portal-access-help" className="t-small text-ink-soft">{t("accessHelp")}</p>
      <Button type="submit" disabled={pending}>{t("continue")}</Button>
      {state.error ? <p id="portal-access-error" className="t-small text-error" role="alert">{state.error}</p> : null}
    </form> : null}
    {otpVisible ? <form action={otpAction} className="space-y-6" aria-describedby="portal-otp-help portal-otp-error">
      {/* The request step always moves here (the notice repeats verificationHelp), so its errors show here too. */}
      {state.error ? <p className="t-small text-error" role="alert">{state.error}</p> : null}
      <div className="space-y-2"><label className="t-small font-semibold" htmlFor="portal-otp">{t("verificationCode")}</label><Input id="portal-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus={state.step === "otp"} /></div>
      <p id="portal-otp-help" className="t-small text-ink-soft">{t("verificationHelp")}</p>
      <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={otpPending}>{t("verify")}</Button><button type="button" onClick={() => setRestartedAt(state)} className="t-small inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline">{v4("restart")}</button></div>
      {otpState.error ? <p id="portal-otp-error" className="t-small text-error" role="alert">{otpState.error}</p> : null}
    </form> : null}
  </div>;
}

// Fires once per browser tab after a successful verification, when the signed-in portal first renders.
export function PortalSignedIn() {
  useEffect(() => {
    try { if (sessionStorage.getItem("viatour-portal-verified")) return; sessionStorage.setItem("viatour-portal-verified", "1"); } catch { /* Storage blocked: still report once per page view. */ }
    trackEvent("portal_verified", { placement: "mi-reserva" });
  }, []);
  return null;
}
