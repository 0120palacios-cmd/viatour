import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { getServiceEntry, listServiceCatalog } from "@/lib/catalog-data";
import { emptyServiceEntry, isServiceCatalogKind } from "@/lib/service-catalog";
import { validUuid } from "@/lib/quotation-validation";
import { ServiceCatalogForm } from "@/components/admin/catalog/service-form";
import { SchemaNotice } from "@/components/admin/catalog/catalog-tabs";
import { PageHeader } from "@/components/admin/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/catalogos/servicios/${(await params).id}`, "viatour | Servicio del catálogo", "Editar un servicio del catálogo privado de viatour.");
}

export default async function ServiceEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const { tipo } = await searchParams;
  if (id !== "nuevo" && !validUuid(id)) notFound();
  const entry = id === "nuevo" ? emptyServiceEntry(isServiceCatalogKind(tipo) ? tipo : "tour") : await getServiceEntry(client, id);
  if (!entry) notFound();
  // A new record needs the table; an existing one was read from it.
  const ready = id !== "nuevo" || (await listServiceCatalog(client, { tipo: "otro" })).ready;
  return <>
    <PageHeader back={{ href: "/admin/catalogos/servicios", label: "Catálogo de servicios" }} title={id === "nuevo" ? "Agregar servicio" : entry.nombre} />
    {ready ? <ServiceCatalogForm key={entry.updatedAt || "nuevo"} initial={entry} /> : <SchemaNotice file="docs/sql/service_catalog_v7.sql" doc="docs/admin-v7.md" />}
  </>;
}
