import { createClient } from "@/lib/supabase/server";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Copy funcional pendiente de aprobación final.
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Revise los datos de su solicitud." }, { status: 400 });
  }
  if (!record(payload) || !text(payload.servicio)) {
    return Response.json({ ok: false, error: "Indique el servicio de su solicitud." }, { status: 400 });
  }

  const fields = record(payload.fields) ? payload.fields : {};
  const form = record(payload.formData) ? payload.formData : {};
  const field = (column: string, label: string) => text(payload[column]) ?? text(fields[label]);
  const budget = payload.presupuesto ?? form.budget ?? fields["Presupuesto aproximado"];
  const budgetText = typeof budget === "number" ? String(budget) : text(budget)?.replace(/\s+(USD|HNL)$/, "");
  const presupuesto = budgetText && /^\d+(\.\d+)?$/.test(budgetText) && Number.isFinite(Number(budgetText)) ? Number(budgetText) : null;
  const currency = payload.moneda ?? payload.currency;
  const id = crypto.randomUUID();

  try {
    const supabase = await createClient();
    // INSERT only: returning a locally generated UUID avoids requiring SELECT under RLS.
    const { error } = await supabase.from("leads").insert({
      id,
      servicio: text(payload.servicio),
      nombre: field("nombre", "Nombre"),
      origen: field("origen", "Origen"),
      destino: field("destino", "Destino"),
      fechas: field("fechas", "Fechas"),
      pasajeros: field("pasajeros", "Pasajeros") ?? text(fields["Huéspedes"]),
      clase: field("clase", "Clase"),
      presupuesto,
      moneda: currency === "HNL" ? "HNL" : "USD",
      notas: field("notas", "Notas"),
      payload,
      user_agent: request.headers.get("user-agent"),
    }).abortSignal(AbortSignal.timeout(2000));
    if (error) {
      console.error("Lead insert failed", { id, code: error.code });
      return Response.json({ ok: false, error: "No se pudo guardar su solicitud." }, { status: 502 });
    }
    // TODO: notificar soporte por email (Resend) en una etapa futura
    return Response.json({ ok: true, id }, { status: 201 });
  } catch {
    console.error("Lead insert unavailable", { id });
    return Response.json({ ok: false, error: "No se pudo guardar su solicitud." }, { status: 503 });
  }
}
