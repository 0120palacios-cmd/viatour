"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { clean, validUuid } from "@/lib/quotation-validation";
import { commercialError } from "@/lib/commercial-errors";
import { paymentMethods } from "@/lib/reservation-types";

export type FinanceState = { error?: string; success?: string };
const amountPattern = /^\d{1,9}(\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const ledgerMissing = "Falta la actualización de la base de datos para devoluciones y cancelaciones (docs/sql/finance_ledger.sql).";
const missing = (error: { code?: string } | null) => ["PGRST202", "42883"].includes(error?.code ?? "");

function refresh(id: string) {
  revalidatePath(`/admin/reservas/${id}`);
  revalidatePath("/admin/reservas");
  revalidatePath("/admin", "layout");
}

// Money returned to the customer ("reembolso") or a payment recorded by mistake ("reverso"). Both are new
// movements: nothing is edited or deleted, and the balance everywhere (including Mi viaje) nets them out.
export async function recordRefund(_: FinanceState, form: FormData): Promise<FinanceState> {
  const { client } = await requireAdmin();
  const reservationId = clean(form.get("reservation_id")), requestId = clean(form.get("request_id"));
  const kind = clean(form.get("tipo")), reason = clean(form.get("motivo")).replace(/\s+/g, " ");
  if (!validUuid(reservationId) || !validUuid(requestId) || !["reembolso", "reverso"].includes(kind)) return { error: "Recargue el formulario e intente nuevamente." };
  if (reason.length < 3 || reason.length > 500) return { error: "Indique el motivo en pocas palabras." };
  let amount: number | null = null, method: string | null = null, date: string | null = null, reverses: string | null = null;
  if (kind === "reverso") {
    reverses = clean(form.get("revierte_a"));
    if (!validUuid(reverses)) return { error: "Elija el pago que se registró por error." };
  } else {
    const monto = clean(form.get("monto")); method = clean(form.get("metodo")); date = clean(form.get("fecha"));
    if (!amountPattern.test(monto) || Number(monto) <= 0) return { error: "Revise el monto devuelto." };
    if (!paymentMethods.includes(method as never)) return { error: "Elija cómo se devolvió el dinero." };
    if (!datePattern.test(date)) return { error: "Registre la fecha de la devolución." };
    amount = Number(monto);
  }
  const result = await client.rpc("record_reservation_refund", { p_request: requestId, p_reservation: reservationId, p_kind: kind, p_amount: amount, p_method: method, p_date: date, p_reference: clean(form.get("referencia")) || null, p_reason: reason, p_reverses: reverses });
  if (result.error) return { error: missing(result.error) ? ledgerMissing : commercialError(result.error) };
  refresh(reservationId);
  return { success: kind === "reverso" ? "Pago revertido. El saldo ya no lo cuenta." : "Devolución registrada. El saldo se actualizó." };
}

// Guided cancellation: a reason, the confirmation that money and documents were reviewed, and optionally
// annulling the invoices that were not paid. Payments stay; a refund, if any, is recorded apart.
export async function cancelReservation(_: FinanceState, form: FormData): Promise<FinanceState> {
  const { client } = await requireAdmin();
  const id = clean(form.get("id")), reason = clean(form.get("motivo")).replace(/\s+/g, " ");
  if (!validUuid(id)) return { error: "Reserva inválida." };
  if (reason.length < 3 || reason.length > 500) return { error: "Indique el motivo de la cancelación." };
  if (form.get("revisado") !== "si") return { error: "Confirme que revisó pagos, facturas, proveedor y boletos." };
  const result = await client.rpc("cancel_reservation", { p_id: id, p_reason: reason, p_annul_invoices: form.get("anular") === "si" });
  if (result.error) return { error: missing(result.error) ? ledgerMissing : commercialError(result.error) };
  refresh(id);
  const summary = result.data as { facturas_anuladas?: number; ya_cancelada?: boolean } | null;
  if (summary?.ya_cancelada) return { success: "La reserva ya estaba cancelada." };
  const annulled = summary?.facturas_anuladas ?? 0;
  return { success: `Reserva cancelada.${annulled ? ` ${annulled === 1 ? "Se anuló 1 factura pendiente." : `Se anularon ${annulled} facturas pendientes.`}` : ""} Si corresponde una devolución, regístrela en Pagos.` };
}
