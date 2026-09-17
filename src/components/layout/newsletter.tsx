"use client";
import { trackEvent } from "@/lib/analytics";

import { useId, useState } from "react";
import Link from "next/link";
import { Check, CircleCheck } from "lucide-react";
import { Checkbox } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// DRAFT: value line, consent and validation/status copy need owner approval.
// The visible draft notice must remain until that copy and the POST are approved.
export function Newsletter() {
  const id = useId();
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"empty" | "error" | "success">("empty");
  const [emailError, setEmailError] = useState(false);
  const [consentError, setConsentError] = useState(false);

  return (
    <form noValidate className="space-y-4" aria-labelledby={`${id}-title`} onChange={() => { if (state === "success") setState("empty"); }} onSubmit={(event) => {
      event.preventDefault();
      const email = event.currentTarget.elements.namedItem("email") as HTMLInputElement;
      const invalidEmail = !email.validity.valid;
      setEmailError(invalidEmail);
      setConsentError(!consent);
      if (invalidEmail || !consent) {
        setState("error");
        if (invalidEmail) email.focus();
        else document.getElementById(`${id}-consent`)?.focus();
        return;
      }
      // TODO Stage newsletter storage: POST email, optional name and explicit
      // consent to the server; only confirm subscription after a successful save.
      // Stage 2 validates locally and does not transmit or store personal data.
      trackEvent("newsletter_signup", { status: "requested" });
      setState("success");
    }}>
      <p id={`${id}-title`} className="t-body-lg">Reciba ideas de viaje y ofertas de temporada.</p>
      <p className="t-small">Borrador pendiente de aprobación. Formulario de prueba; no guarda sus datos.</p>
      <div className="space-y-2">
        <label className="t-small" htmlFor={`${id}-email`}>Correo electrónico (requerido)</label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required aria-invalid={emailError} aria-describedby={emailError ? `${id}-email-error` : undefined} />
        {emailError && <p id={`${id}-email-error`} className="t-small rounded-btn border border-error bg-canvas p-3 text-error">Ingrese un correo electrónico válido.</p>}
      </div>
      <div className="space-y-2">
        <label className="t-small" htmlFor={`${id}-name`}>Nombre (opcional)</label>
        <Input id={`${id}-name`} name="name" autoComplete="given-name" />
      </div>
      <div className="flex items-start gap-3">
        <Checkbox.Root id={`${id}-consent`} required checked={consent} onCheckedChange={(value) => { setConsent(value === true); if (state === "success") setState("empty"); }} aria-invalid={consentError} aria-describedby={consentError ? `${id}-consent-error` : undefined} className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-btn border border-line bg-canvas text-brand data-[state=checked]:bg-brand-tint">
          <Checkbox.Indicator><Check size={16} strokeWidth={2} aria-hidden="true" /></Checkbox.Indicator>
        </Checkbox.Root>
        <label className="t-small" htmlFor={`${id}-consent`}>Acepto recibir ideas de viaje y ofertas de temporada según la <Link className="underline underline-offset-4" href="/legales/privacidad">política de privacidad</Link> (requerido).</label>
      </div>
      {consentError && <p id={`${id}-consent-error`} className="t-small rounded-btn border border-error bg-canvas p-3 text-error">Para continuar, indique su consentimiento.</p>}
      <Button type="submit">Suscribirme</Button>
      <div role="status" aria-live="polite" aria-atomic="true">
        {state === "success" && <p className="t-small flex items-start gap-3 rounded-btn border border-success bg-canvas p-4 text-ink"><CircleCheck size={24} className="shrink-0 text-brand" aria-hidden="true" />Datos validados. La suscripción aún no se ha guardado.</p>}
        {state === "error" && <p className="t-small">Revise los campos indicados.</p>}
      </div>
    </form>
  );
}
