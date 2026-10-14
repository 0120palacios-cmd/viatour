"use client";

import { useId, type ReactNode } from "react";
import { cn } from "cn";

// Compact form primitives for the quotation editor. They follow the site tokens (radius 10, line
// borders, brand focus) but are denser than the public forms: advisors fill dozens of fields per quote.

export const inputClass = "h-11 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 text-ink transition-colors focus-visible:border-brand aria-invalid:border-error disabled:opacity-60";
export const textareaClass = "w-full min-w-0 rounded-btn border border-line bg-canvas p-3 text-ink transition-colors focus-visible:border-brand aria-invalid:border-error";

type FieldProps = { label: string; hint?: string; review?: boolean; className?: string; children: (id: string, describedBy?: string) => ReactNode };

export function Field({ label, hint, review, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint || review ? `${id}-hint` : undefined;
  return <div className={cn("min-w-0", className)}>
    <label htmlFor={id} className="mb-1 block t-small font-semibold text-ink">{label}{review ? <span className="ml-2 rounded-btn bg-brand-tint px-2 py-0.5 text-[12px] font-semibold text-brand-deep">Confirmar</span> : null}</label>
    {children(id, hintId)}
    {hint || review ? <p id={hintId} className="mt-1 text-[13px] leading-snug text-ink-soft">{review ? "El texto pegado no permitió confirmar este dato. " : ""}{hint}</p> : null}
  </div>;
}

export function TextField({ label, value, onChange, hint, review, className, ...rest }: { label: string; value: string; onChange: (value: string) => void; hint?: string; review?: boolean; className?: string } & Omit<React.ComponentProps<"input">, "value" | "onChange" | "className">) {
  return <Field label={label} hint={hint} review={review} className={className}>{(id, describedBy) => <input id={id} aria-describedby={describedBy} className={cn(inputClass, review && "border-brand bg-brand-tint/40")} value={value} onChange={event => onChange(event.target.value)} {...rest} />}</Field>;
}

export function AreaField({ label, value, onChange, hint, rows = 3, className, maxLength }: { label: string; value: string; onChange: (value: string) => void; hint?: string; rows?: number; className?: string; maxLength?: number }) {
  return <Field label={label} hint={hint} className={className}>{(id, describedBy) => <textarea id={id} aria-describedby={describedBy} className={textareaClass} rows={rows} maxLength={maxLength} value={value} onChange={event => onChange(event.target.value)} />}</Field>;
}

export function SelectField<T extends string>({ label, value, onChange, options, hint, className, placeholder }: { label: string; value: T; onChange: (value: T) => void; options: readonly (readonly [T, string])[]; hint?: string; className?: string; placeholder?: string }) {
  return <Field label={label} hint={hint} className={className}>{(id, describedBy) => <select id={id} aria-describedby={describedBy} className={inputClass} value={value} onChange={event => onChange(event.target.value as T)}>{placeholder !== undefined ? <option value="">{placeholder}</option> : null}{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select>}</Field>;
}

// A row of toggle buttons for short exclusive choices (baggage included / not included / with charge).
export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: readonly (readonly [T, string])[] }) {
  return <fieldset className="min-w-0">
    <legend className="mb-1 t-small font-semibold text-ink">{label}</legend>
    <div className="flex flex-wrap gap-2">{options.map(([option, text]) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(value === option ? "" as T : option)} className={cn("min-h-10 rounded-btn border px-3 text-[14px] transition-colors", value === option ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line bg-canvas text-ink hover:bg-surface")}>{text}</button>)}</div>
  </fieldset>;
}

export function Section({ id, title, description, actions, children }: { id: string; title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 rounded-panel border border-line bg-surface p-4 sm:p-6">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 id={`${id}-title`} className="t-h3">{title}</h2>{description ? <p className="mt-1 t-small text-ink-soft">{description}</p> : null}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    {children}
  </section>;
}

export function SmallButton({ children, className, tone = "default", ...rest }: React.ComponentProps<"button"> & { tone?: "default" | "danger" | "primary" }) {
  return <button type="button" className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-btn border px-3 text-[14px] transition-colors disabled:pointer-events-none disabled:opacity-50", tone === "danger" ? "border-line text-error hover:bg-surface" : tone === "primary" ? "border-brand bg-brand text-white hover:bg-brand-deep" : "border-line bg-canvas text-ink hover:bg-surface", className)} {...rest}>{children}</button>;
}

export function IconButton({ label, children, className, ...rest }: React.ComponentProps<"button"> & { label: string }) {
  return <button type="button" aria-label={label} title={label} className={cn("inline-flex size-10 items-center justify-center rounded-btn border border-line bg-canvas text-ink-soft transition-colors hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40", className)} {...rest}>{children}</button>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return <div role={tone === "error" ? "alert" : undefined} className={cn("rounded-card border p-3 t-small", tone === "error" ? "border-error/40 bg-canvas text-error" : tone === "success" ? "border-success/40 bg-canvas text-success" : "border-line bg-brand-tint text-ink")}>{children}</div>;
}
