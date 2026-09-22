"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { captureNotificationFailure, sendResendEmail } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";

export type InvitationActionState = { error?: string; success?: string };

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendReviewInvitation(_: InvitationActionState, form: FormData): Promise<InvitationActionState> {
  const { client } = await requireAdmin();
  const nombre = clean(form.get("nombre"));
  const email = clean(form.get("email")).toLowerCase();
  if (!nombre || nombre.length > 120 || !emailPattern.test(email) || email.length > 254) return { error: "Ingrese un nombre y un correo electrónico válidos." };
  if (!process.env.RESEND_API_KEY) return { error: "El envío de correo no está configurado." };

  let invitation: { id: string; token: string } | undefined;
  for (let attempt = 0; attempt < 3 && !invitation; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    const inserted = await client.from("review_invitations").insert({ nombre, email, token, estado: "enviada" }).select("id").single();
    if (!inserted.error && inserted.data) invitation = { id: String(inserted.data.id), token };
    else if (inserted.error?.code !== "23505") return { error: "No se pudo registrar la invitación. Revise que la tabla de invitaciones esté disponible." };
  }
  if (!invitation) return { error: "No se pudo generar un enlace único. Inténtelo nuevamente." };

  const link = new URL("/opiniones/nueva", siteConfig.url);
  link.searchParams.set("token", invitation.token);
  try {
    await sendResendEmail({
      idempotencyKey: `review-invitation/${invitation.id}`,
      from: siteConfig.reviewInvitationFrom,
      to: [email],
      replyTo: siteConfig.supportEmail,
      subject: "Comparta su opinión sobre su viaje | viatour",
      text: `Estimado/a ${nombre}:\n\nNos gustaría conocer su experiencia de viaje. Puede compartir su opinión en el siguiente enlace:\n\n${link.toString()}\n\nSu opinión será revisada antes de publicarse.\n\nSaludos,\nviatour | asesores de viaje`,
    });
  } catch (error) {
    captureNotificationFailure("review_invitation", invitation.id, error);
    return { error: "La invitación quedó registrada, pero no se pudo enviar el correo." };
  }
  revalidatePath("/admin/opiniones");
  return { success: "Invitación enviada." };
}
