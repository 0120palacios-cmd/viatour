import { ArrowRight, CheckCircle2, ChevronDown, Clock3, FileText, Hotel, MessageCircle, MessagesSquare, Plane, Receipt, ShieldCheck, Ticket, Upload } from "lucide-react";
import { DocumentUploadForm } from "@/components/portal/document-upload-form";
import { CopyButton } from "@/components/trip/copy-button";
import { formatAmount, formatTripDate } from "@/lib/trip-format";
import type { TravelerView, TripDocument, TripView } from "@/lib/trip-view";
import type { LoadedTrip } from "@/lib/trip-model";
import { airlineAction } from "@/lib/airline-links";
import { PageTitle } from "@/components/trip/trip-shell";
import { Action, panel, quietButton, summaryClass, textLink, ticketDisplay, whatsapp, whatsappUrl, type T, type TripLinks, type TripMode } from "@/components/trip/trip-ui";

// ---------------------------------------------------------------------------------------------------------
// Travelers, their ticket state and numbers. The airline code is shown per traveler only when it differs.

function TicketState({ traveler, t }: { traveler: TravelerView; t: T }) {
  if (traveler.ticket === "none") return null;
  if (traveler.ticket === "issued") return <div className="space-y-1 sm:text-right">
    <p className="t-small inline-flex items-center gap-2 font-semibold text-success"><CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />{t("travelers.ticketIssued")}</p>
    <div className="-mr-3 flex flex-wrap items-center sm:justify-end">
      <p className="font-semibold tabular-nums tracking-wide text-ink"><span className="sr-only">{t("travelers.ticket")}: </span><span className="break-all">{ticketDisplay(traveler.ticketNumber)}</span></p>
      <CopyButton value={traveler.ticketNumber} label={t("copy")} copiedLabel={t("copied")} accessibleLabel={t("copyLabel", { value: `${t("travelers.ticket")} ${traveler.ticketNumber}` })} />
    </div>
  </div>;
  return <p className={`t-small inline-flex items-center gap-2 font-semibold ${traveler.ticket === "processing" ? "text-brand-deep" : "text-ink-soft"}`}><Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />{traveler.ticket === "processing" ? t("travelers.ticketProcessing") : t("travelers.ticketPending")}</p>;
}

export function TripTravelers({ trip, links, t }: { trip: LoadedTrip; links: TripLinks; t: T }) {
  const { view } = trip;
  const perTravelerPnr = view.confirmations.length > 1;
  const cancelled = view.stage === "cancelled";
  const issued = view.travelers.filter(traveler => traveler.ticket === "issued").length;
  const single = view.confirmations.length === 1 ? view.confirmations[0] : null;
  const action = single ? airlineAction(single.airline || view.journeys[0]?.airlines[0]) : null;
  return <div className="space-y-6">
    <PageTitle id="section-title" title={view.hasFlights && !cancelled ? t("travelers.title") : t("travelers.titleNoFlights")} />
    {view.travelers.length && !cancelled ? <p className="t-body -mt-3 text-ink-soft">{t("travelers.intro")}</p> : null}
    {single && !cancelled ? <div className={`${panel} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-6`}>
      <div className="min-w-0"><p className="t-small font-normal text-ink-soft">{single.airline ? `${single.airline} · ` : ""}{t("travelers.pnr")}</p><p className="text-2xl font-extrabold tabular-nums tracking-[0.14em] text-ink">{single.pnr}</p></div>
      <div className="-mr-3 flex flex-wrap items-center gap-2"><CopyButton value={single.pnr} label={t("confirmation.copyPnr")} copiedLabel={t("copied")} accessibleLabel={t("copyLabel", { value: `${t("travelers.pnr")} ${single.pnr}` })} />{action ? <a href={action.url} target="_blank" rel="noopener noreferrer" className={textLink}>{action.kind === "manage" ? t("airline.manage", { airline: action.airline }) : t("airline.site", { airline: action.airline })}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /><span className="sr-only">{t("opensNewWindow")}</span></a> : null}</div>
    </div> : null}
    {view.travelers.length ? <>
      {view.hasFlights && !cancelled ? <p className="t-small font-semibold text-ink">{issued ? t("confirmation.issued", { issued, total: view.travelers.length }) : view.ticketing === "processing" ? t("confirmation.ticketsProcessing") : t("confirmation.ticketsPending")}</p> : null}
      <ol className={`${panel} divide-y divide-line`}>{view.travelers.map((traveler, index) => <li key={traveler.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="t-small mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface font-semibold tabular-nums text-ink-soft" aria-hidden="true">{index + 1}</span>
          <div className="min-w-0">
            <p className="break-words font-semibold text-ink">{traveler.name}</p>
            <p className="t-small font-normal text-ink-soft">{t(`travelers.${traveler.category}`)}{perTravelerPnr && traveler.pnr ? ` · ${traveler.airline ? `${traveler.airline} ` : ""}${traveler.pnr}` : ""}</p>
          </div>
        </div>
        {cancelled ? null : <div className="pl-10 sm:shrink-0 sm:pl-0"><TicketState traveler={traveler} t={t} /></div>}
      </li>)}</ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="t-small flex gap-3 rounded-card bg-surface p-4 font-normal text-ink-soft"><ShieldCheck size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />{t("travelers.privacy")}</p>
        {!cancelled ? <a href={links.messages} className="t-small flex items-start gap-3 rounded-card border border-line p-4 font-normal text-ink transition-colors duration-(--duration-fast) hover:border-brand"><MessagesSquare size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span><span className="block font-semibold">{t("travelers.mismatchTitle")}</span>{t("travelers.mismatchBody")}</span></a> : null}
      </div>
    </> : <p className="t-body rounded-card bg-surface p-5 text-ink-soft">{t("travelers.pendingReview")}</p>}
  </div>;
}

// ---------------------------------------------------------------------------------------------------------
// Documents, payments and receipts, and one place to send a document to the advisor.

const documentIcons = { itinerary: Plane, confirmation: FileText, tickets: Ticket, hotelVoucher: Hotel, receipt: Receipt, agency: FileText, customer: FileText };

function Payments({ view, mode, links, locale, t }: { view: TripView; mode: TripMode; links: TripLinks; locale: string; t: T }) {
  const { finance } = view;
  const percent = finance.total > 0 ? Math.min(100, Math.round((finance.paid / finance.total) * 100)) : 0;
  return <section id="pagos" aria-labelledby="payments-title" className="scroll-mt-28 space-y-4">
    <h2 id="payments-title" className="t-h2">{t("payments.title")}</h2>
    {view.stage === "cancelled" ? <p className="t-body rounded-card bg-surface p-5 text-ink-soft">{t("payments.cancelled")}</p>
      : finance.state === "none" ? <p className="t-body rounded-card bg-surface p-5 text-ink-soft">{t("payments.none")}</p>
      : <div className={`${panel} p-5 sm:p-6`}>
        {finance.state === "paid" ? <div className="flex items-start gap-3">
          <CheckCircle2 size={24} strokeWidth={2} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <div><p className="t-h3 text-ink">{t("payments.paid")}</p><p className="t-small font-normal text-ink-soft">{t("payments.total")}: <span className="font-semibold tabular-nums text-ink">{formatAmount(finance.total, finance.currency)}</span></p></div>
        </div> : <>
          <p className="t-small font-normal text-ink-soft">{t("payments.due")}</p>
          <p className="t-h2 tabular-nums text-ink">{formatAmount(finance.balance, finance.currency)}</p>
          {finance.paid > 0 ? <>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div>
            <p className="t-small mt-2 font-normal text-ink-soft">{t("payments.progress", { paid: formatAmount(finance.paid, finance.currency), total: formatAmount(finance.total, finance.currency) })}</p>
          </> : <p className="t-small mt-1 font-normal text-ink-soft">{t("payments.total")}: <span className="font-semibold tabular-nums text-ink">{formatAmount(finance.total, finance.currency)}</span></p>}
          <div className="mt-5"><Action href={whatsappUrl(t("help.paymentMessage", { code: view.reference, amount: formatAmount(finance.balance, finance.currency) }))} mode={mode} customerOnly external className={whatsapp} label={t("preview.disabled")}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{t("actions.coordinatePayment")}</Action></div>
        </>}
      </div>}
    {finance.otherCurrency ? <p className="t-small font-normal text-ink-soft">{t("payments.otherCurrency")}</p> : null}
    {view.receipts.length || view.stage !== "cancelled" ? <div>
      <h3 className="font-semibold text-ink">{t("payments.receipts")}</h3>
      {view.receipts.length ? <ul className="mt-2 divide-y divide-line border-y border-line">{view.receipts.map(receipt => <li key={receipt.id} className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0"><p className="font-semibold tabular-nums text-ink">{formatAmount(receipt.amount, receipt.currency)}</p><p className="t-small break-words font-normal text-ink-soft">{receipt.number} · {formatTripDate(receipt.date, locale, "medium")}</p></div>
        <Action href={links.receipt(receipt.id)} mode={mode} external className={quietButton} label="">{t("payments.viewReceipt")}</Action>
      </li>)}</ul> : <p className="t-small mt-1 font-normal text-ink-soft">{t("payments.noReceipts")}</p>}
      {view.receipts.length ? <p className="t-small mt-2 font-normal text-ink-soft">{t("payments.receiptNote")}</p> : null}
    </div> : null}
  </section>;
}

export async function TripDocuments({ trip, mode, links, locale, t }: { trip: LoadedTrip; mode: TripMode; links: TripLinks; locale: string; t: T }) {
  const { view } = trip;
  const detail = (document: TripDocument) => {
    if (document.key === "itinerary") return document.status === "available" ? t("documents.itineraryDetail") : t("documents.itineraryProcessing");
    if (document.key === "confirmation") return document.status === "available" ? t("documents.confirmationDetail") : t("documents.confirmationPending");
    if (document.key === "tickets") return document.status === "available" ? t("documents.ticketsIssued") : document.status === "processing" ? t("documents.ticketsProcessing") : t("documents.ticketsPending");
    if (document.key === "hotelVoucher") return t("documents.hotelPending");
    if (document.key === "receipt") return formatTripDate(document.date, locale, "medium");
    return [t("documents.agency"), document.date ? formatTripDate(document.date.slice(0, 10), locale, "medium") : ""].filter(Boolean).join(" · ");
  };
  const title = (document: TripDocument) => document.key === "receipt" ? t("documents.receipt", { number: document.title }) : document.key === "agency" ? document.title : document.key === "confirmation" && !view.supplierConfirmed ? t("documents.summary") : t(`documents.${document.key}`);
  const href = (document: TripDocument) => document.status !== "available" ? null : document.key === "itinerary" ? links.itinerary : document.key === "confirmation" ? links.confirmation : document.key === "receipt" ? links.receipt(document.ref) : document.key === "agency" ? links.document(document.ref) : document.key === "tickets" ? links.section("viajeros") : null;
  const listed = view.documents.filter(document => document.key !== "receipt");
  return <div className="space-y-10">
    <section aria-labelledby="section-title" className="space-y-4">
      <PageTitle id="section-title" title={t("documents.title")} />
      {listed.length || view.receipts.length ? <ul className={`${panel} divide-y divide-line`}>{listed.map((document, index) => {
        const Icon = documentIcons[document.key];
        const target = href(document);
        const name = title(document);
        const internal = document.key === "tickets";
        return <li key={`${document.key}-${document.ref || index}`} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${document.status === "available" ? "bg-brand-tint text-brand" : "bg-surface text-ink-soft/70"}`} aria-hidden="true"><Icon size={19} strokeWidth={1.75} /></span>
          <div className="min-w-0 flex-1">
            <p className={`break-words font-semibold ${document.status === "available" ? "text-ink" : "text-ink-soft"}`}>{name}</p>
            <p className="t-small font-normal text-ink-soft">{detail(document)}</p>
          </div>
          {target ? <a href={target} {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })} className={quietButton} aria-label={`${t("documents.open")}: ${name}`}>{t("documents.open")}</a> : <span className="t-small shrink-0 rounded-btn bg-surface px-2 py-0.5 font-semibold text-ink-soft">{document.status === "processing" ? t("documents.processing") : t("documents.pending")}</span>}
        </li>;
      })}
        {view.receipts.length ? <li className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true"><Receipt size={19} strokeWidth={1.75} /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{t("documents.receipts")}</p><p className="t-small font-normal text-ink-soft">{t("documents.receiptsDetail", { count: view.receipts.length })}</p></div>
          <a href="#pagos" className={quietButton} aria-label={`${t("documents.open")}: ${t("documents.receipts")}`}>{t("documents.open")}</a>
        </li> : null}
      </ul> : <p className="t-body rounded-card bg-surface p-5 text-ink-soft">{t("documents.none")}</p>}

      {view.stage !== "cancelled" ? <details className="group rounded-card border border-line px-4 sm:px-6">
        <summary className={summaryClass}><span className="inline-flex items-center gap-3"><Upload size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{t("documents.uploadTitle")}</span><ChevronDown size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft transition-transform duration-(--duration-fast) group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="space-y-4 pb-5">
          <p className="t-small font-normal text-ink-soft">{t("documents.uploadIntro")}</p>
          {mode === "customer" ? <DocumentUploadForm /> : <p className="t-small font-semibold text-ink-soft">{t("preview.disabled")}</p>}
          <div className="border-t border-line pt-4">
            <h3 className="t-small font-semibold text-ink">{t("documents.fromYou")}</h3>
            {view.customerDocuments.length ? <ul className="mt-1">{view.customerDocuments.map(document => <li key={document.path}><a href={links.document(document.path)} target="_blank" rel="noopener noreferrer" className={textLink}><FileText size={16} strokeWidth={1.75} aria-hidden="true" />{t("documents.sentOn", { date: formatTripDate(document.createdAt?.slice(0, 10), locale, "medium") })}</a></li>)}</ul> : <p className="t-small mt-1 font-normal text-ink-soft">{t("documents.noCustomerDocuments")}</p>}
          </div>
        </div>
      </details> : null}
      {view.documents.length ? <p className="t-small font-normal text-ink-soft">{t("documents.trouble")} <a href={links.messages} className="font-semibold text-brand underline-offset-4 hover:underline">{t("support.sendMessage")}</a></p> : null}
    </section>
    <Payments view={view} mode={mode} links={links} locale={locale} t={t} />
  </div>;
}
