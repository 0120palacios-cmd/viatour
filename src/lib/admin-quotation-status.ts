import { quotationStatusLabel, quotationStatuses, type QuotationStatus } from "@/lib/quotation-types";

// Quotation states as the admin sees them. "reemplazada" (an accepted quotation replaced by its accepted
// amendment, docs/sql/quotation_integrity.sql) only exists here: quotation-types.ts is shared with the frozen
// customer area, which never shows quotation states.
export const adminQuotationStatuses = [...quotationStatuses, "reemplazada"] as const;
export type AdminQuotationStatus = QuotationStatus | "reemplazada";

export function adminQuotationStatusLabel(status: AdminQuotationStatus) {
  return status === "reemplazada" ? "Reemplazada por enmienda" : quotationStatusLabel(status);
}
