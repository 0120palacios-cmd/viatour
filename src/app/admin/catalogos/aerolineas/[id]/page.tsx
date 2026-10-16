import { PageHeader } from "@/components/admin/ui";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { getAirlineEntry, listAirlineCatalog } from "@/lib/catalog-data";
import { emptyAirlineEntry } from "@/lib/catalog";
import { validUuid } from "@/lib/quotation-validation";
import { AirlineCatalogForm } from "@/components/admin/catalog/airline-form";
import { SchemaNotice } from "@/components/admin/catalog/catalog-tabs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/catalogos/aerolineas/${(await params).id}`, "viatour | Aerolínea del catálogo", "Editar una aerolínea del catálogo privado de viatour.");
}

export default async function AirlineEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (id !== "nuevo" && !validUuid(id)) notFound();
  const ready = (await listAirlineCatalog(client)).ready;
  const entry = id === "nuevo" ? emptyAirlineEntry() : await getAirlineEntry(client, id);
  if (!entry) notFound();
  return <>
    <PageHeader back={{ href: "/admin/catalogos/aerolineas", label: "Catálogo de aerolíneas" }} title={id === "nuevo" ? "Agregar aerolínea" : entry.nombre} />
    {ready ? <AirlineCatalogForm key={entry.updatedAt || "nuevo"} initial={entry} /> : <SchemaNotice />}
  </>;
}
