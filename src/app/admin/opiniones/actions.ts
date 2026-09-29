"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { inviteToReview } from "@/lib/review-invitation-send";

export type InvitationActionState = { error?: string; success?: string };

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendReviewInvitation(_: InvitationActionState, form: FormData): Promise<InvitationActionState> {
  const { client } = await requireAdmin();
  const nombre = clean(form.get("nombre"));
  const email = clean(form.get("email")).toLowerCase();
  if (!nombre || nombre.length > 120 || !emailPattern.test(email) || email.length > 254) return { error: "Ingrese un nombre y un correo electrónico válidos." };
  if (!process.env.RESEND_API_KEY) return { error: "El envío de correo no está configurado." };
  const result = await inviteToReview(client, nombre, email);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/opiniones");
  return { success: "Invitación enviada." };
}
