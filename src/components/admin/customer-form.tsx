"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCustomer, type CustomerActionState } from "@/app/admin/clientes/actions";

const control = "w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand";

export function CustomerForm({ row = {} }: { row?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState<CustomerActionState, FormData>(saveCustomer, {});
  return <form action={action} className="max-w-3xl space-y-6 rounded-panel border bg-surface p-6 sm:p-8">
    <input type="hidden" name="id" value={String(row.id ?? "")} />
    <p className="t-small text-ink-soft">Registre los datos que su equipo usará para preparar y compartir cotizaciones.</p>
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="block t-small">Nombre *<Input name="nombre" required maxLength={200} defaultValue={String(row.nombre ?? "")} autoComplete="name" /></label>
      <label className="block t-small">Correo electrónico *<Input name="email" required type="email" maxLength={254} defaultValue={String(row.email ?? "")} autoComplete="email" /></label>
      <label className="block t-small">Teléfono<Input name="telefono" maxLength={60} defaultValue={String(row.telefono ?? "")} autoComplete="tel" /></label>
      <label className="block t-small sm:col-span-2">Notas<textarea className={control} name="notas" rows={5} maxLength={5000} defaultValue={String(row.notas ?? "")} /></label>
    </div>
    <div aria-live="polite">{state.error && <p role="alert" className="text-error">{state.error}</p>}{state.success && <p className="text-success">{state.success}</p>}</div>
    <Button type="submit" disabled={pending}>{pending ? "Guardando" : "Guardar cliente"}</Button>
  </form>;
}
