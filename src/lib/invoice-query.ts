// Invoice reads that survive the production schema. The live `invoices` table was created without the
// items / cliente_email / cliente_telefono columns this code writes (docs/sql/invoices_v5.sql adds
// them). Selecting a missing column makes PostgREST fail the whole query, which used to break every
// admin reservation page and the customer's Mi reserva page. Reads retry with the columns that always
// exist and fill the rest with empty values; creating an invoice still requires the SQL.

export const invoiceBaseFields = "id,reservation_id,numero,cliente_nombre,total,moneda,fecha_emision,fecha_vencimiento,estado,notas,created_at,updated_at";
export const invoiceFields = `${invoiceBaseFields},cliente_email,cliente_telefono,items,commercial_snapshot`;

// A plain shape: the Supabase client cannot type a select whose column list is chosen at runtime.
type QueryResult = { data: unknown; error: { code?: string; message?: string } | null };

export function isMissingInvoiceColumn(error: { code?: string } | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function complete(row: unknown) {
  return row && typeof row === "object" ? { cliente_email: "", cliente_telefono: null, items: [], ...(row as Record<string, unknown>) } : row;
}

export async function selectInvoices(query: (fields: string) => PromiseLike<QueryResult>): Promise<QueryResult> {
  let full = await query(invoiceFields);
  if (isMissingInvoiceColumn(full.error)) full = await query(`${invoiceBaseFields},cliente_email,cliente_telefono,items`);
  if (!isMissingInvoiceColumn(full.error)) return { data: full.data, error: full.error };
  const base = await query(invoiceBaseFields);
  if (base.error) return { data: null, error: base.error };
  return { data: Array.isArray(base.data) ? base.data.map(complete) : complete(base.data), error: null };
}
