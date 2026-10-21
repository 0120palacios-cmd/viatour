"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { missingTable, validateMessage } from "@/lib/reservation-messages";
import { captureNotificationFailure, sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export type MessageActionState = { error?: string; success?: string };

// The agency's reply to a reservation conversation, written with the admin's own session (RLS requires
// is_admin() and admin_id = auth.uid()). Replying also marks the customer's messages as read.
export async function replyToReservation(_: MessageActionState, form: FormData): Promise<MessageActionState> {
  const { client, user } = await requireAdmin();
  const reservationId = String(form.get("reservation_id") ?? "");
  const message = validateMessage({ body: form.get("body"), topic: null });
  if (!validUuid(reservationId) || !message) return { error: "Revise la respuesta (hasta 2000 caracteres)." };
  const inserted = await client.from("reservation_messages").insert({ reservation_id: reservationId, sender: "agencia", body: message.body, admin_id: user.id }).select("id").single();
  if (missingTable(inserted.error)) return { error: "Falta aplicar docs/sql/reservation_messages.sql." };
  if (inserted.error || !inserted.data) return { error: "No se pudo guardar la respuesta." };
  await client.from("reservation_messages").update({ agency_read_at: new Date().toISOString() }).eq("reservation_id", reservationId).eq("sender", "cliente").is("agency_read_at", null);

  // Customer notice: off unless the owner enables PORTAL_MESSAGE_EMAILS. It never contains the message
  // text, only a pointer to Mi viaje, where reading requires the OTP session.
  if (process.env.PORTAL_MESSAGE_EMAILS === "true") {
    const reservation = await client.from("reservations").select("codigo,cliente_email").eq("id", reservationId).maybeSingle();
    const recipient = reservation.data?.cliente_email;
    if (typeof recipient === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      try {
        await sendResendEmail({ idempotencyKey: `reservation-reply/${inserted.data.id}`, from: siteConfig.supportEmail, to: [recipient], replyTo: siteConfig.supportEmail, subject: `Tiene un mensaje nuevo sobre su reserva ${reservation.data?.codigo}`, text: `Hola:\n\nSu asesor de viatour respondió a su mensaje sobre la reserva ${reservation.data?.codigo}. Puede leerlo en Mi viaje:\nhttps://www.miviatour.com/mi-reserva?ref=${encodeURIComponent(String(reservation.data?.codigo ?? ""))}\n\nSaludos,\nviatour | asesores de viaje` });
      } catch (error) {
        captureNotificationFailure("reservation_reply", String(inserted.data.id), error);
      }
    }
  }
  revalidatePath(`/admin/reservas/${reservationId}`);
  return { success: process.env.PORTAL_MESSAGE_EMAILS === "true" ? "Respuesta publicada. Se avisó al cliente por correo." : "Respuesta publicada en Mi viaje. El aviso por correo al cliente está desactivado." };
}

export async function markConversationRead(form: FormData) {
  const { client } = await requireAdmin();
  const reservationId = String(form.get("reservation_id") ?? "");
  if (!validUuid(reservationId)) return;
  await client.from("reservation_messages").update({ agency_read_at: new Date().toISOString() }).eq("reservation_id", reservationId).eq("sender", "cliente").is("agency_read_at", null);
  revalidatePath(`/admin/reservas/${reservationId}`);
}
