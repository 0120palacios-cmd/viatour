import { requireAdmin } from "@/lib/admin";
import { createPromoCode } from "./actions";

export default async function PromoAdminPage() {
  const { client } = await requireAdmin();
  const { data, error } = await client.from("promo_spins").select("id,code,estado,premio_label,cliente_nombre,reservation_ref,created_at,used_at,expires_at").order("created_at", { ascending: false }).limit(200);
  return <main className="space-y-8">
    <header><h1 className="t-h1">Códigos de la ruleta</h1><p className="t-body mt-3 text-ink-soft">Genere un código después de aprobar el video del cliente. Cada código permite un giro.</p></header>
    <form action={createPromoCode} className="grid gap-4 rounded-card border border-line p-6 sm:grid-cols-2">
      <label className="space-y-2"><span className="t-small">Nombre del cliente (opcional)</span><input name="cliente_nombre" maxLength={160} className="min-h-12 w-full rounded-btn border border-line px-4" /></label>
      <label className="space-y-2"><span className="t-small">Referencia de reserva (opcional)</span><input name="reservation_ref" maxLength={100} className="min-h-12 w-full rounded-btn border border-line px-4" /></label>
      <label className="space-y-2"><span className="t-small">Vence el (opcional; por defecto, seis meses)</span><input type="date" name="expires_at" className="min-h-12 w-full rounded-btn border border-line px-4" /></label>
      <button className="min-h-12 self-end rounded-btn bg-brand px-6 text-canvas">Generar código</button>
    </form>
    <section aria-labelledby="promo-codes-heading"><h2 id="promo-codes-heading" className="t-h2 mb-4">Códigos emitidos</h2>{error ? <p role="alert" className="text-error">No se pudieron cargar los códigos. Verifique que la tabla promo_spins esté instalada.</p> : !data?.length ? <p className="rounded-card border border-line p-6">Todavía no hay códigos.</p> : <div className="space-y-4">{data.map(row => <article key={row.id} className="grid gap-3 rounded-card border border-line p-5 sm:grid-cols-2"><p className="t-h3 break-all">{row.code}</p><p className="t-body">{row.estado === "pendiente" && new Date(row.expires_at) < new Date() ? "expirada" : row.estado}</p><p className="t-small text-ink-soft">{row.cliente_nombre || "Sin nombre"}{row.reservation_ref ? ` · ${row.reservation_ref}` : ""}</p><p className="t-small text-ink-soft">{row.premio_label || "Sin premio"} · Vence {new Date(row.expires_at).toLocaleDateString("es-HN")}</p></article>)}</div>}</section>
  </main>;
}
