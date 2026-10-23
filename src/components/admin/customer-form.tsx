"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCustomer, type CustomerActionState } from "@/app/admin/clientes/actions";

const control = "w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand";

export function CustomerForm({ row = {}, compact = false }: { row?: Record<string, unknown>; compact?: boolean }) {
  const [state, action, pending] = useActionState<CustomerActionState, FormData>(saveCustomer, {});
  return <form action={action} className={compact ? "space-y-6" : "max-w-3xl space-y-6 rounded-card border border-line bg-canvas p-6 sm:p-8"}>
    <input type="hidden" name="id" value={String(row.id ?? "")} />
    {compact ? null : <p className="t-small text-ink-soft">Nombre obligatorio y al menos un teléfono o un correo. No se repiten correos ni teléfonos. Sin correo, el cliente no podrá entrar a Mi viaje.</p>}
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="block t-small">Nombre *<Input name="nombre" required maxLength={200} defaultValue={String(row.nombre ?? "")} autoComplete="off" /></label>
      <label className="block t-small">Teléfono o WhatsApp<Input name="telefono" type="tel" maxLength={60} defaultValue={String(row.telefono ?? "")} autoComplete="off" placeholder="+504 0000-0000" /></label>
      <label className="block t-small">Correo electrónico<Input name="email" type="email" maxLength={254} defaultValue={String(row.email ?? "")} autoComplete="off" /></label>
      <label className="block t-small sm:col-span-2">Notas internas<textarea className={control} name="notas" rows={compact ? 3 : 5} maxLength={5000} defaultValue={String(row.notas ?? "")} placeholder="Preferencias, documentos, fechas importantes" /></label>
    </div>
    <div aria-live="polite">
      {state.error ? <p role="alert" className="text-error">{state.error}{state.duplicateId ? <> <Link className="font-semibold underline underline-offset-4" href={`/admin/clientes/${state.duplicateId}`}>Abrir la ficha de {state.duplicateName}</Link></> : null}</p> : null}
      {state.success ? <p className="text-success">{state.success}</p> : null}
    </div>
    <Button type="submit" disabled={pending}>{pending ? "Guardando…" : row.id ? "Guardar cambios" : "Crear cliente"}</Button>
  </form>;
}
