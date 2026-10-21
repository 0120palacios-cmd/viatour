import { travelServices } from "@/lib/travel-services";
import { SendReceipt } from "@/components/admin/send-receipt";
import Link from "next/link";
import { TravelEditor } from "@/components/admin/travel-editor";
import { getTravel } from "@/lib/travel-data";
import { getReceipts } from "@/lib/receipt-data";
import { ReceiptAction } from "@/components/admin/receipt-action";
import { SendItinerary } from "@/components/admin/send-itinerary";
import { SendItineraryTest } from "@/components/admin/send-itinerary-test";
import { PurgeTravel } from "@/components/admin/purge-travel";
import { ticketingLabels } from "@/lib/travel-operations";
import { ReservationServices } from "@/components/reservation-services";
import { FileText, Mail, Phone, UserRound } from "lucide-react";
import { formatDay, PageHeader, Panel, StatusBadge, textLink } from "@/components/admin/ui";
import { invoiceTone, reservationTone } from "@/lib/admin-status";
import { requireAdmin } from "@/lib/admin";
import { getAdminReservation } from "@/lib/reservation-data";
import { formatMoney, invoiceStatusLabel, paymentMethodLabel, reservationStatusLabel } from "@/lib/reservation-types";
import { PromoteReservationForm } from "@/components/admin/commercial-lifecycle";
import { ReservationBuilder } from "@/components/admin/reservation-builder";
import { InvoiceActions, InvoiceCreateForm, PaymentForm } from "@/components/admin/reservation-actions";
import { noindexMetadata } from "@/lib/seo";
import { ReservationDocuments } from "@/components/admin/reservation-documents";
import { listReservationDocuments, portalDocsBucket } from "@/lib/portal-documents";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { return noindexMetadata(`viatour | Reserva ${(await params).id}`, "Detalle privado de una reserva de viatour."); }

const sections = [["datos", "Datos y servicios"], ["documentos", "Documentos"], ["pagos", "Pagos"], ["facturas", "Facturas"]] as const;

// One reservation: a summary column (balance, dates, customer, origin) beside the working sections,
// which keep their own forms and actions.
export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  const record = await getAdminReservation(client, id);
  if (!record) return <><PageHeader title="Reserva no encontrada" back={{ href: "/admin/reservas", label: "Reservas" }} /><p className="rounded-card border border-line bg-canvas p-6">No se encontrÃ³ la reserva. Puede que el enlace estÃ© incompleto.</p></>;
  const { reservation } = record;
  const travel = await getTravel(client, id, true);
  const receipts = await getReceipts(client, id);
  const deliveries = await client.from("travel_deliveries").select("id,revision,receipt_id,status,created_at,provider_id").eq("reservation_id",id).order("created_at",{ascending:false});
  const history = await client.from("reservation_travel_history").select("revision,public_data,changed_by,created_at").eq("reservation_id",id).order("revision",{ascending:true});
  // Payments in another currency are listed but not subtracted (same rule as the lists).
  const paid = record.payments.filter(payment => payment.moneda === reservation.moneda).reduce((sum, payment) => sum + Number(payment.monto), 0);
  const balance = Math.round((Number(reservation.total) - paid) * 100) / 100;
  const otherCurrency = record.payments.some(payment => payment.moneda !== reservation.moneda);
  // Listed with the admin session; returns nothing until docs/sql/portal_docs_admin.sql has been run.
  const documents = await listReservationDocuments(client.storage.from(portalDocsBucket), reservation.id).catch(() => []);

  const summary = <div className="space-y-4">
    <section aria-labelledby="balance-title" className="rounded-card border border-line bg-canvas p-4 sm:p-6">
      <h2 id="balance-title" className="t-small text-ink-soft">Saldo pendiente</h2>
      <p className={`t-h2 tabular-nums ${balance <= 0 && reservation.estado !== "cancelada" ? "text-success" : ""}`}>{reservation.estado === "cancelada" ? "Cancelada" : balance <= 0 ? "Pagada" : formatMoney(balance, reservation.moneda)}</p>
      <dl className="t-small mt-3 space-y-1">
        <div className="flex justify-between gap-4"><dt className="text-ink-soft">Total</dt><dd className="tabular-nums">{formatMoney(Number(reservation.total), reservation.moneda)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-ink-soft">Pagado</dt><dd className="tabular-nums">{formatMoney(paid, reservation.moneda)}</dd></div>
      </dl>
      {otherCurrency ? <p className="t-small mt-3 text-ink-soft">Hay pagos en otra moneda; no se restan del saldo.</p> : null}
      <a href="#pagos" className={`t-small mt-3 inline-block ${textLink}`}>Registrar pago</a>
    </section>
    <section aria-labelledby="trip-title" className="rounded-card border border-line bg-canvas p-4 sm:p-6">
      <h2 id="trip-title" className="t-small text-ink-soft">Viaje</h2>
      <dl className="mt-2 space-y-2">
        <div><dt className="t-small text-ink-soft">Inicio</dt><dd className="font-semibold">{formatDay(reservation.fecha_inicio)}</dd></div>
        <div><dt className="t-small text-ink-soft">Fin</dt><dd className="font-semibold">{formatDay(reservation.fecha_fin)}</dd></div>
      </dl>
    </section>
    <section aria-labelledby="customer-title" className="rounded-card border border-line bg-canvas p-4 sm:p-6">
      <h2 id="customer-title" className="t-small text-ink-soft">Cliente</h2>
      <ul className="t-small mt-2 space-y-2">
        <li className="flex items-center gap-2 font-semibold text-ink"><UserRound size={16} strokeWidth={1.75} aria-hidden="true" className="text-ink-soft" />{reservation.cliente_nombre}</li>
        <li className="flex items-center gap-2"><Mail size={16} strokeWidth={1.75} aria-hidden="true" className="text-ink-soft" /><a className="break-all hover:text-brand" href={`mailto:${reservation.cliente_email}`}>{reservation.cliente_email}</a></li>
        {reservation.cliente_telefono ? <li className="flex items-center gap-2"><Phone size={16} strokeWidth={1.75} aria-hidden="true" className="text-ink-soft" />{reservation.cliente_telefono}</li> : null}
      </ul>
      <p className="t-small mt-3 flex flex-col gap-1">
        {reservation.customer_id ? <Link className={textLink} href={`/admin/clientes/${reservation.customer_id}`}>Ver ficha del cliente</Link> : null}
        {reservation.quotation_id ? <Link className={textLink} href={`/admin/cotizaciones/${reservation.quotation_id}`}>Ver cotizaciÃ³n de origen</Link> : null}
      </p>
    </section>
  </div>;

  return <>
    <PageHeader back={{ href: "/admin/reservas", label: "Reservas" }} eyebrow={<span className="inline-flex items-center gap-2">{reservation.codigo}<StatusBadge tone={reservationTone[reservation.estado]}>{reservationStatusLabel(reservation.estado)}</StatusBadge></span>} title={`${reservation.cliente_nombre} Â· ${reservation.destino}`} />
    <section className="space-y-4 rounded-panel border border-line bg-canvas p-4"><h2 className="t-h3">{reservation.prerreserva ? "PrerreservaciÃ³n" : "Reserva"}</h2><p>Proveedor: {reservation.supplier_status ?? "Pendiente de verificar"}</p><p className="t-small">Asesor responsable: {reservation.agente_id}</p><div className="flex flex-wrap gap-4"><a className={textLink} href={`/api/admin/reservas/${id}/pdf`}>Descargar PDF de reservaciÃ³n</a><a className={textLink} href="/mi-reserva" target="_blank" rel="noreferrer">Abrir acceso al portal</a><a className={textLink} href="#facturas">Generar factura</a></div>{reservation.prerreserva && reservation.estado === "pendiente" ? <PromoteReservationForm id={id} /> : null}<p className="t-small text-ink-soft">Acceso del cliente: referencia {reservation.codigo}, apellido registrado {reservation.cliente_apellido || "pendiente"} y cÃ³digo de verificaciÃ³n por correo.</p></section>
    <nav aria-label="Secciones de la reserva" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="chip-row flex gap-2">{sections.map(([anchor, label]) => <li key={anchor}><a href={`#${anchor}`} className="t-small inline-flex min-h-10 items-center whitespace-nowrap rounded-btn border border-line bg-canvas px-3 text-ink-soft hover:border-brand hover:text-brand">{label}</a></li>)}</ul></nav>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="order-2 min-w-0 space-y-6 xl:order-1">
        {reservation.accepted_snapshot ? <section className="space-y-4 rounded-panel border border-line bg-canvas p-6"><h2 className="t-h3">Servicios de la versiÃ³n aceptada</h2><ReservationServices value={reservation.accepted_snapshot.quotation.detalles} />{reservation.quotation_id ? <a className={textLink} href={`/api/admin/cotizaciones/${reservation.quotation_id}/pdf?version=${reservation.accepted_snapshot.quotation.version}&inline=1`}>Ver versiÃ³n aceptada</a> : null}</section> : null}
        <section className="rounded-panel border border-line bg-canvas p-6"><h2 className="t-h3">Itinerario de viaje</h2><details className="mt-4"><summary className="min-h-11 cursor-pointer text-brand">Vista previa del itinerario guardado</summary><iframe loading="lazy" title="Vista previa del itinerario" className="mt-4 h-[720px] w-full rounded-card border border-line" src={`/api/admin/reservas/${id}/itinerario?inline=1`}/></details><div className="mt-4 flex flex-wrap gap-4"><a className={textLink} href={`/api/admin/reservas/${id}/itinerario`}>Descargar itinerario</a><a className={textLink} href={`/api/admin/reservas/${id}/itinerario?format=ics`}>Descargar calendario</a><a className={textLink} href="#pasajeros">Completar pasajeros y emisiÃ³n</a></div><p className="t-small mt-4 text-ink-soft">Guarde el expediente antes de descargar. El documento no incluye precios ni datos de identificaciÃ³n.</p></section>
        <section className="rounded-panel border border-line bg-canvas p-6"><h2 className="t-h3">EnvÃ­o de documentos</h2><a
  className={textLink}
  href={`/admin/reservas/${id}/client-preview`}
  target="_blank"
  rel="noopener noreferrer"
>
  Vista como cliente
</a><SendItineraryTest id={id}/><SendItinerary id={id} email={reservation.cliente_email} enabled={process.env.TRAVEL_EMAIL_ENABLED === "true" && !!travel.data}/><ul className="mt-4 space-y-2">{(deliveries.data??[]).map(d=><li key={d.id} className="t-small">{d.receipt_id ? "Recibo" : `Itinerario Â· RevisiÃ³n ${d.revision}`} Â· {d.status} Â· {formatDay(d.created_at)}{d.provider_id?" Â· ConfirmaciÃ³n del proveedor registrada":""}</li>)}</ul></section>
        <TravelEditor id={id} initial={travel.privateData} revision={travel.revision} available={travel.available} hasFlights={travelServices(reservation.accepted_snapshot?.quotation.detalles).vuelos.journeys.some(j=>j.segmentos.length)} />
        {travel.privateData ? <PurgeTravel id={id}/> : null}
        {history.data?.length ? <details className="rounded-panel border border-line bg-canvas p-6"><summary className="min-h-11 cursor-pointer font-semibold">Historial del expediente</summary><ol className="space-y-4 border-l border-line pl-4">{history.data.map(event=><li key={event.revision}><p className="font-semibold">RevisiÃ³n {event.revision} Â· {ticketingLabels[event.public_data.status as keyof typeof ticketingLabels]??"Expediente actualizado"}</p><p className="t-small text-ink-soft">{formatDay(event.created_at)} Â· Responsable: {event.changed_by}</p></li>)}</ol></details> : null}
        <section className="space-y-4 rounded-panel border border-line bg-canvas p-6"><h2 className="t-h3">Recibos de pagos registrados</h2>{receipts.map(receipt=><div key={receipt.id}><a className={textLink} href={`/api/admin/recibos/${receipt.id}`}>{receipt.number} Â· Descargar recibo</a><SendReceipt id={receipt.id} email={reservation.cliente_email} enabled={process.env.TRAVEL_EMAIL_ENABLED === "true"}/></div>)}{record.payments.map(payment=><div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"><p>{formatDay(payment.fecha_pago)} Â· {formatMoney(Number(payment.monto),payment.moneda)}</p><ReceiptAction id={payment.id}/></div>)}</section>
        <div id="datos" className="scroll-mt-6"><ReservationBuilder reservation={reservation} items={record.items} /></div>
        <div id="documentos" className="scroll-mt-6"><ReservationDocuments reservationId={reservation.id} documents={documents} /></div>
        <div id="pagos" className="scroll-mt-6"><Panel id="payments-heading" title="Pagos" description="Registros administrativos de lo recibido. En este sitio no se procesan tarjetas.">
          {record.payments.length ? <div className="overflow-x-auto"><table className="t-small w-full min-w-[560px] text-left"><caption className="sr-only">Pagos registrados de la reserva</caption><thead className="text-ink-soft"><tr className="border-b border-line"><th scope="col" className="px-4 py-3 font-semibold sm:px-6">Fecha</th><th scope="col" className="px-4 py-3 font-semibold">Monto</th><th scope="col" className="px-4 py-3 font-semibold">MÃ©todo</th><th scope="col" className="px-4 py-3 font-semibold">Referencia</th><th scope="col" className="px-4 py-3 font-semibold sm:pr-6">Notas</th></tr></thead><tbody>{record.payments.map(payment => <tr key={payment.id} className="border-t border-line first:border-t-0"><td className="px-4 py-3 sm:px-6">{formatDay(payment.fecha_pago)}</td><td className="px-4 py-3 font-semibold tabular-nums">{formatMoney(Number(payment.monto), payment.moneda)}</td><td className="px-4 py-3">{paymentMethodLabel(payment.metodo)}</td><td className="px-4 py-3 break-all">{payment.referencia || "â€”"}</td><td className="px-4 py-3 sm:pr-6">{payment.notas || "â€”"}</td></tr>)}</tbody></table></div> : <p className="px-4 pt-4 text-ink-soft sm:px-6">AÃºn no hay pagos registrados.</p>}
          <div className="border-t border-line p-4 sm:p-6"><h3 className="mb-4 font-semibold">Registrar un pago</h3><PaymentForm reservation={reservation} requestId={crypto.randomUUID()} /></div>
        </Panel></div>
        <div id="facturas" className="scroll-mt-6"><Panel id="invoices-heading" title="Facturas" description="Cada factura copia los servicios y precios actuales de la reserva.">
          {record.invoices.length ? <ul className="divide-y divide-line">{record.invoices.map(invoice => <li key={invoice.id} className="space-y-4 p-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex flex-wrap items-center gap-2 font-semibold"><FileText size={16} strokeWidth={1.75} aria-hidden="true" className="text-brand" /><Link className="hover:text-brand" href={`/admin/facturacion/${invoice.id}`}>{invoice.numero}</Link><StatusBadge tone={invoiceTone[invoice.estado]}>{invoiceStatusLabel(invoice.estado)}</StatusBadge></p><p className="t-small text-ink-soft">EmisiÃ³n {formatDay(invoice.fecha_emision)} Â· Vencimiento {formatDay(invoice.fecha_vencimiento)}</p></div><p className="font-semibold tabular-nums">{formatMoney(Number(invoice.total), invoice.moneda)}</p></div>
            <InvoiceActions invoice={invoice} />
          </li>)}</ul> : null}
          <div className="border-t border-line p-4 first:border-t-0 sm:p-6">{reservation.prerreserva || reservation.estado === "cancelada" ? <p>Convierta la prerreservaciÃ³n en una reserva activa antes de generar la factura.</p> : <InvoiceCreateForm reservationId={reservation.id} />}</div>
        </Panel></div>
      </div>
      <aside aria-label="Resumen de la reserva" className="order-1 xl:sticky xl:top-6 xl:order-2 xl:self-start">{summary}</aside>
    </div>
  </>;
}



