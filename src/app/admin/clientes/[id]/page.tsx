import { notFound } from "next/navigation";
import { CalendarDays, FileText, Mail, MessageCircle, Phone } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { CustomerForm } from "@/components/admin/customer-form";
import { NewQuotationMenu } from "@/components/admin/new-quotation-menu";
import { formatDay, PageHeader, Panel, RecordRow, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { quotationTone, reservationTone } from "@/lib/admin-status";
import { customerWhatsappHref } from "@/lib/lead-admin";
import { formatQuotationAmount, quotationStatusLabel, type QuotationStatus } from "@/lib/quotation-types";
import { formatMoney, reservationStatusLabel, type ReservationStatus } from "@/lib/reservation-types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/clientes/${(await params).id}`, "viatour | Cliente", "Ficha de un cliente en la administración privada de viatour.");
}

// The customer's profile: contact, every quotation and reservation linked to them, and the form to
// edit their data. Quotations made before the customer existed are linked by the editor on save.
export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const { creado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [result, quotations, reservations] = await Promise.all([
    client.from("customers").select("id,nombre,email,telefono,notas,created_at").eq("id", id).maybeSingle(),
    client.from("quotations").select("id,codigo,destino,moneda,total,estado,created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    client.from("reservations").select("id,codigo,destino,moneda,total,estado,fecha_inicio").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (result.error) throw new Error("No se pudo cargar el cliente.");
  if (!result.data) notFound();
  const customer = result.data;
  const phone = String(customer.telefono ?? "");
  const whatsapp = phone ? customerWhatsappHref(phone, `Hola ${customer.nombre}, le saluda su asesor de viatour.`) : "";

  return <>
    <PageHeader back={{ href: "/admin/clientes", label: "Clientes" }} eyebrow={`Cliente desde ${formatDay(String(customer.created_at))}`} title={String(customer.nombre)}
      actions={<><NewQuotationMenu query={`cliente=${id}`} label="Cotizar para este cliente" />{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-btn bg-wa px-5 font-semibold text-ink hover:bg-wa-deep"><MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />WhatsApp</a> : null}</>} />
    {creado ? <p role="status" className="rounded-card border border-line bg-brand-tint p-4">Cliente creado. Ya puede prepararle una cotización.</p> : null}
    <ul className="t-small flex flex-wrap gap-x-6 gap-y-2 text-ink-soft">
      <li className="inline-flex items-center gap-2"><Mail size={16} strokeWidth={1.75} aria-hidden="true" /><a className="break-all text-ink hover:text-brand" href={`mailto:${customer.email}`}>{String(customer.email)}</a></li>
      {phone ? <li className="inline-flex items-center gap-2"><Phone size={16} strokeWidth={1.75} aria-hidden="true" /><a className="text-ink hover:text-brand" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></li> : null}
    </ul>
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Cotizaciones" description={quotations.data?.length ? `${quotations.data.length} vinculadas a este cliente.` : undefined}>
        {!quotations.data?.length ? <p className="p-6 text-ink-soft">{quotations.error ? "No se pudieron cargar las cotizaciones." : "Este cliente todavía no tiene cotizaciones."}</p> : <ul className="divide-y divide-line">{quotations.data.map(row => <RecordRow key={String(row.id)} href={`/admin/cotizaciones/${row.id}`} icon={<FileText size={18} strokeWidth={1.75} />} title={String(row.destino)} badges={<StatusBadge tone={quotationTone[row.estado as QuotationStatus]}>{quotationStatusLabel(row.estado as QuotationStatus)}</StatusBadge>} meta={`${row.codigo} · ${formatDay(String(row.created_at))}`} aside={<span className="t-small font-semibold tabular-nums">{formatQuotationAmount(Number(row.total), row.moneda as "USD" | "HNL")}</span>} />)}</ul>}
      </Panel>
      <Panel title="Reservas" description={reservations.data?.length ? `${reservations.data.length} vinculadas a este cliente.` : undefined}>
        {!reservations.data?.length ? <p className="p-6 text-ink-soft">{reservations.error ? "No se pudieron cargar las reservas." : "Este cliente todavía no tiene reservas."}</p> : <ul className="divide-y divide-line">{reservations.data.map(row => <RecordRow key={String(row.id)} href={`/admin/reservas/${row.id}`} icon={<CalendarDays size={18} strokeWidth={1.75} />} title={String(row.destino)} badges={<StatusBadge tone={reservationTone[row.estado as ReservationStatus]}>{reservationStatusLabel(row.estado as ReservationStatus)}</StatusBadge>} meta={`${row.codigo} · ${row.fecha_inicio ? `Inicia ${formatDay(String(row.fecha_inicio))}` : "Fechas por definir"}`} aside={<span className="t-small font-semibold tabular-nums">{formatMoney(Number(row.total), row.moneda as "USD" | "HNL")}</span>} />)}</ul>}
      </Panel>
    </div>
    <Panel title="Datos del cliente" description="Los cambios aplican a las cotizaciones nuevas. Las cotizaciones y versiones ya enviadas conservan los datos con que se prepararon.">
      <div className="p-4 sm:p-6"><CustomerForm row={customer} compact /></div>
    </Panel>
  </>;
}
