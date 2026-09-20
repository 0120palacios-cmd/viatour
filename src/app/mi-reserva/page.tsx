import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { CalendarDays, Download, LogOut, MessageCircle } from "lucide-react";
import { PortalAccessForm } from "@/components/portal/access-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalReservation } from "@/lib/portal-data";
import { portalCookieName, verifyPortalCookie } from "@/lib/portal";
import { formatMoney, invoiceStatusLabel, paymentMethodLabel, reservationStatusLabel, type ReservationStatus } from "@/lib/reservation-types";
import { signOutReservation } from "./actions";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi reserva",
  description: "Consulte los detalles de su reserva con viatour.",
  robots: { index: false, follow: false },
};

const steps: Array<{ key: Exclude<ReservationStatus, "cancelada">; label: string }> = [
  { key: "pendiente", label: "Pendiente" },
  { key: "confirmada", label: "Confirmada" },
  { key: "en_curso", label: "En curso" },
  { key: "completada", label: "Completada" },
];

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`)) : "Por confirmar";
}

function statusClass(status: ReservationStatus) {
  return ({ pendiente: "bg-surface text-ink-soft", confirmada: "bg-brand-tint text-brand-deep", en_curso: "bg-brand-tint text-brand-deep", completada: "bg-surface text-success", cancelada: "bg-surface text-error" } as Record<ReservationStatus, string>)[status];
}

function maskedReference(value: string | null) {
  if (!value) return "No disponible";
  const clean = value.trim();
  return clean.length > 4 ? `****${clean.slice(-4)}` : "****";
}

function AccessPanel() {
  return (
    <section className="mx-auto max-w-xl rounded-panel border bg-canvas p-6 shadow-sm sm:p-8" aria-labelledby="portal-access-title">
      <p className="t-small text-brand">Acceso a su reserva</p>
      <h1 id="portal-access-title" className="t-h1 mt-2">Consulte su viaje</h1>
      <p className="mt-4 text-ink-soft">Ingrese el código de reserva y su apellido para ver la información que corresponde únicamente a su reserva.</p>
      <div className="mt-8"><PortalAccessForm /></div>
    </section>
  );
}

function StatusProgress({ status }: { status: ReservationStatus }) {
  const currentIndex = steps.findIndex(step => step.key === status);
  return (
    <div className="space-y-4" aria-label={`Progreso de la reserva: ${reservationStatusLabel(status)}`}>
      <div className="flex items-center justify-between gap-2" aria-hidden="true">
        {steps.map((step, index) => {
          const active = status !== "cancelada" && currentIndex >= index;
          return <div key={step.key} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"><span className={`size-3 shrink-0 rounded-full border-2 ${active ? "border-brand bg-brand" : "border-line bg-canvas"}`} /><span className={`t-small hidden sm:block ${active ? "font-semibold text-brand-deep" : "text-ink-soft"}`}>{step.label}</span>{index < steps.length - 1 ? <span className={`h-px min-w-3 flex-1 ${active && currentIndex > index ? "bg-brand" : "bg-line"}`} /> : null}</div>;
        })}
      </div>
      <p className={`inline-flex rounded-btn px-3 py-1 t-small ${statusClass(status)}`}>{reservationStatusLabel(status)}</p>
    </div>
  );
}

async function PortalView({ reservationId }: { reservationId: string }) {
  const record = await getPortalReservation(createAdminClient(), reservationId);
  if (!record) return <AccessPanel />;
  const paid = record.payments.filter(payment => payment.moneda === record.reservation.moneda).reduce((sum, payment) => sum + Number(payment.monto), 0);
  const balance = Math.max(0, Number(record.reservation.total) - paid);
  const whatsappUrl = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`Hola, necesito un cambio en mi reserva ${record.reservation.codigo}.`)}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="t-small text-brand">Código de reserva</p>
          <h1 className="t-h1 mt-2">{record.reservation.codigo}</h1>
          <p className="mt-3 text-ink-soft">{record.reservation.destino}</p>
        </div>
        <form action={signOutReservation}><button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-btn border border-line px-6 py-3 font-semibold text-ink hover:bg-surface"><LogOut size={18} strokeWidth={1.75} aria-hidden="true" />Salir</button></form>
      </div>

      <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="portal-status-heading">
        <div className="mb-8 flex items-start justify-between gap-4"><div><h2 id="portal-status-heading" className="t-h2">Estado de su reserva</h2><p className="mt-2 text-ink-soft">Revise el avance de su viaje.</p></div><span className={`rounded-btn px-3 py-1 t-small ${statusClass(record.reservation.estado)}`}>{reservationStatusLabel(record.reservation.estado)}</span></div>
        <StatusProgress status={record.reservation.estado} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Fechas de la reserva">
        <div className="rounded-card border bg-canvas p-6"><p className="t-small text-ink-soft">Fecha de inicio</p><p className="mt-2 flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-brand" strokeWidth={1.75} aria-hidden="true" />{dateLabel(record.reservation.fecha_inicio)}</p></div>
        <div className="rounded-card border bg-canvas p-6"><p className="t-small text-ink-soft">Fecha de finalización</p><p className="mt-2 flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-brand" strokeWidth={1.75} aria-hidden="true" />{dateLabel(record.reservation.fecha_fin)}</p></div>
      </section>

      <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="portal-items-heading">
        <h2 id="portal-items-heading" className="t-h2">Detalle de su viaje</h2>
        <div className="mt-6 overflow-x-auto rounded-card border bg-canvas"><table className="w-full min-w-[480px] text-left"><caption className="sr-only">Servicios incluidos en su reserva</caption><thead className="bg-brand-tint text-brand-deep"><tr><th className="p-4">Descripción</th><th className="p-4 text-right">Cantidad</th></tr></thead><tbody>{record.items.map(item => <tr key={item.id ?? `${item.descripcion}-${item.orden}`} className="border-t border-line"><td className="p-4">{item.descripcion}</td><td className="p-4 text-right">{item.cantidad}</td></tr>)}{!record.items.length ? <tr><td className="p-4 text-ink-soft" colSpan={2}>No hay ítems disponibles para mostrar.</td></tr> : null}</tbody></table></div>
        <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2"><div><p className="t-small text-ink-soft">Total</p><p className="t-h2 mt-1">{formatMoney(Number(record.reservation.total), record.reservation.moneda)}</p></div><div><p className="t-small text-ink-soft">Saldo</p><p className={`t-h2 mt-1 ${balance <= 0 ? "text-success" : "text-brand-deep"}`}>{balance <= 0 ? "Pagado" : formatMoney(balance, record.reservation.moneda)}</p></div></div>
      </section>

      <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="portal-payments-heading">
        <h2 id="portal-payments-heading" className="t-h2">Pagos</h2>
        <div className="mt-6 overflow-x-auto rounded-card border bg-canvas"><table className="w-full min-w-[620px] text-left"><caption className="sr-only">Pagos registrados de su reserva</caption><thead className="bg-brand-tint text-brand-deep"><tr><th className="p-4">Fecha</th><th className="p-4">Método</th><th className="p-4 text-right">Monto</th><th className="p-4">Referencia</th></tr></thead><tbody>{record.payments.map(payment => <tr key={payment.id} className="border-t border-line"><td className="p-4">{dateLabel(payment.fecha_pago)}</td><td className="p-4">{paymentMethodLabel(payment.metodo)}</td><td className="p-4 text-right font-semibold">{formatMoney(Number(payment.monto), payment.moneda)}</td><td className="p-4">{maskedReference(payment.referencia)}</td></tr>)}{!record.payments.length ? <tr><td className="p-4 text-ink-soft" colSpan={4}>Aún no hay pagos registrados.</td></tr> : null}</tbody></table></div>
      </section>

      <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="portal-invoices-heading">
        <h2 id="portal-invoices-heading" className="t-h2">Facturas</h2>
        <div className="mt-6 space-y-4">{record.invoices.map(invoice => <article key={invoice.id} className="flex flex-col gap-4 rounded-card border bg-canvas p-6 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="t-h3">{invoice.numero}</h3><p className="t-small text-ink-soft">Emisión: {dateLabel(invoice.fecha_emision)} · Estado: {invoiceStatusLabel(invoice.estado)}</p></div><Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-btn border border-brand px-6 py-3 font-semibold text-brand hover:bg-brand-tint" href={`/api/mi-reserva/facturas/${invoice.id}/pdf`}><Download size={18} strokeWidth={1.75} aria-hidden="true" />Descargar PDF</Link></article>)}{!record.invoices.length ? <p className="rounded-card border bg-canvas p-6 text-ink-soft">No hay facturas disponibles para esta reserva.</p> : null}</div>
      </section>

      <section className="rounded-panel border border-wa bg-surface p-6 sm:p-8" aria-labelledby="portal-help-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="portal-help-heading" className="t-h2">¿Necesita un cambio?</h2><p className="mt-2 text-ink-soft">Escríbanos y su asesor revisará su solicitud.</p></div><a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-btn bg-wa px-6 py-3 font-semibold text-ink hover:bg-wa-deep" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />Escríbanos</a></div></section>
    </div>
  );
}

export default async function MiReservaPage() {
  const cookie = (await cookies()).get(portalCookieName)?.value;
  const reservationId = verifyPortalCookie(cookie);
  return <main className="container-site section-space"><div className="mx-auto max-w-6xl">{reservationId ? <PortalView reservationId={reservationId} /> : <AccessPanel />}</div></main>;
}
