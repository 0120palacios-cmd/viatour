import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Spreadsheet apps execute cells starting with these characters; prefix them so the export stays inert.
function cell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const { client } = await requireAdmin();
  const { data, error } = await client.from("newsletter_subscribers").select("email,nombre,consent,created_at").order("created_at", { ascending: false }).limit(10000);
  if (error) return new Response("No se pudo exportar la lista. Verifique que las políticas de newsletter_subscribers permitan lectura a administradores.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  const rows = [["email", "nombre", "consentimiento", "fecha"], ...(data ?? []).map(row => [row.email, row.nombre, row.consent ? "sí" : "no", row.created_at])];
  const csv = "﻿" + rows.map(row => row.map(cell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
