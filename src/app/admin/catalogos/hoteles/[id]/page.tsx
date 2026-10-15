import { PageHeader } from "@/components/admin/ui";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { getHotelEntry, listHotelCatalog } from "@/lib/catalog-data";
import { emptyHotelEntry } from "@/lib/catalog";
import { validUuid } from "@/lib/quotation-validation";
import { HotelCatalogForm } from "@/components/admin/catalog/hotel-form";
import { SchemaNotice } from "@/components/admin/catalog/catalog-tabs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/catalogos/hoteles/${(await params).id}`, "viatour | Hotel del catálogo", "Editar un hotel del catálogo privado de viatour.");
}

export default async function HotelEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (id !== "nuevo" && !validUuid(id)) notFound();
  const ready = (await listHotelCatalog(client, { limit: 1 })).ready;
  const entry = id === "nuevo" ? emptyHotelEntry() : await getHotelEntry(client, id);
  if (!entry) notFound();
  return <>
    <PageHeader back={{ href: "/admin/catalogos/hoteles", label: "Catálogo de hoteles" }} title={id === "nuevo" ? "Agregar hotel" : entry.nombre} />
    {ready ? <HotelCatalogForm initial={entry} /> : <SchemaNotice />}
  </>;
}
