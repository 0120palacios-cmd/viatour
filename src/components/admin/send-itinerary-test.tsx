"use client";

import { useActionState } from "react";
import { sendItineraryTest } from "@/app/admin/reservas/send-itinerary-test";
import { Button } from "@/components/ui/button";

// Recipients come from the server (TRAVEL_TEST_RECIPIENTS): the form offers only approved internal addresses.
export function SendItineraryTest({ id, recipients }: { id: string; recipients: string[] }) {
  const [state, action, pending] = useActionState(sendItineraryTest, {});
  return <form action={action} className="mt-6 space-y-4 rounded-card border border-line p-4">
    <input name="id" type="hidden" value={id} />
    <div>
      <p className="font-semibold">Prueba interna del itinerario</p>
      <p className="t-small text-ink-soft">El mismo correo, PDF y calendario que recibiría el cliente, enviado solo a un correo interno aprobado. El cliente no recibe nada y no queda registrado como envío.</p>
    </div>
    {recipients.length ? <>
      <label className="t-small block">Correo de prueba
        <select required name="testRecipient" defaultValue={recipients[0]} className="mt-1 min-h-11 w-full rounded-btn border border-line bg-canvas p-3">{recipients.map(email => <option key={email} value={email}>{email}</option>)}</select>
      </label>
      <Button disabled={pending}>{pending ? "Enviando prueba" : "Enviar prueba interna"}</Button>
    </> : <p className="t-small text-ink-soft">Deshabilitado: falta configurar TRAVEL_TEST_RECIPIENTS con los correos internos aprobados por el propietario.</p>}
    {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : null}
    {state.success ? <p role="status" className="t-small text-success">{state.success}</p> : null}
  </form>;
}
