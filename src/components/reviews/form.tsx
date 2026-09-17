"use client";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateReview, REVIEW_PHOTO_LIMIT } from "@/lib/review-validation";

// Etiquetas y mensajes funcionales no especificados: borrador pendiente de aprobación.
export function ReviewForm({ destinations }: { destinations: string[] }) {
  const [rating, setRating] = useState(0);
  const [destination, setDestination] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const error = (name: string) => errors[name] ? <p id={`${name}-error`} className="t-small text-error">{errors[name]}</p> : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("destino", destination === "__other" ? String(body.get("otro_destino") || "") : destination);
    const validation = validateReview(Object.fromEntries(body));
    const photo = body.get("foto");
    if (photo instanceof File && photo.size > REVIEW_PHOTO_LIMIT) validation.errors.foto = "La foto debe pesar como máximo 3 MB.";
    setErrors(validation.errors);
    if (Object.keys(validation.errors).length) { setStatus("Revise los campos indicados."); form.querySelector<HTMLElement>(`[name="${Object.keys(validation.errors)[0]}"]`)?.focus(); return; }
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) { setErrors(result.errors || {}); setStatus(result.error || "No se pudo enviar su opinión. Inténtelo de nuevo."); return; }
      setSuccess(true);
    } catch { setStatus("No se pudo enviar su opinión. Inténtelo de nuevo."); }
    finally { setBusy(false); }
  }
  if (success) return <p role="status" className="t-body rounded-panel border border-line bg-surface p-8">Gracias. Su opinión será revisada antes de publicarse.</p>;
  return <form onSubmit={submit} noValidate className="space-y-6" aria-busy={busy}>
    <p className="t-small text-ink-soft">Los campos con * son obligatorios. Su opinión será revisada antes de publicarse.</p>
    <fieldset disabled={busy} className="space-y-6">
      <div className="hidden" aria-hidden="true"><label htmlFor="website">Sitio web</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {([{ name: "nombre", label: "Nombre", max: 120, type: "text" }, { name: "email", label: "Correo electrónico", max: 254, type: "email" }] as const).map(field => <div key={field.name} className="space-y-2"><label className="t-small block" htmlFor={field.name}>{field.label} *</label><Input id={field.name} name={field.name} type={field.type} maxLength={field.max} required autoComplete={field.name === "nombre" ? "name" : "email"} aria-invalid={!!errors[field.name]} aria-describedby={`${errors[field.name] ? `${field.name}-error` : ""}${field.name === "email" ? " email-note" : ""}`} />{field.name === "email" && <p id="email-note" className="t-small text-ink-soft">No publicamos su correo.</p>}{error(field.name)}</div>)}
      <fieldset aria-describedby={errors.calificacion ? "calificacion-error" : undefined}><legend className="t-small mb-2">Calificación *</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(n => <label key={n} className="relative flex cursor-pointer items-center justify-center gap-1 rounded-btn border border-line p-3 has-checked:border-brand has-focus-visible:border-brand has-focus-visible:outline-2 has-focus-visible:outline-brand"><input className="peer sr-only" type="radio" name="calificacion" value={n} checked={rating === n} onChange={() => setRating(n)} required aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} /><span className="t-small text-ink" aria-hidden="true">{n}</span><Star size={24} aria-hidden="true" className={n <= rating ? "fill-amber text-amber" : "fill-line text-line"} /></label>)}</div>{error("calificacion")}</fieldset>
      <div className="space-y-2"><label htmlFor="texto" className="t-small block">Su opinión *</label><textarea id="texto" name="texto" required maxLength={3000} rows={6} className="t-body w-full rounded-btn border border-line p-3 focus-visible:border-brand aria-invalid:border-error" aria-invalid={!!errors.texto} aria-describedby={errors.texto ? "texto-error" : undefined} />{error("texto")}</div>
      <div className="space-y-2"><label htmlFor="destino" className="t-small block">Destino (opcional)</label><select id="destino" name="destino" value={destination} onChange={e => setDestination(e.target.value)} className="t-body h-12 w-full rounded-btn border border-line bg-canvas px-3"><option value="">Seleccione un destino</option>{destinations.map(name => <option key={name}>{name}</option>)}<option value="__other">Otro destino</option></select>{destination === "__other" && <><label htmlFor="otro_destino" className="t-small block">Escriba el destino</label><Input id="otro_destino" name="otro_destino" maxLength={160} aria-invalid={!!errors.destino} aria-describedby={errors.destino ? "destino-error" : undefined} /></>}{error("destino")}</div>
      <div className="space-y-2"><label htmlFor="numero_reserva" className="t-small block">Número de reserva (opcional)</label><Input id="numero_reserva" name="numero_reserva" maxLength={80} aria-invalid={!!errors.numero_reserva} aria-describedby={errors.numero_reserva ? "numero_reserva-error" : undefined} />{error("numero_reserva")}</div>
      <div className="space-y-2"><label htmlFor="foto" className="t-small block">Foto (opcional)</label><Input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!errors.foto} aria-describedby={`foto-note${errors.foto ? " foto-error" : ""}`} /><p id="foto-note" className="t-small text-ink-soft">JPG, PNG o WebP. Máximo 3 MB. La foto se almacenará en un enlace público; no incluya información privada.</p>{error("foto")}</div>
      <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar opinión"}</Button>
    </fieldset><p role="alert" className="t-body text-error">{status}</p>
  </form>;
}
