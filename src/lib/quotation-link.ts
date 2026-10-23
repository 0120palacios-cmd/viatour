import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toRecord, type QuotationRecord } from "@/lib/quotation-data";
import { hashShareToken, validShareToken } from "@/lib/quotation-share";

// What a customer link (/cotizacion/<token>) opens: exactly the frozen version that was shared, found by the
// token's hash. Cancelled, deactivated or expired links show nothing of the quotation.
export type SharedQuotation =
  | { state: "ok"; record: QuotationRecord; versionNumber: number; replaced: boolean; expiresAt: string }
  | { state: "expired" | "unavailable" };

const openStates = ["preparado", "confirmado", "enviado", "entregado", "leido"];

export async function openSharedQuotation(token: string, { countOpening = false } = {}): Promise<SharedQuotation> {
  if (!validShareToken(token)) return { state: "unavailable" };
  const client = createAdminClient();
  const share = await client.from("quotation_shares").select("id,quotation_id,version_id,estado,expira_en,aperturas").eq("token_hash", hashShareToken(token)).maybeSingle();
  if (share.error || !share.data || !openStates.includes(share.data.estado)) return { state: "unavailable" };
  if (Date.parse(share.data.expira_en) < Date.now()) return { state: "expired" };
  const [version, current] = await Promise.all([
    client.from("quotation_versions").select("version,snapshot").eq("id", share.data.version_id).eq("quotation_id", share.data.quotation_id).maybeSingle(),
    client.from("quotations").select("estado").eq("id", share.data.quotation_id).maybeSingle(),
  ]);
  const snapshot = version.data?.snapshot as { quotation?: QuotationRecord["quotation"]; items?: QuotationRecord["items"] } | undefined;
  if (!snapshot?.quotation || !Array.isArray(snapshot.items)) return { state: "unavailable" };
  // An opening counts the page view only (not the PDF download), and a failure never blocks the customer.
  if (countOpening) await client.from("quotation_shares").update({ aperturas: Number(share.data.aperturas ?? 0) + 1, abierto_en: new Date().toISOString() }).eq("id", share.data.id).then(() => undefined, () => undefined);
  return { state: "ok", record: toRecord(snapshot.quotation, snapshot.items, true), versionNumber: Number(version.data?.version), replaced: current.data?.estado === "reemplazada", expiresAt: share.data.expira_en };
}
