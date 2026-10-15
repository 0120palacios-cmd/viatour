import Link from "next/link";
import { Plane, Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { listAirlineCatalog } from "@/lib/catalog-data";
import { matchesQuery, searchText } from "@/lib/catalog";
import { CatalogTabs, SchemaNotice } from "@/components/admin/catalog/catalog-tabs";
import { EmptyState, PageHeader, RecordList, RecordRow, SearchForm, StatusBadge, primaryLink } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin/catalogos/aerolineas", "viatour | Catálogo de aerolíneas", "Catálogo privado de aerolíneas y plantillas de tarifa de viatour.");

export default async function AirlineCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { client } = await requireAdmin();
  const { q } = await searchParams;
  const search = String(q ?? "").trim().slice(0, 100);
  const catalog = await listAirlineCatalog(client);
  const airlines = search ? catalog.rows.filter(entry => matchesQuery(searchText(entry.nombre, entry.iata, entry.icao, entry.pais), search)) : catalog.rows;
  const add = <Link href="/admin/catalogos/aerolineas/nuevo" className={primaryLink}><Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar aerolínea</Link>;
  return <>
    <PageHeader title="Catálogo de aerolíneas" description="Aerolíneas y plantillas de tarifa y equipaje verificadas. Al cotizar, cada plantilla se copia y el equipaje se vuelve a confirmar." actions={catalog.ready ? add : undefined} />
    <CatalogTabs current="aerolineas" />
    {!catalog.ready ? <SchemaNotice /> : <>
      <SearchForm id="airline-search" action="/admin/catalogos/aerolineas" placeholder="Buscar por nombre, código o país" defaultValue={search} />
      {!airlines.length ? <EmptyState title={catalog.rows.length ? "Ninguna aerolínea coincide con la búsqueda" : "El catálogo aún no tiene aerolíneas"} description={catalog.rows.length ? "Pruebe con el código IATA (por ejemplo, CM o AA)." : "Puede empezar con docs/sql/quotations_v6_seed_airlines.sql o agregarlas aquí."} action={catalog.rows.length ? undefined : add} />
        : <RecordList label="Aerolíneas">{airlines.map(entry => <RecordRow key={entry.id} href={`/admin/catalogos/aerolineas/${entry.id}`} icon={<Plane size={18} strokeWidth={1.75} />} title={entry.nombre} badges={entry.activo ? null : <StatusBadge tone="muted">Inactiva</StatusBadge>}
          meta={[entry.iata, entry.icao, entry.pais].filter(Boolean).join(" · ") || "Sin códigos"}
          aside={<span className="t-small text-ink-soft">{entry.presets.length} {entry.presets.length === 1 ? "plantilla" : "plantillas"}</span>} />)}</RecordList>}
    </>}
  </>;
}
