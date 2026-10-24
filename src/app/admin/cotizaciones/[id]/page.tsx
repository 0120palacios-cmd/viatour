import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { PageHeader, textLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { getAdminQuotation, getQuotationVersion, listQuotationVersions, recentQuotationHotels } from "@/lib/quotation-data";
import { editorCatalogs } from "@/lib/catalog-data";
import { QuotationEditor } from "@/components/admin/quotation-editor/editor";
import { draftItemsFrom, type EditorDraft } from "@/components/admin/quotation-editor/draft";
import { AssignQuotationForm, QuotationStatusForm } from "@/components/admin/quotation-actions";
import { CommercialLifecycle } from "@/components/admin/commercial-lifecycle";
import { formatMoney } from "@/lib/reservation-types";
import { isExpired } from "@/lib/quotation-details";
import { validUuid } from "@/lib/quotation-validation";
import { defaultShareMessage } from "@/lib/quotation-share";
import { normalizePhone } from "@/lib/lead-validation";
import { PendingShareActions, RevokeShareButton } from "@/components/admin/whatsapp-share";
import { recordActivity, toLines } from "@/lib/activity";
import { ActivityList } from "@/components/admin/activity-list";
import { type Customer } from "@/lib/quotation-types";
import { adminQuotationStatusLabel as quotationStatusLabel, type AdminQuotationStatus } from "@/lib/admin-quotation-status";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/cotizaciones/${(await params).id}`, "viatour | Editar cotización", "Editar una cotización en la administración privada de viatour.");
}

const isPast = (iso: string) => Date.parse(iso) < Date.now();
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
  // The shared Quotation type predates "reemplazada" (admin-only state).
  const estado = quotation.estado as AdminQuotationStatus;
  const draft: EditorDraft = {
    id, updatedAt: quotation.updated_at ?? null, leadId: null, customerId: quotation.customer_id ?? "",
    cliente: { nombre: quotation.cliente_nombre, email: quotation.cliente_email ?? "", telefono: quotation.cliente_telefono ?? "" },
    tipo: record.kind, destino: quotation.destino === "Por definir" ? "" : quotation.destino, moneda: quotation.moneda, notas: quotation.notas ?? "", detalles: record.details,
    items: draftItemsFrom(record.items, record.details.paquete.lineas),
  };
  const expired = isExpired(record.expiry) && ["borrador", "enviada"].includes(quotation.estado);
  const lifecycle = await client.from("quotations").select("accepted_version_id,sent_version_id,version_aceptada").eq("id", id).maybeSingle();
  // Rejection reason and amendment links (docs/sql/quotation_integrity.sql); absent until that SQL is applied.
  const links = await client.from("quotations").select("motivo_rechazo,rechazada_en,enmienda_de,reemplazada_por,reemplazada_en").eq("id", id).maybeSingle();
  const related = links.data ? (await client.from("quotations").select("id,codigo,estado").in("id", [links.data.enmienda_de, links.data.reemplazada_por].filter(Boolean) as string[])).data ?? [] : [];
  const amends = related.find(row => row.id === links.data?.enmienda_de);
  const replacedBy = related.find(row => row.id === links.data?.reemplazada_por);
  // WhatsApp shares of this quotation (docs/sql/quotation_shares.sql); empty until that SQL is applied.
  const shares = (await client.from("quotation_shares").select("id,estado,telefono,created_at,confirmado_en,expira_en,aperturas,abierto_en,version_id").eq("quotation_id", id).neq("estado", "cancelado").order("created_at", { ascending: false }).limit(20)).data ?? [];
  const activity = await recordActivity(client, id, 15);
  const shareLabels: Record<string, string> = { preparado: "Preparado, sin confirmar", confirmado: "Enviado por el asesor", revocado: "Enlace desactivado", enviado: "Enviado", entregado: "Entregado", leido: "Leído", fallido: "Falló" };
  const versionId = quotation.estado === "aceptada" ? lifecycle.data?.accepted_version_id : lifecycle.data?.sent_version_id;
  const selected = versions.find(version => version.id === versionId) ?? (quotation.estado === "aceptada" && !versionId ? versions.find(version => version.version === lifecycle.data?.version_aceptada) : undefined) ?? (quotation.estado === "enviada" && !versionId ? versions.find(version => version.origen !== "aceptacion") : undefined);
  const frozen = selected ? await getQuotationVersion(client, id, selected.version) : null;
  const sidebar = <>
    <section aria-labelledby="status-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="status-title" className="mb-1 font-semibold text-ink">Estado: {quotationStatusLabel(estado)}{expired ? " (vencida)" : ""}</h2>
      <p className="mb-3 t-small text-ink-soft">Marque la respuesta del cliente cuando la reciba.</p>
      {quotation.estado === "rechazada" && links.data?.motivo_rechazo ? <p className="mb-3 t-small text-ink">Motivo: {links.data.motivo_rechazo}{links.data.rechazada_en ? ` (${dateTime.format(new Date(links.data.rechazada_en))})` : ""}</p> : null}
      {estado === "reemplazada" ? <p className="t-small">Reemplazada{links.data?.reemplazada_en ? ` el ${dateTime.format(new Date(links.data.reemplazada_en))}` : ""} por {replacedBy ? <Link className={textLink} href={`/admin/cotizaciones/${replacedBy.id}`}>{replacedBy.codigo}</Link> : "su enmienda"}. Su contenido queda como registro y no se puede modificar.</p>
        : quotation.estado !== "aceptada" ? <QuotationStatusForm id={id} status={quotation.estado} /> : <p className="t-small">El contenido aceptado está bloqueado. Para modificarlo, cree una enmienda.</p>}
    </section>
    <section aria-labelledby="agent-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="agent-title" className="mb-1 font-semibold text-ink">Asesor asignado</h2>
      <p className="mb-3 t-small text-ink-soft">{quotation.agente_id === user.id ? "Usted tiene asignada esta cotización." : "Asignada a otro asesor. Guardar cambios no la reasigna."}</p>
      {quotation.agente_id !== user.id ? <AssignQuotationForm id={id} /> : null}
    </section>
    {shares.length ? <section aria-labelledby="shares-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="shares-title" className="mb-2 font-semibold text-ink">Envíos por WhatsApp</h2>
      <ul className="space-y-3">{shares.map(share => { const version = versions.find(row => row.id === share.version_id); const expired = isPast(share.expira_en); return <li key={share.id} className="t-small text-ink">
        <p className="font-semibold">{shareLabels[share.estado] ?? share.estado}{version ? ` · versión ${version.version}` : ""}</p>
        <p className="text-ink-soft">{share.telefono} · {dateTime.format(new Date(share.confirmado_en ?? share.created_at))}</p>
        <p className="text-ink-soft">{share.aperturas ? `Enlace abierto ${share.aperturas} ${share.aperturas === 1 ? "vez" : "veces"}, la última el ${dateTime.format(new Date(share.abierto_en))}` : "Enlace aún no abierto"}{share.estado === "revocado" ? "" : expired ? " · vencido" : ` · vence ${dateTime.format(new Date(share.expira_en))}`}</p>
        {share.estado === "preparado" && !expired && ["borrador", "enviada"].includes(estado) ? <PendingShareActions id={id} shareId={share.id} /> : null}
        {["confirmado", "enviado", "entregado", "leido"].includes(share.estado) && !expired ? <RevokeShareButton id={id} shareId={share.id} /> : null}
      </li>; })}</ul>
      <p className="mt-2 t-small text-ink-soft">Una apertura indica que alguien abrió el enlace, no necesariamente el cliente.</p>
    </section> : null}
    {activity.entries.length ? <details className="rounded-panel border border-line bg-canvas"><summary className="min-h-11 cursor-pointer p-4 font-semibold text-ink">Historial</summary><ActivityList lines={toLines(activity.entries, user.id)} showLinks={false} /></details> : null}
    <section aria-labelledby="versions-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="versions-title" className="mb-2 font-semibold text-ink">Versiones</h2>
      {versions.length ? <ul className="space-y-1.5">{versions.map(version => <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 t-small"><span>Versión {version.version} · {version.origen === "aceptacion" ? "guardada al aceptar" : "enviada"} {dateTime.format(new Date(version.emitida_en))}</span><a className="text-brand underline underline-offset-4" href={`/api/admin/cotizaciones/${id}/pdf?version=${version.version}&inline=1`} target="_blank" rel="noreferrer">Ver PDF</a></li>)}</ul> : <p className="t-small text-ink-soft">{record.schemaReady ? "Aún no se ha enviado. Cada envío guarda una copia fija de lo que recibió el cliente." : "El historial de versiones se activa con docs/sql/quotations_v5.sql."}</p>}
    </section>

  </>;
  return <>
    <PageHeader back={{ href: "/admin/cotizaciones", label: "Cotizaciones" }} title={`${quotation.cliente_nombre} · ${quotation.destino}`} description={quotation.customer_id ? <Link className={textLink} href={`/admin/clientes/${quotation.customer_id}`}>Ver ficha del cliente</Link> : undefined} />
    {enmienda ? <p className="rounded-card border border-line bg-brand-tint p-4 text-ink">Enmienda creada en borrador. La cotización aceptada original no cambió. Actualice lo necesario, apruebe las condiciones y envíe esta nueva cotización al cliente.</p> : null}
    {amends && quotation.estado !== "aceptada" ? <p className="rounded-card border border-line bg-canvas p-4 text-ink">Enmienda de <Link className={textLink} href={`/admin/cotizaciones/${amends.id}`}>{amends.codigo}</Link>. Cuando el cliente la acepte, reemplazará a {amends.codigo}{amends.estado === "aceptada" ? " y, si ya tiene reserva, la reserva pasará a esta versión: nuevo total y servicios. Los pagos, facturas, pasajeros y el acceso a Mi viaje no cambian. No se aplica si la moneda o el cliente son otros, ni si el cliente ya pagó más que el nuevo total." : "."}</p> : null}
    {amends && quotation.estado === "aceptada" ? <p className="rounded-card border border-line bg-canvas p-4 text-ink">Esta enmienda reemplazó a <Link className={textLink} href={`/admin/cotizaciones/${amends.id}`}>{amends.codigo}</Link>.</p> : null}
    {duplicada ? <p className="rounded-card border border-line bg-brand-tint p-4 text-ink">Esta es una copia nueva en borrador. Actualice fechas, validez y precios, y vuelva a confirmar el itinerario y el equipaje.</p> : null}
    {expired ? <p role="alert" className="rounded-card border border-error/40 bg-canvas p-4 text-error">La validez de esta cotización venció el {dateTime.format(new Date(record.expiry))}. Actualícela antes de volver a enviarla; las versiones ya enviadas no cambian.</p> : null}
    {estado === "reemplazada" ? null : <CommercialLifecycle id={id} code={quotation.codigo} status={quotation.estado} needsReview={quotation.estado === "aceptada" && !lifecycle.data?.accepted_version_id} ready={!lifecycle.error} reservation={reservation.data} version={selected && frozen ? { id: selected.id, number: selected.version, customer: frozen.quotation.cliente_nombre, email: frozen.quotation.cliente_email, legacy: !versionId, total: formatMoney(Number(frozen.quotation.total), frozen.quotation.moneda) } : null} />}
    <QuotationEditor initial={draft} customers={(customers.data ?? []) as Customer[]} recentHotels={recentHotels} sidebar={sidebar} catalogs={catalogs}
      meta={{ codigo: quotation.codigo, estado: quotation.estado, estadoLabel: quotationStatusLabel(estado), expired, schemaReady: record.schemaReady, sent: versions.length > 0 || quotation.estado !== "borrador", converted: Boolean(reservation.data), share: { phone: normalizePhone(quotation.cliente_telefono ?? "") || (quotation.cliente_telefono ?? ""), message: defaultShareMessage({ nombre: quotation.cliente_nombre, codigo: quotation.codigo, destino: quotation.destino }) } }} />
  </>;
}
