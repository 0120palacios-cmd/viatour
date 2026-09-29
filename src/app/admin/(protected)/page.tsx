import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/admin", "viatour | Panel de administración", "Acceso privado a la administración de viatour. Esta página no está disponible para indexación pública.");
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { formatAmount, monthTotals, quotationFunnel, summarizeLeads } from "@/lib/admin-reports";

const panel = "rounded-card border border-line bg-canvas p-6";

export default async function Page() {
    const { client } = await requireAdmin();
    const specs = [["Opiniones pendientes", "reviews", "estado", "pendiente", "/admin/opiniones?estado=pendiente"], ["Leads nuevos", "leads", "estado", "nuevo", "/admin/leads?estado=nuevo"], ["Cotizaciones en borrador", "quotations", "estado", "borrador", "/admin/cotizaciones?estado=borrador"], ["Clientes", "customers", "", "", "/admin/clientes"], ["Paquetes publicados", "packages", "publicado", true, "/admin/paquetes"], ["Destinos en borrador", "destinations", "publicado", false, "/admin/destinos"]] as const;
    const counts = await Promise.all(specs.map(async (spec) => { let query = client.from(spec[1]).select("id", { count: "exact", head: true }); if (spec[2])
        query = query.eq(spec[2], spec[3]); const result = await query; if (result.error)
        throw Error("No se pudo cargar el resumen."); return result.count ?? 0; }));
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 86400000).toISOString(), since90 = new Date(now.getTime() - 90 * 86400000).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    // Reports read optional columns (docs/sql/leads_contact.sql, reservations_income.sql) and fall back when absent.
    type Rows = { data: Record<string, unknown>[] | null; error: unknown };
    let leads: Rows = await client.from("leads").select("servicio,estado,created_at,origen_web").gte("created_at", since30).limit(2000);
    if (leads.error) leads = await client.from("leads").select("servicio,estado,created_at,payload").gte("created_at", since30).limit(2000);
    const [quotations, payments] = await Promise.all([
        client.from("quotations").select("estado").gte("created_at", since90).limit(5000),
        client.from("payments").select("monto,moneda").gte("fecha_pago", monthStart.toISOString().slice(0, 10)).limit(5000),
    ]);
    let reservations: Rows = await client.from("reservations").select("moneda,total,estado,comision").gte("created_at", monthStart.toISOString()).limit(5000);
    const incomeTracked = !reservations.error;
    if (reservations.error) reservations = await client.from("reservations").select("moneda,total,estado").gte("created_at", monthStart.toISOString()).limit(5000);
    const leadSummary = summarizeLeads((leads.data ?? []) as Record<string, unknown>[], now.getTime());
    const funnel = quotationFunnel((quotations.data ?? []) as Record<string, unknown>[]);
    const totals = monthTotals((reservations.data ?? []) as Record<string, unknown>[], (payments.data ?? []) as Record<string, unknown>[]);
    const month = new Intl.DateTimeFormat("es-HN", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);
    return <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="t-h1">Resumen</h1><div className="flex flex-wrap gap-3"><Link href="/admin/leads" className="inline-flex min-h-12 items-center rounded-btn bg-brand px-6 py-3 text-canvas">Ver leads</Link><Link href="/admin/promociones" className="inline-flex min-h-12 items-center rounded-btn border border-line px-6 py-3 text-ink hover:bg-surface">Códigos de la ruleta</Link><a href="/api/admin/newsletter" className="inline-flex min-h-12 items-center rounded-btn border border-line px-6 py-3 text-ink hover:bg-surface">Exportar newsletter (CSV)</a></div></div>
      <section aria-labelledby="pending-title" className="space-y-4"><h2 id="pending-title" className="t-h2">Pendientes</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{specs.map((spec, i) => <Link key={spec[0]} href={spec[4]} className="rounded-card border border-line bg-surface p-6 hover:border-brand"><h3 className="t-body text-ink-soft">{spec[0]}</h3><p className="t-h2 mt-2">{counts[i]}</p></Link>)}</div></section>
      <section aria-labelledby="leads-title" className="space-y-4"><h2 id="leads-title" className="t-h2">Leads</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Últimos 7 días", leadSummary.last7], ["Últimos 30 días", leadSummary.last30], ["Ganados (30 días)", leadSummary.won], ["Perdidos (30 días)", leadSummary.lost]].map(([label, value]) => <div key={String(label)} className={panel}><h3 className="t-body text-ink-soft">{label}</h3><p className="t-h2 mt-2">{value}</p></div>)}</div>
        <div className="grid gap-4 lg:grid-cols-2">{[["Por servicio (30 días)", leadSummary.byService], ["Por origen (30 días)", leadSummary.bySource]].map(([title, rows]) => <div key={String(title)} className={panel}><h3 className="t-h3 mb-4">{String(title)}</h3>{(rows as [string, number][]).length ? <table className="w-full t-body"><tbody>{(rows as [string, number][]).slice(0, 8).map(([label, value]) => <tr key={label} className="border-t border-line"><td className="py-2 pr-4">{label}</td><td className="py-2 text-right font-semibold">{value}</td></tr>)}</tbody></table> : <p className="text-ink-soft">Sin leads en este periodo.</p>}</div>)}</div>
      </section>
      <section aria-labelledby="funnel-title" className="space-y-4"><h2 id="funnel-title" className="t-h2">Cotizaciones (90 días)</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Creadas", funnel.total], ["Enviadas al cliente", funnel.sent], ["Aceptadas", funnel.accepted], ["Tasa de aceptación", `${funnel.rate}%`]].map(([label, value]) => <div key={String(label)} className={panel}><h3 className="t-body text-ink-soft">{label}</h3><p className="t-h2 mt-2">{value}</p></div>)}</div></section>
      <section aria-labelledby="month-title" className="space-y-4"><h2 id="month-title" className="t-h2">Ventas de {month}</h2>
        {!Object.keys(totals).length ? <p className={panel}>Todavía no hay reservas ni pagos registrados este mes.</p> : <div className="grid gap-4 lg:grid-cols-2">{Object.entries(totals).map(([currency, value]) => <div key={currency} className={panel}><h3 className="t-h3 mb-4">{currency}</h3><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="t-small text-ink-soft">Reservas del mes</dt><dd className="t-h3">{value.bookings}</dd></div><div><dt className="t-small text-ink-soft">Vendido</dt><dd className="t-h3">{formatAmount(value.sold, currency)}</dd></div><div><dt className="t-small text-ink-soft">Pagos recibidos</dt><dd className="t-h3">{formatAmount(value.received, currency)}</dd></div><div><dt className="t-small text-ink-soft">Ingreso neto registrado</dt><dd className="t-h3">{incomeTracked ? formatAmount(value.income, currency) : "—"}</dd></div></dl></div>)}</div>}
        {!incomeTracked && <p className="t-small text-ink-soft">Para ver el ingreso neto, ejecute docs/sql/reservations_income.sql y registre la comisión en cada reserva.</p>}
      </section>
    </div>;
}
