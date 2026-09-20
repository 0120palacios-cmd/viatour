"use client";
import { Turnstile } from "@/components/turnstile";
import { trackEvent } from "@/lib/analytics";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { captureLead, composeQuote } from "@/lib/quote";
import { validateContact } from "@/lib/contact-validation";
import { siteConfig } from "@/lib/site-config";
// Copy funcional en borrador pendiente de aprobación.
export function ContactForm() {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challenge, setChallenge] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const [href, setHref] = useState("");
    async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (busy)
        return; const form = e.currentTarget; const { values, errors } = validateContact(Object.fromEntries(new FormData(form))); setErrors(errors); if (Object.keys(errors).length) {
        form.querySelector<HTMLElement>('[name="' + Object.keys(errors)[0] + '"]')?.focus();
        return;
    } setBusy(true); setStatus(""); const payload = { turnstileToken, service: "Contacto", servicio: "contacto", fields: { Nombre: values.nombre, Email: values.email, Teléfono: values.telefono, Notas: values.mensaje }, formData: values }; try {
        await captureLead(payload);
        trackEvent("contact_submit", { service: "contacto", status: "saved" });
        setHref('https://wa.me/' + siteConfig.whatsappNumber + '?text=' + encodeURIComponent(composeQuote(payload)));
        setStatus("Su mensaje se ha guardado. Puede continuar por WhatsApp.");
    }
    catch {
        setStatus("No se pudo guardar su mensaje. Inténtelo nuevamente.");
    }
    finally {
        setBusy(false); setChallenge(n => n + 1);
    } }
    if (href)
        return <div className="space-y-6 rounded-panel border bg-surface p-6"><p role="status">{status}</p><Button asChild variant="whatsapp"><a href={href} onClick={() => trackEvent("whatsapp_click", { service: "contacto" })}>Escríbanos por WhatsApp</a></Button></div>;
    return <form onSubmit={submit} noValidate className="space-y-6" aria-busy={busy}><p className="t-small text-ink-soft">Los campos con * son obligatorios.</p><fieldset disabled={busy} className="space-y-6"><div hidden aria-hidden="true"><label htmlFor="contact-website">Sitio web</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off"/></div>{([['nombre', 'Nombre', 'text', 120], ['email', 'Correo electrónico', 'email', 254], ['telefono', 'Teléfono (opcional)', 'tel', 40], ['mensaje', 'Mensaje', 'textarea', 3000]] as const).map(([name, label, type, max]) => <div key={name} className="space-y-2"><label className="t-small block" htmlFor={'contact-' + name}>{label}{name !== "telefono" ? " *" : ""}</label>{type === "textarea" ? <textarea id={'contact-' + name} name={name} required rows={6} maxLength={max} className="t-body w-full resize-y rounded-btn border border-line bg-canvas px-3 py-2 focus-visible:border-brand aria-invalid:border-error" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? 'contact-' + name + '-error' : undefined}/> : <Input id={'contact-' + name} name={name} type={type} required={name !== "telefono"} maxLength={max} autoComplete={name === "nombre" ? "name" : name === "telefono" ? "tel" : "email"} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? 'contact-' + name + '-error' : undefined}/>} {errors[name] && <p id={'contact-' + name + '-error'} className="t-small text-error">{errors[name]}</p>}</div>)}<Turnstile onToken={setTurnstileToken} resetKey={challenge} /><Button type="submit" disabled={busy || !turnstileToken}>{busy ? "Guardando…" : "Enviar mensaje"}</Button></fieldset><p role="alert" className="text-error">{status}</p></form>;
}
