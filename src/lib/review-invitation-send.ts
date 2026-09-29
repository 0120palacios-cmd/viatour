import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { captureNotificationFailure, sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export type InvitationResult = { ok: true; id: string } | { ok: false; error: string };

// Shared by the admin action (session client, RLS) and the daily job (service role).
export async function inviteToReview(client: SupabaseClient, nombre: string, email: string): Promise<InvitationResult> {
  let invitation: { id: string; token: string } | undefined;
  for (let attempt = 0; attempt < 3 && !invitation; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    const inserted = await client.from("review_invitations").insert({ nombre, email, token, estado: "enviada" }).select("id").single();
    if (!inserted.error && inserted.data) invitation = { id: String(inserted.data.id), token };
    else if (inserted.error?.code !== "23505") return { ok: false, error: "No se pudo registrar la invitación. Revise que la tabla de invitaciones esté disponible." };
  }
  if (!invitation) return { ok: false, error: "No se pudo generar un enlace único. Inténtelo nuevamente." };

  const link = new URL("/opiniones/nueva", siteConfig.url);
  link.searchParams.set("token", invitation.token);
  // Borrador pendiente de aprobación: la línea de Google ayuda a sumar opiniones en el perfil de empresa.
  const google = siteConfig.googleReviewUrl ? `\n\nSi lo desea, también puede dejar su opinión en nuestro perfil de Google:\n${siteConfig.googleReviewUrl}` : "";
  try {
    await sendResendEmail({
      idempotencyKey: `review-invitation/${invitation.id}`,
      from: siteConfig.reviewInvitationFrom,
      to: [email],
      replyTo: siteConfig.supportEmail,
      subject: "Comparta su opinión sobre su viaje | viatour",
      text: `Estimado/a ${nombre}:\n\nNos gustaría conocer su experiencia de viaje. Puede compartir su opinión en el siguiente enlace:\n\n${link.toString()}\n\nSu opinión será revisada antes de publicarse.${google}\n\nSaludos,\nviatour | asesores de viaje`,
    });
  } catch (error) {
    captureNotificationFailure("review_invitation", invitation.id, error);
    return { ok: false, error: "La invitación quedó registrada, pero no se pudo enviar el correo." };
  }
  return { ok: true, id: invitation.id };
}
