import { travelServices } from "@/lib/travel-services";
import type { Metadata } from "next";
import { getTravel } from "@/lib/travel-data";
import { TravelSummary } from "@/components/travel-summary";
import { getReceipts } from "@/lib/receipt-data";
import { ReservationServices } from "@/components/reservation-services";
import { cookies } from "next/headers";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CalendarDays, Download, FileText, LifeBuoy, LogOut, Mail, Map, MessageCircle, Phone, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { TrackedLink } from "@/components/tracked-link";
import { localizedPageMetadata } from "@/lib/seo";
import { PortalAccessForm, PortalSignedIn } from "@/components/portal/access-form";
import { DocumentUploadForm } from "@/components/portal/document-upload-form";
import { TicketPanel } from "@/components/portal/ticket-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalDocuments, getPortalReservation, type PortalDocument } from "@/lib/portal-data";
import { portalCookieName, portalPendingCookieName, verifyPortalCookie, verifyPortalPendingCookie } from "@/lib/portal";
import { hondurasToday, nextStep, tripTiming } from "@/lib/portal-summary";
import { formatMoney, invoiceStatusLabel, paymentMethodLabel, type ReservationStatus } from "@/lib/reservation-types";
import { signOutReservation } from "./actions";
import { siteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { ...(await localizedPageMetadata("/mi-reserva", "reservation")), robots: { index: false, follow: false } }; }
function statusKey(status: ReservationStatus) { return ({ pendiente: "pending", confirmada: "confirmed", en_curso: "inProgress", completada: "completed", cancelada: "cancelled" } as Record<ReservationStatus, string>)[status]; }
function dateLabel(value: string | null, locale: string, fallback: string) { return value ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-HN", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : fallback; }
function statusClass(status: ReservationStatus) { return ({ pendiente: "bg-surface text-ink-soft", confirmada: "bg-brand-tint text-brand-deep", en_curso: "bg-brand-tint text-brand-deep", completada: "bg-surface text-success", cancelada: "bg-surface text-error" } as Record<ReservationStatus, string>)[status]; }
function maskedReference(value: string | null, fallback: string) { if (!value) return fallback; const clean = value.trim(); return clean.length > 4 ? `****${clean.slice(-4)}` : "****"; }
function AccessPanel({ showOtp = false }: { showOtp?: boolean }) { const t = useTranslations("portal"); return <section className="mx-auto max-w-xl rounded-panel border bg-canvas p-6 shadow-sm sm:p-8" aria-labelledby="portal-access-title"><p className="t-small text-brand">{t("accessEyebrow")}</p><h1 id="portal-access-title" className="t-h1 mt-2">{t("accessTitle")}</h1><p className="mt-4 text-ink-soft">{t("accessBody")}</p><div className="mt-8"><PortalAccessForm showOtp={showOtp} /></div></section>; }
function StatusProgress({ status }: { status: ReservationStatus }) { const t = useTranslations("portal"); const steps = [{ key: "pendiente", label: t("pending") }, { key: "confirmada", label: t("confirmed") }, { key: "en_curso", label: t("inProgress") }, { key: "completada", label: t("completed") }] as const; const currentIndex = steps.findIndex(step => step.key === status); const label = t(statusKey(status)); return <div className="space-y-3" aria-label={t("progress", { status: label })}><p className={`inline-flex rounded-btn px-3 py-1 t-small ${statusClass(status)}`}>{label}</p><div className="flex items-center justify-between gap-2" aria-hidden="true">{steps.map((step, index) => { const active = status !== "cancelada" && currentIndex >= index; return <div key={step.key} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"><span className={`size-3 shrink-0 rounded-full border-2 ${active ? "border-brand bg-brand" : "border-line bg-canvas"}`} />{index < steps.length - 1 ? <span className={`h-px min-w-3 flex-1 ${active && currentIndex > index ? "bg-brand" : "bg-line"}`} /> : null}</div>; })}</div></div>; }

const panel = "rounded-panel border border-line bg-canvas p-6 sm:p-8";
const linkClass = "t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline";

function DocumentList({ documents, empty, locale, sentOn, open }: { documents: PortalDocument[]; empty: string; locale: string; sentOn: (date: string) => string; open: string }) {
  if (!documents.length) return <p className="t-small rounded-card border border-line bg-surface p-4 font-normal text-ink-soft">{empty}</p>;
  return <ul className="space-y-2">{documents.map(document => <li key={document.path}>
    {/* The link goes to the API, which checks the session and redirects to a URL signed at that moment. */}
    <a href={`/api/mi-reserva/documentos?ruta=${encodeURIComponent(document.path)}`} target="_blank" rel="noopener noreferrer" className="group flex min-h-14 items-center gap-3 rounded-card border border-line bg-canvas p-3 transition-colors duration-(--duration-fast) ease-out hover:border-brand">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><FileText size={20} strokeWidth={1.75} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="t-small block break-words font-semibold text-ink group-hover:text-brand">{document.source === "agency" ? document.name : sentOn(dateLabel(document.createdAt, locale, ""))}</span></span>
      <span className="t-small shrink-0 text-brand">{open}</span>
    </a>
  </li>)}</ul>;
}

async function PortalView({ reservationId }: { reservationId: string }) {
  const t = await getTranslations("portal"); const v4 = await getTranslations("v4.portal"); const locale = await getLocale();
  const client = createAdminClient();
  const record = await getPortalReservation(client, reservationId);
  if (!record) return <AccessPanel />;
  const { reservation } = record;
  const travel = await getTravel(client, reservationId);
  const receipts = await getReceipts(client, reservationId);
  const documents = await getPortalDocuments(client, reservationId);
  const agencyDocuments = documents.filter(document => document.source === "agency");
  const customerDocuments = documents.filter(document => document.source === "customer");
  const paid = record.payments.filter(payment => payment.moneda === reservation.moneda).reduce((sum, payment) => sum + Number(payment.monto), 0);
  const balance = Math.max(0, Number(reservation.total) - paid);
  const whatsappUrl = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(v4("whatsappMessage", { code: reservation.codigo }))}`;
  const timing = tripTiming(reservation.fecha_inicio, reservation.fecha_fin, hondurasToday());
  const timingLabel = timing.kind === "upcoming" ? v4("daysLeft", { days: timing.days }) : timing.kind === "today" ? v4("today") : timing.kind === "ongoing" ? v4("ongoing") : timing.kind === "ended" ? v4("ended", { date: dateLabel(timing.date, locale, "") }) : null;
  const step = nextStep({ status: reservation.estado, balance, agencyDocuments: agencyDocuments.length });
  const stepText = step === "balance" ? v4("nextBalance", { amount: formatMoney(balance, reservation.moneda) }) : v4(({ cancelled: "nextCancelled", pending: "nextPending", documents: "nextDocuments", ready: "nextReady" } as const)[step]);
  const dates = reservation.fecha_inicio ? `${dateLabel(reservation.fecha_inicio, locale, "")}${reservation.fecha_fin && reservation.fecha_fin !== reservation.fecha_inicio ? ` – ${dateLabel(reservation.fecha_fin, locale, "")}` : ""}` : t("toConfirm");

  return <div className="space-y-8">
    <PortalSignedIn />
    <section className="space-y-3 rounded-panel border border-line bg-canvas p-6"><h2 className="t-h2">Mis reservaciones</h2><p>{reservation.prerreserva ? "Prerreservación" : "Reserva"} · {reservation.codigo}</p><p className="t-small text-ink-soft">Confirmación del proveedor: {({ pendiente: "pendiente", parcial: "parcial", confirmada: "confirmada", emitida: "boletos emitidos" } as Record<string, string>)[reservation.supplier_status ?? "pendiente"]}. Este acceso muestra únicamente la reservación verificada.</p><a className="inline-flex min-h-12 items-center font-semibold text-brand underline" href="/api/mi-reserva/pdf">Ver o descargar PDF de reservación</a></section>
    {/* The trip first: destination, when, status and money in one band, then the single next step. */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0"><p className="t-small text-brand">{v4("reservationLabel", { code: reservation.codigo })}</p><h1 className="t-h1 mt-2 break-words">{reservation.destino}</h1>{timingLabel && <p className="t-body-lg mt-2 text-ink-soft">{timingLabel}</p>}</div>
      <form action={signOutReservation}><button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-btn border border-line px-5 py-3 font-semibold text-ink hover:bg-surface"><LogOut size={18} strokeWidth={1.75} aria-hidden="true" />{t("signOut")}</button></form>
    </div>
    <section aria-label={t("status")} className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
      <div className="space-y-2 bg-canvas p-5 sm:p-6"><p className="t-small text-ink-soft">{v4("dates")}</p><p className="flex items-start gap-2 font-semibold"><CalendarDays size={18} className="mt-0.5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />{dates}</p></div>
      <div className="space-y-2 bg-canvas p-5 sm:p-6"><p className="t-small text-ink-soft">{t("status")}</p><StatusProgress status={reservation.estado} /></div>
      <div className="space-y-1 bg-canvas p-5 sm:p-6"><p className="t-small text-ink-soft">{v4("balanceDue")}</p><p className={`t-h2 ${balance <= 0 ? "text-success" : "text-brand-deep"}`}>{balance <= 0 ? t("paid") : formatMoney(balance, reservation.moneda)}</p><p className="t-small font-normal text-ink-soft">{t("total")}: {formatMoney(Number(reservation.total), reservation.moneda)}</p></div>
    </section>
    <section aria-labelledby="portal-next-heading" className="flex flex-col gap-4 rounded-panel border border-brand/30 bg-brand-tint p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="space-y-1"><h2 id="portal-next-heading" className="t-small font-semibold text-brand-deep">{v4("nextStep")}</h2><p className="t-body text-ink">{stepText}</p></div>
      {step === "ready" || step === "documents" ? <Link href="/requisitos" className={`${linkClass} shrink-0`}>{v4("checkRequirements")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
        : step !== "pending" && <TrackedLink event="whatsapp_click" placement={`portal-next-${step}`} href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-btn bg-wa px-5 py-3 font-semibold text-ink hover:bg-wa-deep"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{t("writeUs")}</TrackedLink>}
    </section>

    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-8">
        {travel.data?.reviewed ? <TravelSummary data={travel.data} cancelled={reservation.estado === "cancelada"} hasFlights={travelServices(reservation.accepted_snapshot?.quotation?.detalles).vuelos.journeys.some(j=>j.segmentos.length)} /> : null}
        {receipts.length ? <section className={panel}><h2 className="t-h2">Recibos</h2><ul className="mt-4 space-y-4">{receipts.map(receipt=><li key={receipt.id}><a className={linkClass} href={`/api/mi-reserva/recibos/${receipt.id}`}>Descargar {receipt.number}</a></li>)}</ul></section> : null}
        <section className={panel} aria-labelledby="portal-items-heading">
          <h2 id="portal-items-heading" className="t-h2">{t("tripDetail")}</h2>
          {reservation.accepted_snapshot?.quotation?.detalles ? <div className="mt-4"><ReservationServices value={reservation.accepted_snapshot.quotation.detalles} /></div> : null}
          {record.items.length ? <ul className="mt-6 divide-y divide-line border-y border-line" aria-label={t("includedServices")}>{record.items.map(item => <li key={item.id ?? `${item.descripcion}-${item.orden}`} className="flex items-start justify-between gap-4 py-4"><span className="t-body min-w-0 break-words">{item.descripcion}</span><span className="t-small shrink-0 text-ink-soft">{t("quantity")}: {item.cantidad}</span></li>)}</ul> : <p className="t-body mt-4 text-ink-soft">{t("noItems")}</p>}
        </section>

        <section className={panel} aria-labelledby="portal-payments-heading">
          <h2 id="portal-payments-heading" className="t-h2">{t("payments")}</h2>
          {/* A list, not a 620px table: phones read every payment without scrolling sideways. */}
          {record.payments.length ? <ul className="mt-6 divide-y divide-line border-y border-line" aria-label={t("registeredPayments")}>{record.payments.map(payment => <li key={payment.id} className="flex items-start justify-between gap-4 py-4"><div className="min-w-0 space-y-1"><p className="t-body font-semibold">{dateLabel(payment.fecha_pago, locale, t("toConfirm"))}</p><p className="t-small font-normal text-ink-soft">{paymentMethodLabel(payment.metodo)} · {t("reference")}: {maskedReference(payment.referencia, t("notAvailable"))}</p></div><p className="t-body shrink-0 font-semibold">{formatMoney(Number(payment.monto), payment.moneda)}</p></li>)}</ul> : <p className="t-body mt-4 text-ink-soft">{t("noPayments")}</p>}
        </section>

        <section className={panel} aria-labelledby="portal-invoices-heading">
          <h2 id="portal-invoices-heading" className="t-h2">{t("invoices")}</h2>
          <div className="mt-6 space-y-3">{record.invoices.map(invoice => <article key={invoice.id} className="flex flex-col gap-4 rounded-card border border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="t-h3">{invoice.numero}</h3><p className="t-small text-ink-soft">{t("issued")}: {dateLabel(invoice.fecha_emision, locale, t("toConfirm"))} · {t("statusLabel")}: {invoiceStatusLabel(invoice.estado)}</p></div><a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-btn border border-brand px-5 py-3 font-semibold text-brand hover:bg-brand-tint" href={`/api/mi-reserva/facturas/${invoice.id}/pdf`}><Download size={18} strokeWidth={1.75} aria-hidden="true" />{t("downloadPdf")}</a></article>)}{!record.invoices.length ? <p className="t-body text-ink-soft">{t("noInvoices")}</p> : null}</div>
        </section>

        <section className={panel} aria-labelledby="portal-documents-heading">
          <h2 id="portal-documents-heading" className="t-h2">{t("documents")}</h2>
          <p className="mt-2 text-ink-soft">{t("documentsIntro")}</p>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="space-y-3"><h3 className="t-small font-semibold text-ink">{v4("fromViatour")}</h3><DocumentList documents={agencyDocuments} empty={v4("noAgencyDocuments")} locale={locale} sentOn={date => v4("sentOn", { date })} open={v4("open")} /></div>
            <div className="space-y-3"><h3 className="t-small font-semibold text-ink">{v4("fromYou")}</h3><DocumentList documents={customerDocuments} empty={v4("noCustomerDocuments")} locale={locale} sentOn={date => date ? v4("sentOn", { date }) : v4("customerDocument")} open={v4("open")} /></div>
          </div>
          <DocumentUploadForm />
        </section>

        <section id="soporte" className={`${panel} scroll-mt-28`} aria-labelledby="portal-tickets-heading"><h2 id="portal-tickets-heading" className="t-h2">{t("supportRequests")}</h2><p className="mt-2 text-ink-soft">{t("supportIntro")}</p><TicketPanel /></section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-28" aria-label={v4("duringTitle")}>
        {/* "Whom do I contact during the trip?" was a recurring concern in low-rated reviews. */}
        <section className="space-y-4 rounded-panel border border-line bg-surface p-6" aria-labelledby="portal-during-heading">
          <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-canvas text-brand"><LifeBuoy size={20} strokeWidth={1.75} aria-hidden="true" /></span><h2 id="portal-during-heading" className="t-h3">{v4("duringTitle")}</h2></div>
          <p className="t-small font-normal text-ink-soft">{v4("duringBody", { code: reservation.codigo })}</p>
          <TrackedLink event="whatsapp_click" placement="portal-during" href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn bg-wa px-5 py-3 font-semibold text-ink hover:bg-wa-deep"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{t("writeUs")}</TrackedLink>
          <ul className="space-y-1">
            <li className="t-small inline-flex min-h-11 items-center gap-3 text-ink"><Phone size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />+504 8866-8704</li>
            <li><TrackedLink event="email_click" placement="portal-during" href={`mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(reservation.codigo)}`} className="t-small inline-flex min-h-11 items-center gap-3 text-brand underline-offset-4 hover:underline"><Mail size={18} strokeWidth={1.75} aria-hidden="true" />{siteConfig.supportEmail}</TrackedLink></li>
          </ul>
          <a href="#soporte" className={linkClass}>{v4("sendRequest")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></a>
        </section>
        <section className="space-y-3 rounded-panel border border-line bg-canvas p-6" aria-labelledby="portal-help-heading">
          <h2 id="portal-help-heading" className="t-h3">{t("needChange")}</h2>
          <p className="t-small font-normal text-ink-soft">{t("changeIntro")} {v4("changesPolicy")}</p>
          <Link href="/legales/cancelaciones" className={linkClass}>{v4("changesLink")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
        </section>
      </aside>
    </div>
  </div>;
}

// Signed-out view: the access card first (it holds the H1), and beside it what the portal shows and how to get help.
function AccessView({ showOtp }: { showOtp: boolean }) {
  const t = useTranslations("portal"); const v3 = useTranslations("v3");
  const sections = [{ icon: Map, label: t("tripDetail") }, { icon: Wallet, label: t("payments") }, { icon: Receipt, label: t("invoices") }, { icon: FileText, label: t("documents") }, { icon: LifeBuoy, label: t("supportRequests") }];
  return <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-12">
    <div className="lg:order-last"><AccessPanel showOtp={showOtp} /></div>
    <section aria-labelledby="portal-benefits-title" className="space-y-6 rounded-panel border border-line bg-surface p-6 sm:p-8">
      <div className="space-y-2"><h2 id="portal-benefits-title" className="t-h2">{v3("portalBenefitsTitle")}</h2><p className="t-body text-ink-soft">{t("headerMessage")}</p></div>
      <ul className="grid gap-3 sm:grid-cols-2">{sections.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-3 rounded-card border border-line bg-canvas p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="t-small font-semibold text-ink">{label}</span></li>)}</ul>
      <p className="t-small flex gap-3 font-normal text-ink-soft"><ShieldCheck size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{v3("portalSecurity")}</p>
      <div className="space-y-3 border-t border-line pt-6"><p className="t-body font-semibold text-ink">{v3("portalHelpTitle")}</p><p className="t-small font-normal text-ink-soft">{v3("portalHelpBody")}</p><WhatsAppLink placement="mi-reserva" /></div>
    </section>
  </div>;
}

export default async function MiReservaPage() { const cookieStore = await cookies(); const reservationId = verifyPortalCookie(cookieStore.get(portalCookieName)?.value); const pendingId = verifyPortalPendingCookie(cookieStore.get(portalPendingCookieName)?.value); return <main className="container-site section-space"><div className="mx-auto max-w-6xl">{reservationId ? <PortalView reservationId={reservationId} /> : <AccessView showOtp={Boolean(pendingId)} />}</div></main>; }
