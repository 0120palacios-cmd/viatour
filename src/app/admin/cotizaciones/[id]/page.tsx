import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { PageHeader, textLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { getAdminQuotation, listQuotationVersions, recentQuotationHotels } from "@/lib/quotation-data";
import { editorCatalogs } from "@/lib/catalog-data";
import { QuotationEditor } from "@/components/admin/quotation-editor/editor";
import { draftItemsFrom, type EditorDraft } from "@/components/admin/quotation-editor/draft";
import { AssignQuotationForm, QuotationStatusForm } from "@/components/admin/quotation-actions";
import { ConvertQuotationForm } from "@/components/admin/reservation-actions";
import { isExpired } from "@/lib/quotation-details";
import { validUuid } from "@/lib/quotation-validation";
import { quotationStatusLabel, type Customer } from "@/lib/quotation-types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/cotizaciones/${(await params).id}`, "viatour | Editar cotización", "Editar una cotización en la administración privada de viatour.");
}

const dateTime = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tegucigalpa" });

export default async function EditQuotationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ duplicada?: string; enmienda?: string }> }) {
  const { client, user } = await requireAdmin();
  const { id } = await params;
  const { duplicada, enmienda } = await searchParams;
  if (!validUuid(id)) notFound();
  const [record, customers, versions, recentHotels, reservation, catalogs] = await Promise.all([
    getAdminQuotation(client, id),
    client.from("customers").select("id,nombre,email,telefono,notas").order("nombre", { ascending: true }).limit(1000),
    listQuotationVersions(client, id),
    recentQuotationHotels(client),
    client.from("reservations").select("id,codigo").eq("quotation_id", id).limit(1).maybeSingle(),
    editorCatalogs(client),
  ]);
  if (!record) notFound();
  if (customers.error) throw new Error("No se pudieron cargar los clientes.");
  const { quotation } = record;
  const draft: EditorDraft = {
    id, updatedAt: quotation.updated_at ?? null, leadId: null, customerId: quotation.customer_id ?? "",
    cliente: { nombre: quotation.cliente_nombre, email: quotation.cliente_email ?? "", telefono: quotation.cliente_telefono ?? "" },
    tipo: record.kind, destino: quotation.destino === "Por definir" ? "" : quotation.destino, moneda: quotation.moneda, notas: quotation.notas ?? "", detalles: record.details,
    items: draftItemsFrom(record.items, record.details.paquete.lineas),
  };
  const expired = isExpired(record.expiry) && ["borrador", "enviada"].includes(quotation.estado);
  const sidebar = <>
    <section aria-labelledby="status-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="status-title" className="mb-1 font-semibold text-ink">Estado: {quotationStatusLabel(quotation.estado)}{expired ? " (vencida)" : ""}</h2>
      <p className="mb-3 t-small text-ink-soft">Marque la respuesta del cliente cuando la reciba.</p>
      <QuotationStatusForm id={id} status={quotation.estado} />
    </section>
    <section aria-labelledby="agent-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="agent-title" className="mb-1 font-semibold text-ink">Asesor asignado</h2>
      <p className="mb-3 t-small text-ink-soft">{quotation.agente_id === user.id ? "Usted tiene asignada esta cotización." : "Asignada a otro asesor. Guardar cambios no la reasigna."}</p>
      {quotation.agente_id !== user.id ? <AssignQuotationForm id={id} /> : null}
    </section>
    <section aria-labelledby="versions-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="versions-title" className="mb-2 font-semibold text-ink">Versiones</h2>
      {versions.length ? <ul className="space-y-1.5">{versions.map(version => <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 t-small"><span>Versión {version.version} · {version.origen === "aceptacion" ? "guardada al aceptar" : "enviada"} {dateTime.format(new Date(version.emitida_en))}</span><a className="text-brand underline underline-offset-4" href={`/api/admin/cotizaciones/${id}/pdf?version=${version.version}&inline=1`} target="_blank" rel="noreferrer">Ver PDF</a></li>)}</ul> : <p className="t-small text-ink-soft">{record.schemaReady ? "Aún no se ha enviado. Cada envío guarda una copia fija de lo que recibió el cliente." : "El historial de versiones se activa con docs/sql/quotations_v5.sql."}</p>}
    </section>
    <section aria-labelledby="reservation-title" className="rounded-panel border border-line bg-surface p-4">
      <h2 id="reservation-title" className="mb-1 font-semibold text-ink">Reserva</h2>
      {reservation.data ? <p className="t-small">Convertida en la reserva <Link className="text-brand underline underline-offset-4" href={`/admin/reservas/${reservation.data.id}`}>{String(reservation.data.codigo)}</Link>.</p> : <><p className="mb-3 t-small text-ink-soft">Convierta la cotización solo cuando el cliente la haya aceptado. Crear la reserva aquí no confirma vuelos ni hoteles con los proveedores.</p><ConvertQuotationForm quotationId={id} enabled={quotation.estado === "aceptada"} /></>}
    </section>
  </>;
  return <>
    <PageHeader back={{ href: "/admin/cotizaciones", label: "Cotizaciones" }} title={`${quotation.cliente_nombre} · ${quotation.destino}`} description={quotation.customer_id ? <Link className={textLink} href={`/admin/clientes/${quotation.customer_id}`}>Ver ficha del cliente</Link> : undefined} />
    {enmienda ? <p className="rounded-card border border-line bg-brand-tint p-4 text-ink">Enmienda creada en borrador. La cotización aceptada original no cambió. Actualice lo necesario, apruebe las condiciones y envíe esta nueva cotización al cliente.</p> : null}
    {duplicada ? <p className="rounded-card border border-line bg-brand-tint p-4 text-ink">Esta es una copia nueva en borrador. Actualice fechas, validez y precios, y vuelva a confirmar el itinerario y el equipaje.</p> : null}
    {expired ? <p role="alert" className="rounded-card border border-error/40 bg-canvas p-4 text-error">La validez de esta cotización venció el {dateTime.format(new Date(record.expiry))}. Actualícela antes de volver a enviarla; las versiones ya enviadas no cambian.</p> : null}
    <QuotationEditor initial={draft} customers={(customers.data ?? []) as Customer[]} recentHotels={recentHotels} sidebar={sidebar} catalogs={catalogs}
      meta={{ codigo: quotation.codigo, estado: quotation.estado, estadoLabel: quotationStatusLabel(quotation.estado), expired, schemaReady: record.schemaReady, sent: versions.length > 0 || quotation.estado !== "borrador", converted: Boolean(reservation.data) }} />
  </>;
}
