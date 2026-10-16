import Link from "next/link";
import { BedDouble, Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { listHotelCatalog } from "@/lib/catalog-data";
import { hotelPlace, matchesQuery, searchText } from "@/lib/catalog";
import { CatalogTabs, SchemaNotice } from "@/components/admin/catalog/catalog-tabs";
import { EmptyState, FilterNav, PageHeader, RecordList, RecordRow, SearchForm, StatusBadge, primaryLink } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin/catalogos/hoteles", "viatour | Catálogo de hoteles", "Catálogo privado de hoteles de viatour.");

export default async function HotelCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; inactivos?: string }> }) {
  const { client } = await requireAdmin();
  const { q, inactivos } = await searchParams;
  const search = String(q ?? "").trim().slice(0, 100);
  const showInactive = inactivos === "1";
  const catalog = await listHotelCatalog(client, { activeOnly: !showInactive });
  const hotels = search ? catalog.rows.filter(entry => matchesQuery(searchText(entry.nombre, entry.ciudad, entry.pais, entry.destino, entry.cadena), search)) : catalog.rows;
  const href = (inactive: boolean) => { const values = new URLSearchParams(); if (search) values.set("q", search); if (inactive) values.set("inactivos", "1"); const text = values.toString(); return `/admin/catalogos/hoteles${text ? `?${text}` : ""}`; };
  const add = <Link href="/admin/catalogos/hoteles/nuevo" className={primaryLink}><Plus size={18} strokeWidth={1.75} aria-hidden="true" />Agregar hotel</Link>;
  return <>
    <PageHeader title="Catálogo de hoteles" description="Hoteles guardados para cotizar sin volver a escribir sus datos. Cada cotización guarda su propia copia: editar un hotel aquí no cambia cotizaciones ya preparadas ni enviadas." actions={catalog.ready ? add : undefined} />
    <CatalogTabs current="hoteles" />
    {!catalog.ready ? <SchemaNotice /> : <>
      <div className="space-y-3">
        <SearchForm id="hotel-search" action="/admin/catalogos/hoteles" placeholder="Buscar por nombre, ciudad, país o cadena" defaultValue={search} hidden={{ inactivos: showInactive ? "1" : "" }} />
        <FilterNav label="Mostrar hoteles" items={[{ href: href(false), label: "Activos", current: !showInactive }, { href: href(true), label: "Incluir inactivos", current: showInactive }]} />
      </div>
      {!hotels.length ? <EmptyState title={catalog.rows.length ? "Ningún hotel coincide con la búsqueda" : "El catálogo aún no tiene hoteles"} description={catalog.rows.length ? "Pruebe con el nombre de la ciudad o de la cadena." : "Agréguelos aquí o use «Guardar en el catálogo» al preparar una cotización de hotel."} action={catalog.rows.length ? undefined : add} />
        : <RecordList label="Hoteles">{hotels.map(entry => <RecordRow key={entry.id} href={`/admin/catalogos/hoteles/${entry.id}`} icon={<BedDouble size={18} strokeWidth={1.75} />} title={entry.nombre} badges={entry.activo ? null : <StatusBadge tone="muted">Inactivo</StatusBadge>}
          meta={[hotelPlace(entry), entry.cadena, entry.estrellas ? `${entry.estrellas} estrellas` : ""].filter(Boolean).join(" · ") || "Sin ubicación"}
          aside={<span className="t-small text-ink-soft">{entry.habitaciones.length} {entry.habitaciones.length === 1 ? "habitación" : "habitaciones"} · {entry.fotos.length} {entry.fotos.length === 1 ? "foto" : "fotos"}</span>} />)}</RecordList>}
    </>}
  </>;
}
