"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export type TicketActionState = { error?: string; success?: string };

export async function respondToTicket(_: TicketActionState, form: FormData): Promise<TicketActionState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "").trim();
  const respuesta = String(form.get("respuesta") ?? "").trim();
  const estado = String(form.get("estado") ?? "abierto");
  if (!/^[0-9a-f-]{36}$/i.test(id) || respuesta.length > 4000 || !["abierto", "en_revision", "resuelto", "cerrado"].includes(estado)) return { error: "Revise la respuesta y el estado." };
  const result = await client.from("support_tickets").update({ respuesta: respuesta || null, estado, responded_at: respuesta ? new Date().toISOString() : null }).eq("id", id).select("id,reservation_id").single();
  if (result.error || !result.data) return { error: "No se pudo actualizar la solicitud." };
  if (respuesta) {
    const reservation = await client.from("reservations").select("codigo,cliente_email").eq("id", result.data.reservation_id).maybeSingle();
    if (reservation.data?.cliente_email) {
      try { await sendResendEmail({ idempotencyKey: `support-ticket-response/${id}`, from: siteConfig.supportEmail, to: [reservation.data.cliente_email], replyTo: siteConfig.supportEmail, subject: `Actualización de su solicitud | ${reservation.data.codigo}`, text: `Estimado cliente:\n\nSu asesor actualizó una solicitud de soporte. Puede consultar el detalle en Mi reserva.\n\n${respuesta}\n\nSaludos,\nviatour | asesores de viaje` }); } catch { /* Saved response remains available in the portal. */ }
    }
  }
  revalidatePath("/admin/tickets");
  revalidatePath("/mi-reserva");
  return { success: "Solicitud actualizada." };
}
