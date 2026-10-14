import Link from "next/link";
import { Plane, Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { listAirlineCatalog } from "@/lib/catalog-data";
import { matchesQuery, searchText } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogTabs, SchemaNotice } from "@/components/admin/catalog/catalog-tabs";

export const metadata = pageMetadata("/admin/catalogos/aerolineas", "viatour | Catálogo de aerolíneas", "Catálogo privado de aerolíneas y plantillas de tarifa de viatour.");

export default async function AirlineCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { client } = await requireAdmin();
  const { q } = await searchParams;
  const search = String(q ?? "").trim().slice(0, 100);
  const catalog = await listAirlineCatalog(client);
  const airlines = search ? catalog.rows.filter(entry => matchesQuery(searchText(entry.nombre, entry.iata, entry.icao, entry.pais), search)) : catalog.rows;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="t-h1">Catálogo de aerolíneas</h1><p className="mt-2 max-w-2xl text-ink-soft">Aerolíneas y plantillas de tarifa y equipaje verificadas. Al cotizar, cada plantilla se copia y se confirma de nuevo.</p></div>
      {catalog.ready ? <Button asChild><Link href="/admin/catalogos/aerolineas/nuevo"><Plus size={19} strokeWidth={1.75} aria-hidden="true" />Agregar aerolínea</Link></Button> : null}
    </div>
    <CatalogTabs current="aerolineas" />
    {!catalog.ready ? <SchemaNotice /> : <>
      <form className="flex flex-col gap-3 sm:flex-row" role="search"><label className="sr-only" htmlFor="airline-search">Buscar aerolíneas</label><Input id="airline-search" name="q" placeholder="Buscar por nombre, código o país" defaultValue={search} /><Button type="submit" variant="ghost">Buscar</Button></form>
      {!airlines.length ? <p className="rounded-card border p-6">{catalog.rows.length ? "Ninguna aerolínea coincide con la búsqueda." : "El catálogo aún no tiene aerolíneas. Puede empezar con docs/sql/quotations_v6_seed_airlines.sql o agregarlas aquí."}</p>
        : <ul className="grid gap-4 lg:grid-cols-2">{airlines.map(entry => <li key={entry.id}><Link href={`/admin/catalogos/aerolineas/${entry.id}`} className="flex h-full gap-4 rounded-card border bg-canvas p-5 shadow-sm transition-colors hover:border-brand">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand-deep" aria-hidden="true"><Plane size={20} strokeWidth={1.75} /></span>
          <span className="min-w-0">
            <span className="block t-h3">{entry.nombre}</span>
            <span className="mt-1 block text-ink-soft">{[entry.iata, entry.icao, entry.pais].filter(Boolean).join(" · ") || "Sin códigos"}</span>
            <span className="mt-2 block t-small text-ink-soft">{[`${entry.presets.length} ${entry.presets.length === 1 ? "plantilla" : "plantillas"}`, entry.activo ? "" : "Inactiva"].filter(Boolean).join(" · ")}</span>
          </span>
        </Link></li>)}</ul>}
    </>}
  </div>;
}
