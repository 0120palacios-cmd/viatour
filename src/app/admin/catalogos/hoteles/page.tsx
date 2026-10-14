import Link from "next/link";
import { BedDouble, Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { listHotelCatalog } from "@/lib/catalog-data";
import { hotelPlace, matchesQuery, searchText } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogTabs, SchemaNotice } from "@/components/admin/catalog/catalog-tabs";

export const metadata = pageMetadata("/admin/catalogos/hoteles", "viatour | Catálogo de hoteles", "Catálogo privado de hoteles de viatour.");

export default async function HotelCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; inactivos?: string }> }) {
  const { client } = await requireAdmin();
  const { q, inactivos } = await searchParams;
  const search = String(q ?? "").trim().slice(0, 100);
  const showInactive = inactivos === "1";
  const catalog = await listHotelCatalog(client, { activeOnly: !showInactive });
  const hotels = search ? catalog.rows.filter(entry => matchesQuery(searchText(entry.nombre, entry.ciudad, entry.pais, entry.destino, entry.cadena), search)) : catalog.rows;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="t-h1">Catálogo de hoteles</h1><p className="mt-2 max-w-2xl text-ink-soft">Hoteles guardados para preparar cotizaciones sin volver a escribir sus datos. Cada cotización guarda su propia copia.</p></div>
      {catalog.ready ? <Button asChild><Link href="/admin/catalogos/hoteles/nuevo"><Plus size={19} strokeWidth={1.75} aria-hidden="true" />Agregar hotel</Link></Button> : null}
    </div>
    <CatalogTabs current="hoteles" />
    {!catalog.ready ? <SchemaNotice /> : <>
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" role="search">
        <label className="sr-only" htmlFor="hotel-search">Buscar hoteles</label>
        <Input id="hotel-search" name="q" placeholder="Buscar por nombre, ciudad, país o cadena" defaultValue={search} />
        <label className="flex min-h-11 items-center gap-2 whitespace-nowrap t-small text-ink"><input type="checkbox" name="inactivos" value="1" defaultChecked={showInactive} className="size-4 accent-[var(--color-brand)]" />Incluir inactivos</label>
        <Button type="submit" variant="ghost">Buscar</Button>
      </form>
      {!hotels.length ? <p className="rounded-card border p-6">{catalog.rows.length ? "Ningún hotel coincide con la búsqueda." : "El catálogo aún no tiene hoteles. Agréguelos aquí o use «Guardar en el catálogo» al cotizar."}</p>
        : <ul className="grid gap-4 lg:grid-cols-2">{hotels.map(entry => <li key={entry.id}><Link href={`/admin/catalogos/hoteles/${entry.id}`} className="flex h-full gap-4 rounded-card border bg-canvas p-5 shadow-sm transition-colors hover:border-brand">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand-deep" aria-hidden="true"><BedDouble size={20} strokeWidth={1.75} /></span>
          <span className="min-w-0">
            <span className="block t-h3">{entry.nombre}</span>
            <span className="mt-1 block text-ink-soft">{[hotelPlace(entry), entry.cadena, entry.estrellas ? `${entry.estrellas} estrellas` : ""].filter(Boolean).join(" · ")}</span>
            <span className="mt-2 block t-small text-ink-soft">{[`${entry.habitaciones.length} ${entry.habitaciones.length === 1 ? "habitación" : "habitaciones"}`, `${entry.fotos.length} ${entry.fotos.length === 1 ? "foto" : "fotos"}`, entry.activo ? "" : "Inactivo"].filter(Boolean).join(" · ")}</span>
          </span>
        </Link></li>)}</ul>}
    </>}
  </div>;
}
