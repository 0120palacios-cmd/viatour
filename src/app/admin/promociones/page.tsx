import { requireAdmin } from "@/lib/admin";
import { EmptyState, formatDay, PageHeader, RecordList, RecordRow, StatusBadge } from "@/components/admin/ui";
import { createPromoCode } from "./actions";

const input = "min-h-12 w-full rounded-btn border border-line bg-canvas px-4 text-ink focus-visible:border-brand";

export default async function PromoAdminPage() {
  const { client } = await requireAdmin();
  const { data, error } = await client.from("promo_spins").select("id,code,estado,premio_label,cliente_nombre,reservation_ref,created_at,used_at,expires_at").order("created_at", { ascending: false }).limit(200);
  const now = new Date().getTime();
  return <>
    <PageHeader title="Códigos de la ruleta" description="Genere un código después de aprobar el video del cliente. Cada código permite un giro." />
    <form action={createPromoCode} className="grid gap-4 rounded-card border border-line bg-canvas p-4 sm:grid-cols-2 sm:p-6">
      <label className="space-y-2"><span className="t-small">Nombre del cliente (opcional)</span><input name="cliente_nombre" maxLength={160} className={input} /></label>
      <label className="space-y-2"><span className="t-small">Referencia de reserva (opcional)</span><input name="reservation_ref" maxLength={100} className={input} /></label>
      <label className="space-y-2"><span className="t-small">Vence el (opcional; por defecto, seis meses)</span><input type="date" name="expires_at" className={input} /></label>
      <button className="min-h-12 self-end rounded-btn bg-brand px-6 font-semibold text-white hover:bg-brand-deep">Generar código</button>
    </form>
    <section aria-labelledby="promo-codes-heading" className="space-y-4">
      <h2 id="promo-codes-heading" className="t-h2">Códigos emitidos</h2>
      {error ? <p role="alert" className="text-error">No se pudieron cargar los códigos. Verifique que la tabla promo_spins esté instalada.</p> : !data?.length ? <EmptyState title="Todavía no hay códigos" /> : <RecordList label="Códigos emitidos">{data.map(row => {
        const expired = row.estado === "expirada" || (row.estado === "pendiente" && new Date(row.expires_at).getTime() < now);
        const label = expired ? "Expirado" : row.estado === "pendiente" ? "Sin usar" : row.estado === "usada" ? "Usado" : String(row.estado);
        return <RecordRow key={row.id} title={<span className="break-all font-mono">{row.code}</span>} badges={<StatusBadge tone={expired ? "muted" : row.estado === "pendiente" ? "info" : "success"}>{label}</StatusBadge>} meta={<>{row.cliente_nombre || "Sin nombre"}{row.reservation_ref ? ` · ${row.reservation_ref}` : ""} · {row.premio_label || "Sin premio"}</>} aside={<span className="t-small text-ink-soft">Vence {formatDay(row.expires_at)}</span>} />;
      })}</RecordList>}
    </section>
  </>;
}
