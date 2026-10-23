"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { requestStatuses, type RequestStatus } from "@/lib/trip-requests";

export type RequestActionState = { error?: string; success?: string };

// Moves a Mi viaje service request through its states and keeps a short staff note. Written with the
// admin's own session: RLS requires is_admin() and handled_by = the admin, and only these columns are
// updatable (what the customer asked for never changes).
export async function updateServiceRequest(_: RequestActionState, form: FormData): Promise<RequestActionState> {
  const { client, user } = await requireAdmin();
  const id = String(form.get("id") ?? ""), reservationId = String(form.get("reservation_id") ?? "");
  const status = String(form.get("status") ?? "") as RequestStatus;
  const note = String(form.get("staff_note") ?? "").replace(/\r\n/g, "\n").trim();
  if (!validUuid(id) || !validUuid(reservationId) || !(requestStatuses as readonly string[]).includes(status) || note.length > 600) return { error: "Revise el estado y la nota (hasta 600 caracteres)." };
  const updated = await client.from("trip_service_requests").update({ status, staff_note: note || null, handled_by: user.id, updated_at: new Date().toISOString() }).eq("id", id).eq("reservation_id", reservationId).select("id").maybeSingle();
  if (updated.error || !updated.data) return { error: "No se pudo actualizar la solicitud." };
  revalidatePath(`/admin/reservas/${reservationId}`);
  return { success: "Solicitud actualizada. El cliente ve el nuevo estado en Mi viaje." };
}
