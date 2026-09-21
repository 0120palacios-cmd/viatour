import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export type ReviewInvitation = {
  id: string;
  nombre: string;
  email: string;
  token: string;
  estado: "enviada" | "usada";
  created_at: string;
  used_at: string | null;
};

export type AdminReviewInvitation = Omit<ReviewInvitation, "token">;

const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

export function isReviewInvitationToken(value: string) {
  return tokenPattern.test(value);
}

export async function getValidReviewInvitation(token: string) {
  if (!isReviewInvitationToken(token)) return null;
  const result = await createAdminClient()
    .from("review_invitations")
    .select("id,nombre,email,token,estado,created_at,used_at")
    .eq("token", token)
    .eq("estado", "enviada")
    .is("used_at", null)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return result.data as ReviewInvitation;
}

export async function consumeReviewInvitation(id: string) {
  const result = await createAdminClient()
    .from("review_invitations")
    .update({ estado: "usada", used_at: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "enviada")
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  return !result.error && Boolean(result.data);
}

export async function getAdminReviewInvitations() {
  const { client } = await requireAdmin();
  const result = await client
    .from("review_invitations")
    .select("id,nombre,email,estado,created_at,used_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (result.error) {
    console.error("Review invitations unavailable", { code: result.error.code });
    return { available: false, rows: [] as AdminReviewInvitation[] };
  }
  return { available: true, rows: result.data as AdminReviewInvitation[] };
}
