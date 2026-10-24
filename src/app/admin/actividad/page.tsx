import Link from "next/link";
import { noindexMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { EmptyState, FilterNav, PageHeader, Panel, textLink } from "@/components/admin/ui";
import { ActivityList } from "@/components/admin/activity-list";
import { activityEntities, listActivity, toLines } from "@/lib/activity";

export const metadata = noindexMetadata("viatour | Actividad", "Historial de actividad de la administración privada de viatour.");

// Everything that changed in quotations, reservations, money, passenger files and passengers, newest first.
// The history is append-only: nobody can edit or delete it, and it never holds personal data.
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ entidad?: string; antes?: string }> }) {
  const { client, user } = await requireAdmin();
  const { entidad = "", antes } = await searchParams;
  const entity = activityEntities.some(([key]) => key === entidad) ? entidad : "";
  const before = antes && /^\d{1,15}$/.test(antes) ? Number(antes) : undefined;
  const { available, entries } = await listActivity(client, { entity, before, limit: 100 });
  const lines = toLines(entries, user.id);
  const href = (values: { entidad?: string; antes?: number }) => { const query = new URLSearchParams(); if (values.entidad) query.set("entidad", values.entidad); if (values.antes) query.set("antes", String(values.antes)); const text = query.toString(); return `/admin/actividad${text ? `?${text}` : ""}`; };
  return <>
    <PageHeader title="Actividad" description="Cada cambio de estado, envío, pago, factura y expediente, con quién y cuándo. El historial no se puede editar ni borrar." />
    <FilterNav label="Filtrar por tipo" items={activityEntities.map(([key, label]) => ({ href: href({ entidad: key }), label, current: key === entity }))} />
    {!available ? <EmptyState title="El historial no está disponible" description="Se activa con docs/sql/admin_audit_log.sql." />
      : !lines.length ? <EmptyState title="Sin actividad registrada" description={before ? "No hay entradas más antiguas." : "Los cambios aparecerán aquí a medida que se hagan."} />
      : <Panel title={before ? "Entradas anteriores" : "Más recientes"}>
        <ActivityList lines={lines} />
        <div className="flex flex-wrap gap-4 border-t border-line p-4 sm:px-6">
          {before ? <Link className={textLink} href={href({ entidad: entity })}>Volver a lo más reciente</Link> : null}
          {entries.length === 100 ? <Link className={textLink} href={href({ entidad: entity, antes: entries[entries.length - 1].id })}>Ver anteriores</Link> : null}
        </div>
      </Panel>}
  </>;
}
