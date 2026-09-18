"use client";
import { Turnstile } from "@/components/turnstile";

import { useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestQuote, type QuotePayload } from "@/lib/quote";
import { useCurrency } from "@/components/currency-provider";

export function QuoteButton({ payload, children }: { payload: QuotePayload; children: React.ReactNode }) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const { currency } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const locked = useRef(false);
  return <div>
    <Turnstile onToken={setTurnstileToken} resetKey={challenge} />
    <Button variant="whatsapp" className="h-auto min-h-12 whitespace-normal text-left" disabled={busy || !turnstileToken} aria-busy={busy} onClick={async () => {
      if (locked.current) return;
      locked.current = true; setBusy(true); setError(false);
      try { await requestQuote({ ...payload, currency, turnstileToken }); }
      catch { setError(true); }
      finally { locked.current = false; setBusy(false); setChallenge(n => n + 1); }
    }}><MessageCircle className="shrink-0 text-ink-soft" size={24} strokeWidth={1.75} aria-hidden="true" />{children}</Button>
    {/* Copy pendiente de aprobación final */}
    {error && <p role="alert" className="t-small mt-3 text-error">No se pudo enviar su solicitud. Por favor, inténtelo de nuevo.</p>}
  </div>;
}
