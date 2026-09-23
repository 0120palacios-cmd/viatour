"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { segments } from "@/lib/promo-wheel";
import { siteConfig } from "@/lib/site-config";

export function PromoWheel() {
  const locale = useLocale();
  const en = locale === "en";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [winner, setWinner] = useState<{ id: string; code: string } | null>(null);
  const [rotation, setRotation] = useState(0);
  async function spin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setWinner(null);
    try {
      const response = await fetch("/api/promo-spin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { setError(en ? "We could not validate this code. Check it or contact your advisor." : "No se pudo validar el código. Revíselo o consulte con su asesor."); return; }
      const index = segments.findIndex(item => item.id === data.id);
      if (index < 0) throw new Error("Invalid result");
      const center = (segments.slice(0, index).reduce((sum, item) => sum + item.weight, 0) + segments[index].weight / 2) * 3.6;
      setRotation(current => current + 360 * 5 + (360 - center - (current % 360)));
      setWinner({ id: data.id, code: data.code });
    } catch {
      setError(en ? "We could not process your code. Please try again." : "No se pudo procesar el código. Inténtelo nuevamente.");
    } finally { setBusy(false); }
  }
  const prize = winner && segments.find(item => item.id === winner.id);
  const wheelStops = segments.map((segment, index) => {
    const start = segments.slice(0, index).reduce((sum, item) => sum + item.weight, 0) * 3.6;
    const end = start + segment.weight * 3.6;
    return `${index % 2 === 0 ? "var(--color-brand)" : "var(--color-brand-deep)"} ${start}deg ${end}deg`;
  }).join(", ");
  const message = winner && prize ? (en ? `I spun the viatour travel wheel. My code is ${winner.code} and my prize is ${prize.label_en}. Please help me apply it to my trip.` : `Gané en la ruleta de viatour. Mi código es ${winner.code} y mi premio es ${prize.label_es}. Por favor, ayúdeme a aplicarlo a mi viaje.`) : "";
  return <div className="grid items-center gap-8 md:grid-cols-2">
    <div className="mx-auto w-full max-w-80">
      <div className="relative aspect-square">
        <span aria-hidden="true" className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 border-x-8 border-t-0 border-b-16 border-x-transparent border-b-brand" />
        <div aria-hidden="true" className="grid h-full w-full place-items-center rounded-full border-8 border-line transition-transform duration-[5000ms] ease-out motion-reduce:transition-none" style={{ background: `conic-gradient(${wheelStops})`, transform: `rotate(${rotation}deg)` }}><span className="grid h-16 w-16 place-items-center rounded-full border-4 border-line bg-canvas text-brand">viatour</span></div>
      </div>
    </div>
    <div className="space-y-6">
      <form onSubmit={spin} className="space-y-4">
        <label htmlFor="promo-code" className="t-h3 block">{en ? "Enter your advisor-issued code" : "Ingrese el código que le entregó su asesor"}</label>
        <input id="promo-code" value={code} onChange={event => setCode(event.target.value)} maxLength={40} autoComplete="off" required className="min-h-12 w-full rounded-btn border border-line bg-canvas px-4" />
        <button disabled={busy || !code.trim()} className="min-h-12 rounded-btn bg-brand px-6 text-canvas disabled:opacity-60">{busy ? (en ? "Validating…" : "Validando…") : (en ? "Spin the wheel" : "Girar la ruleta")}</button>
      </form>
      {error && <p role="alert" className="t-small text-error">{error}</p>}
      {prize && winner && <div aria-live="polite" className="space-y-4 rounded-card border border-line bg-surface p-6"><h2 className="t-h3">{en ? prize.label_en : prize.label_es}</h2><p className="t-body text-ink-soft">{en ? "Show this result to your advisor on WhatsApp to apply your prize." : "Presente este resultado a su asesor por WhatsApp para aplicar su premio."}</p><a className="inline-flex min-h-12 items-center rounded-btn bg-wa px-6 text-ink" href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">{en ? "Present prize on WhatsApp" : "Presentar premio por WhatsApp"}</a></div>}
    </div>
  </div>;
}
