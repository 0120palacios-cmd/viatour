import { requireAdmin } from "@/lib/admin";
import { toRecord } from "@/lib/quotation-data";
import { renderQuotationPdf } from "@/lib/quotation-pdf";
import { loadQuotationPhotos } from "@/lib/quotation-media";
import { maxPayloadBytes, parseQuotationPayload } from "@/lib/quotation-payload";
import { totalAmount } from "@/lib/money";
import type { Quotation } from "@/lib/quotation-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live preview of the unsaved editor state. Nothing is written: the PDF is rendered from the posted
// draft with the same renderer and photos the customer's copy will use.
export async function POST(request: Request) {
  const { client, user } = await requireAdmin();
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxPayloadBytes + 1024) return new Response("La vista previa es demasiado grande.", { status: 413 });
  const body = await request.text();
  if (body.length > maxPayloadBytes) return new Response("La vista previa es demasiado grande.", { status: 413 });
  const parsed = parseQuotationPayload(body);
  if ("error" in parsed) return new Response(parsed.error, { status: 400 });
  const { payload } = parsed;
  let codigo = "COT-BORRADOR";
  let createdAt = new Date().toISOString();
  if (payload.id) {
    const existing = await client.from("quotations").select("codigo,created_at").eq("id", payload.id).maybeSingle();
    if (existing.data) { codigo = String(existing.data.codigo); createdAt = String(existing.data.created_at); }
  }
  const quotation: Quotation = {
    id: payload.id ?? "00000000-0000-4000-8000-000000000000", codigo, customer_id: payload.customerId, cliente_nombre: payload.cliente.nombre,
    cliente_email: payload.cliente.email, cliente_telefono: payload.cliente.telefono, destino: payload.destino || "Por definir", moneda: payload.moneda,
    validez: "", notas: payload.notas, total: totalAmount(payload.items), estado: "borrador", agente_id: user.id, created_at: createdAt,
    tipo: payload.tipo, detalles: payload.detalles, vence_en: payload.detalles.validez.venceEn || null,
  };
  const record = toRecord(quotation, payload.items, true);
  const photos = await loadQuotationPhotos(client, record.details);
  const pdf = await renderQuotationPdf(record, { photos, preview: true });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=\"vista-previa.pdf\"", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
