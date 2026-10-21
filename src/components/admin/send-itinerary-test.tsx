"use client";

import { useActionState } from "react";
import { sendItineraryTest } from "@/app/admin/reservas/send-itinerary-test";
import { Button } from "@/components/ui/button";

export function SendItineraryTest({ id }: { id: string }) {
  const [state, action, pending] = useActionState(sendItineraryTest, {});

  return (
    <form action={action} className="mt-6 space-y-4 rounded-card border border-line p-4">
      <input name="id" type="hidden" value={id} />

      <div>
        <p className="font-semibold">Prueba interna del itinerario</p>
        <p className="t-small text-ink-soft">
          Se enviará únicamente al correo que indiques aquí.
          El cliente no recibirá nada.
        </p>
      </div>

      <label className="block t-small">
        Correo de prueba
        <input
          required
          name="testRecipient"
          defaultValue="0120palacios@gmail.com"
          type="email"
          className="mt-1 min-h-11 w-full rounded-btn border border-line p-3"
          placeholder="tu-correo@ejemplo.com"
        />
      </label>

      <Button disabled={pending}>
        {pending ? "Enviando prueba..." : "Enviar prueba a mi correo"}
      </Button>

      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
    </form>
  );
}

