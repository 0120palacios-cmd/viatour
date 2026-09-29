"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateLeadStatus, type LeadActionState } from "@/app/admin/(protected)/leads/actions";
import { leadStateLabels, leadStates, lossReasons, type LeadState } from "@/lib/lead-admin";

const control = "h-12 w-full rounded-btn border border-line bg-canvas px-3 text-ink focus-visible:border-brand";

export function LeadStatusForm({ id, estado, motivo }: { id: string; estado: string; motivo?: string }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(updateLeadStatus, {});
  const [selected, setSelected] = useState(estado);
  return <form action={action} className="flex flex-wrap items-end gap-3">
    <input type="hidden" name="id" value={id} />
    <label className="t-small min-w-40 flex-1 space-y-2 sm:flex-none">Estado<select name="estado" className={control} value={selected} onChange={event => setSelected(event.target.value)}>{leadStates.map(value => <option key={value} value={value}>{leadStateLabels[value as LeadState]}</option>)}</select></label>
    {selected === "perdido" && <label className="t-small min-w-48 flex-1 space-y-2 sm:flex-none">Motivo<select name="motivo_perdida" required className={control} defaultValue={motivo || ""}><option value="">Seleccione</option>{lossReasons.map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
    <Button type="submit" variant="ghost" disabled={pending}>{pending ? "Guardando…" : "Guardar estado"}</Button>
    <p aria-live="polite" className="t-small w-full">{state.error && <span role="alert" className="text-error">{state.error}</span>}{state.success && <span className="text-success">{state.success}</span>}</p>
  </form>;
}
