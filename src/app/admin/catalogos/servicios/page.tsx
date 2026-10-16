import Link from "next/link";
import { Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { listServiceCatalog } from "@/lib/catalog-data";
import { isServiceCatalogKind, serviceCatalogKinds, serviceCatalogLabels, serviceMatches } from "@/lib/service-catalog";
import { CatalogTabs, SchemaNotice } from "@/components/admin/catalog/catalog-tabs";
import { serviceIcons } from "@/components/admin/catalog/service-icons";
import { EmptyState, FilterNav, PageHeader, RecordList, RecordRow, SearchForm, StatusBadge, primaryLink } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin/catalogos/servicios", "viatour | Catálogo de servicios", "Catálogo privado de servicios y navieras de viatour.");

export default async function ServiceCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; inactivos?: string }> }) {
  const { client } = await requireAdmin();
  const { q, tipo, inactivos } = await searchParams;
  const search = String(q ?? "").trim().slice(0, 100);
  const kind = isServiceCatalogKind(tipo) ? tipo : "";
  const showInactive = inactivos === "1";
  const catalog = await listServiceCatalog(client, { activeOnly: !showInactive });
  const counts = Object.fromEntries(serviceCatalogKinds.map(value => [value, catalog.rows.filter(row => row.tipo === value).length]));
  const services = catalog.rows.filter(row => (!kind || row.tipo === kind) && serviceMatches(row, search));
  const href = (patch: { tipo?: string; inactivos?: string }) => {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: search, tipo: kind, inactivos: showInactive ? "1" : "", ...patch })) if (value) values.set(key, value);
    const text = values.toString();
    return `/admin/catalogos/servicios${text ? `?${text}` : ""}`;
  };
  const add = <Link href={`/admin/catalogos/servicios/nuevo${kind ? `?tipo=${kind}` : ""}`} className={primaryLink}><Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar {kind ? serviceCatalogLabels[kind].toLowerCase() : "servicio"}</Link>;
  return <>
    <PageHeader title="Catálogo de servicios" description="Navieras, traslados, tours, actividades, seguros y otros servicios que se repiten al cotizar. Sin precios: cada cotización copia los datos y confirma lo que incluye." actions={catalog.ready ? add : undefined} />
    <CatalogTabs current="servicios" />
    {!catalog.ready ? <SchemaNotice file="docs/sql/service_catalog_v7.sql" doc="docs/admin-v7.md" /> : <>
      <div className="space-y-3">
        <SearchForm id="service-search" action="/admin/catalogos/servicios" placeholder="Buscar por nombre, operador o destino" defaultValue={search} hidden={{ tipo: kind, inactivos: showInactive ? "1" : "" }} />
        <FilterNav label="Filtrar por tipo" items={[{ href: href({ tipo: "" }), label: "Todos", current: !kind, count: catalog.rows.length }, ...serviceCatalogKinds.map(value => ({ href: href({ tipo: value }), label: serviceCatalogLabels[value], current: kind === value, count: counts[value] }))]} />
        <FilterNav label="Mostrar servicios" items={[{ href: href({ inactivos: "" }), label: "Activos", current: !showInactive }, { href: href({ inactivos: "1" }), label: "Incluir inactivos", current: showInactive }]} />
      </div>
      {!services.length ? <EmptyState title={catalog.rows.length ? "Ningún servicio coincide" : "El catálogo aún no tiene servicios"} description={catalog.rows.length ? "Pruebe con otro tipo o con el nombre del operador." : "Agréguelos aquí o use «Guardar en el catálogo» en un servicio de un paquete combinado."} action={catalog.rows.length ? undefined : add} />
        : <RecordList label="Servicios">{services.map(entry => {
          const Icon = serviceIcons[entry.tipo];
          return <RecordRow key={entry.id} href={`/admin/catalogos/servicios/${entry.id}`} icon={<Icon size={18} strokeWidth={1.75} />} title={entry.nombre}
            badges={<><StatusBadge tone="neutral">{serviceCatalogLabels[entry.tipo]}</StatusBadge>{entry.activo ? null : <StatusBadge tone="muted">Inactivo</StatusBadge>}</>}
            meta={[entry.operador, entry.destino, entry.duracion].filter(Boolean).join(" · ") || "Sin operador ni destino"}
            aside={<span className="t-small text-ink-soft">{entry.inclusiones.length} {entry.inclusiones.length === 1 ? "inclusión" : "inclusiones"}</span>} />;
        })}</RecordList>}
    </>}
  </>;
}
