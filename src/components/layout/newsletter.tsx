"use client";
import { Turnstile } from "@/components/turnstile";
import { trackEvent } from "@/lib/analytics";

import { useId, useState } from "react";
import Link from "next/link";
import { Check, CircleCheck } from "lucide-react";
import { Checkbox } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// DRAFT: homepage newsletter copy supplied for UI refinement, pending owner approval.
export function Newsletter() {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"empty" | "error" | "success">("empty");
  const [emailError, setEmailError] = useState(false);
  const [consentError, setConsentError] = useState(false);

  return (
    <section className="bg-surface py-14 sm:py-24" aria-labelledby={`${id}-title`}>
      <div className="container-site grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <h2 id={`${id}-title`} className="t-h2">Reciba ideas de viaje y ofertas de temporada</h2>
          <p className="t-body-lg measure text-ink-soft">Le enviamos inspiración para su próximo viaje y promociones ocasionales. Puede darse de baja cuando quiera.</p>
        </div>
        <form noValidate className="space-y-4" aria-labelledby={`${id}-title`} onChange={() => { if (state === "success") setState("empty"); }} onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const form = event.currentTarget;
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
          setBusy(true);
          try {
            const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.value, nombre: (form.elements.namedItem("name") as HTMLInputElement).value, consent, turnstileToken }) });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error("Signup failed");
            trackEvent("newsletter_signup", { status: "saved" });
            setState("success");
          } catch { setState("error"); }
          finally { setBusy(false); setChallenge(n => n + 1); }
        }}>
          <div className="space-y-2">
            <label className="t-small" htmlFor={`${id}-email`}>Correo electrónico (requerido)</label>
            <Input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required aria-invalid={emailError} aria-describedby={emailError ? `${id}-email-error` : undefined} />
            {emailError && <p id={`${id}-email-error`} className="t-small rounded-btn border border-error bg-canvas p-3 text-error">Ingrese un correo electrónico válido.</p>}
          </div>
          <div className="space-y-2">
            <label className="t-small" htmlFor={`${id}-name`}>Nombre (opcional)</label>
            <Input id={`${id}-name`} name="name" maxLength={120} autoComplete="given-name" />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox.Root id={`${id}-consent`} required checked={consent} onCheckedChange={(value) => { setConsent(value === true); if (state === "success") setState("empty"); }} aria-invalid={consentError} aria-describedby={consentError ? `${id}-consent-error` : undefined} className="flex size-12 shrink-0 items-center justify-center rounded-btn border border-line bg-canvas text-brand data-[state=checked]:bg-brand-tint">
              <Checkbox.Indicator><Check size={16} strokeWidth={2} aria-hidden="true" /></Checkbox.Indicator>
            </Checkbox.Root>
            <label className="t-small" htmlFor={`${id}-consent`}>Acepto recibir ideas de viaje y ofertas de temporada según la <Link className="underline underline-offset-4" href="/legales/privacidad">política de privacidad</Link>.</label>
          </div>
          {consentError && <p id={`${id}-consent-error`} className="t-small rounded-btn border border-error bg-canvas p-3 text-error">Para continuar, indique su consentimiento.</p>}
          <Turnstile onToken={setTurnstileToken} resetKey={challenge} />
          <Button type="submit" disabled={busy || !turnstileToken} aria-busy={busy}>Suscribirme</Button>
          <div role="status" aria-live="polite" aria-atomic="true">
            {state === "success" && <p className="t-small flex items-start gap-3 rounded-btn border border-success bg-canvas p-4 text-ink"><CircleCheck size={24} className="shrink-0 text-brand" aria-hidden="true" />Gracias. Ha quedado suscrito.</p>}
            {state === "error" && <p className="t-small">Revise los campos indicados.</p>}
          </div>
        </form>
      </div>
    </section>
  );
}
