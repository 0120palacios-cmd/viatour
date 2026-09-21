"use client";

import { useActionState } from "react";
import { sendReviewInvitation, type InvitationActionState } from "@/app/admin/opiniones/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: InvitationActionState = {};

export function InvitationForm() {
  const [state, action, pending] = useActionState(sendReviewInvitation, initialState);
  return <form action={action} className="grid gap-4 rounded-panel border border-line bg-surface p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <label className="t-small">Nombre<Input name="nombre" required maxLength={120} autoComplete="name" /></label>
    <label className="t-small">Correo electrónico<Input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
    <Button disabled={pending}>{pending ? "Enviando…" : "Enviar invitación"}</Button>
    <div className="sm:col-span-3" aria-live="polite">{state.error && <p role="alert" className="t-small text-error">{state.error}</p>}{state.success && <p className="t-small text-ink">{state.success}</p>}</div>
  </form>;
}
