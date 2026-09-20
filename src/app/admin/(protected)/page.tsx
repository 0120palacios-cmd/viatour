import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/admin", "viatour | Panel de administración", "Acceso privado a la administración de viatour. Esta página no está disponible para indexación pública.");
import { requireAdmin } from "@/lib/admin";
export default async function Page() {
    const { client } = await requireAdmin();
    const specs = [["Opiniones pendientes", "reviews", "estado", "pendiente"], ["Leads totales", "leads"], ["Leads nuevos", "leads", "estado", "nuevo"], ["Clientes", "customers"], ["Cotizaciones", "quotations"], ["Cotizaciones en borrador", "quotations", "estado", "borrador"], ["Paquetes publicados", "packages", "publicado", true], ["Paquetes en borrador", "packages", "publicado", false], ["Destinos publicados", "destinations", "publicado", true], ["Destinos en borrador", "destinations", "publicado", false]] as const;
    const counts = await Promise.all(specs.map(async (spec) => { let query = client.from(spec[1]).select("id", { count: "exact", head: true }); if (spec.length === 4)
        query = query.eq(spec[2], spec[3]); const result = await query; if (result.error)
        throw Error("No se pudo cargar el resumen."); return result.count ?? 0; }));
    return <><h1 className="t-h1 mb-6">Resumen</h1><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{specs.map((spec, i) => <div key={spec[0]} className="rounded-card border bg-surface p-6"><h2 className="t-body text-ink-soft">{spec[0]}</h2><p className="t-h2 mt-2">{counts[i]}</p></div>)}</div></>;
}
