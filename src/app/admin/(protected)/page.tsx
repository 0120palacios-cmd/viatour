import Link from "next/link";
import { CalendarClock, ClipboardList, FileClock, FileText, IdCard, Inbox, MessageCircle, MessageSquare, Star, UserPlus, Wallet } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { expiringSoon, formatAmount, hondurasDay, monthTotals, outstandingBalances, quotationFunnel, summarizeLeads } from "@/lib/admin-reports";
import { effectiveExpiry, formatInstant } from "@/lib/quotation-details";
import { adminQuotationStatusLabel as quotationStatusLabel, type AdminQuotationStatus as QuotationStatus } from "@/lib/admin-quotation-status";
import { reservationStatusLabel, type ReservationStatus } from "@/lib/reservation-types";
import { openTicketStatuses, quotationTone, reservationTone } from "@/lib/admin-status";
import { NewQuotationMenu } from "@/components/admin/new-quotation-menu";
import { formatDay, PageHeader, Panel, RecordRow, StatusBadge, secondaryLink, textLink } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin", "viatour | Panel de administración", "Acceso privado a la administración de viatour. Esta página no está disponible para indexación pública.");

type Row = Record<string, unknown>;
type Rows = { data: Row[] | null; error: unknown };
const ok = (result: { error: unknown; count?: number | null }) => result.error ? null : result.count ?? 0;

export default async function Page() {
  const { client } = await requireAdmin();
  const now = new Date();
  const today = hondurasDay(now), in30 = hondurasDay(now, 30);
  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString(), since90 = new Date(now.getTime() - 90 * 86400000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const head = { count: "exact", head: true } as const;

  // Work queue. Each count stands alone: an optional table that is not installed yet shows "—"
  // instead of breaking the page.
  const [newLeads, drafts, awaiting, tickets, reviews, departures, recent, active] = await Promise.all([
    client.from("leads").select("id", head).eq("estado", "nuevo"),
    client.from("quotations").select("id", head).eq("estado", "borrador"),
    client.from("quotations").select("id", head).eq("estado", "enviada"),
    client.from("support_tickets").select("id", head).in("estado", openTicketStatuses),
    client.from("reviews").select("id", head).eq("estado", "pendiente"),
    client.from("reservations").select("id,codigo,cliente_nombre,destino,estado,fecha_inicio,fecha_fin").gte("fecha_inicio", today).lte("fecha_inicio", in30).in("estado", ["pendiente", "confirmada"]).order("fecha_inicio", { ascending: true }).limit(8),
    client.from("quotations").select("id,codigo,cliente_nombre,destino,estado,updated_at").order("updated_at", { ascending: false }).limit(6),
    client.from("reservations").select("id,codigo,cliente_nombre,destino,moneda,total,estado,fecha_inicio").in("estado", ["pendiente", "confirmada", "en_curso"]).order("fecha_inicio", { ascending: true, nullsFirst: false }).limit(500),
  ]);
  let open: Rows = await client.from("quotations").select("id,codigo,cliente_nombre,destino,estado,vence_en,validez").in("estado", ["borrador", "enviada"]).limit(500);
  if (open.error) open = await client.from("quotations").select("id,codigo,cliente_nombre,destino,estado,validez").in("estado", ["borrador", "enviada"]).limit(500);
  const expiring = expiringSoon(open.data ?? [], row => effectiveExpiry(row.vence_en as string | null, row.validez as string | null), now, 48);
  const activeRows = (active.data ?? []) as Row[];
  const activePayments = activeRows.length ? await client.from("payments").select("reservation_id,monto,moneda").in("reservation_id", activeRows.map(row => String(row.id))) : { data: [], error: null };
  const balances = activePayments.error ? [] : outstandingBalances(activeRows, (activePayments.data ?? []) as Row[]);

  // Follow-ups from the overhaul: WhatsApp shares waiting for "Lo envié" (docs/sql/quotation_shares.sql) and saved
  // travel documents expired or expiring within 6 months (docs/sql/passenger_profiles.sql). Absent tables: nothing.
  const [pendingShares, expiringDocuments] = await Promise.all([
    client.from("quotation_shares").select("id,quotation_id,created_at").eq("estado", "preparado").gt("expira_en", now.toISOString()).order("created_at", { ascending: false }).limit(8),
    client.from("passenger_profiles").select("id,customer_id,nombre,apellidos,tipo_documento,vence_documento").neq("tipo_documento", "ninguno").not("vence_documento", "is", null).lte("vence_documento", hondurasDay(now, 183)).order("vence_documento", { ascending: true }).limit(8),
  ]);
  const shareQuotes = pendingShares.data?.length ? (await client.from("quotations").select("id,codigo,cliente_nombre,destino").in("id", pendingShares.data.map(row => String(row.quotation_id)))).data ?? [] : [];
  const followUps = [
    ...(pendingShares.data ?? []).map(row => { const quote = shareQuotes.find(item => item.id === row.quotation_id); return { key: `s${row.id}`, href: `/admin/cotizaciones/${row.quotation_id}`, icon: <MessageCircle size={18} strokeWidth={1.75} />, title: quote ? String(quote.cliente_nombre) : "Cotización", meta: `${quote?.codigo ?? ""} · Envío por WhatsApp preparado: confirme si lo envió`, aside: formatDay(String(row.created_at)) }; }),
    ...(expiringDocuments.data ?? []).map(row => ({ key: `d${row.id}`, href: `/admin/clientes/${row.customer_id}`, icon: <IdCard size={18} strokeWidth={1.75} />, title: `${row.nombre} ${row.apellidos}`, meta: `${String(row.vence_documento) < today ? "Documento vencido" : "Documento vence en menos de 6 meses"}`, aside: formatDay(String(row.vence_documento)) })),
  ];

  // Indicators (unchanged from before; optional columns fall back when absent).
  let leads: Rows = await client.from("leads").select("servicio,estado,created_at,origen_web").gte("created_at", since30).limit(2000);
  if (leads.error) leads = await client.from("leads").select("servicio,estado,created_at,payload").gte("created_at", since30).limit(2000);
  const [quotations, payments] = await Promise.all([
    client.from("quotations").select("estado").gte("created_at", since90).limit(5000),
    client.from("payments").select("monto,moneda").gte("fecha_pago", monthStart.toISOString().slice(0, 10)).limit(5000),
  ]);
  let reservations: Rows = await client.from("reservations").select("moneda,total,estado,comision").gte("created_at", monthStart.toISOString()).limit(5000);
  const incomeTracked = !reservations.error;
  if (reservations.error) reservations = await client.from("reservations").select("moneda,total,estado").gte("created_at", monthStart.toISOString()).limit(5000);
  const leadSummary = summarizeLeads(leads.data ?? [], now.getTime());
  const funnel = quotationFunnel((quotations.data ?? []) as Row[]);
  const totals = monthTotals(reservations.data ?? [], (payments.data ?? []) as Row[]);
  const month = new Intl.DateTimeFormat("es-HN", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);

  const queue = [
    ["Leads nuevos", ok(newLeads), "Solicitudes sin contactar", "/admin/leads?estado=nuevo", Inbox],
    ["Esperando respuesta", ok(awaiting), "Cotizaciones enviadas al cliente", "/admin/cotizaciones?estado=enviada", FileText],
    ["Borradores", ok(drafts), "Cotizaciones sin enviar", "/admin/cotizaciones?estado=borrador", FileClock],
    ["Saldos pendientes", activePayments.error ? null : balances.length, "Reservas activas con saldo", "/admin/reservas?saldo=pendiente", Wallet],
    ["Solicitudes abiertas", ok(tickets), "Soporte de clientes con reserva", "/admin/tickets?estado=abiertas", MessageSquare],
    ["Opiniones por revisar", ok(reviews), "Antes de publicarse en el sitio", "/admin/opiniones?estado=pendiente", Star],
  ] as const;

  return <>
    <PageHeader title="Inicio" description="Lo que necesita atención hoy y el estado de las ventas." actions={<><NewQuotationMenu /><Link href="/admin/clientes/nuevo" className={secondaryLink}><UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />Crear cliente</Link></>} />

    <section aria-labelledby="queue-title" className="space-y-4">
      <h2 id="queue-title" className="sr-only">Pendientes</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{queue.map(([label, value, hint, href, Icon]) => <li key={label}>
        <Link href={href} className="flex h-full items-start gap-4 rounded-card border border-line bg-canvas p-5 hover:border-brand">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-btn ${value ? "bg-brand-tint text-brand" : "bg-surface text-ink-soft"}`}><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
          <span className="min-w-0"><span className="block text-ink-soft">{label}</span><span className="t-h2 block tabular-nums">{value ?? "—"}</span><span className="t-small block text-ink-soft">{value == null ? "No disponible" : hint}</span></span>
        </Link>
      </li>)}</ul>
    </section>

    {followUps.length ? <Panel title="Para revisar" description="Envíos por WhatsApp sin confirmar y documentos de viaje vencidos o por vencer.">
      <ul className="divide-y divide-line">{followUps.map(item => <RecordRow key={item.key} href={item.href} icon={item.icon} title={item.title} meta={item.meta} aside={<span className="t-small font-semibold">{item.aside}</span>} />)}</ul>
    </Panel> : null}

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Próximas salidas" description="Reservas pendientes o confirmadas que inician en los próximos 30 días." action={<Link href="/admin/reservas" className={`t-small ${textLink}`}>Ver reservas</Link>}>
        {departures.error || !departures.data?.length ? <p className="p-6 text-ink-soft">{departures.error ? "No se pudieron cargar las reservas." : "No hay salidas en los próximos 30 días."}</p> : <ul className="divide-y divide-line">{departures.data.map(row => <RecordRow key={String(row.id)} href={`/admin/reservas/${row.id}`} icon={<CalendarClock size={18} strokeWidth={1.75} />} title={String(row.cliente_nombre)} badges={<StatusBadge tone={reservationTone[row.estado as ReservationStatus]}>{reservationStatusLabel(row.estado as ReservationStatus)}</StatusBadge>} meta={`${row.codigo} · ${row.destino}`} aside={<span className="t-small font-semibold">{formatDay(row.fecha_inicio as string)}</span>} />)}</ul>}
      </Panel>
      <Panel title="Cotizaciones por vencer" description="Borradores y enviadas cuya validez termina en las próximas 48 horas." action={<Link href="/admin/cotizaciones?estado=enviada" className={`t-small ${textLink}`}>Ver enviadas</Link>}>
        {!expiring.length ? <p className="p-6 text-ink-soft">{open.error ? "No se pudieron cargar las cotizaciones." : "Ninguna cotización abierta vence en las próximas 48 horas."}</p> : <ul className="divide-y divide-line">{expiring.slice(0, 8).map(({ row, expiry }) => <RecordRow key={String(row.id)} href={`/admin/cotizaciones/${row.id}`} title={String(row.cliente_nombre)} badges={<StatusBadge tone={quotationTone[row.estado as QuotationStatus]}>{quotationStatusLabel(row.estado as QuotationStatus)}</StatusBadge>} meta={`${row.codigo} · ${row.destino}`} aside={<span className="t-small">Vence {formatInstant(expiry, undefined, false)}</span>} />)}</ul>}
      </Panel>
      <Panel title="Saldos pendientes" description="Reservas activas con saldo, por fecha de inicio. Solo cuentan los pagos en la moneda de la reserva." action={<Link href="/admin/reservas?saldo=pendiente" className={`t-small ${textLink}`}>Ver todas</Link>}>
        {!balances.length ? <p className="p-6 text-ink-soft">{activePayments.error || active.error ? "No se pudieron cargar los saldos." : "No hay reservas activas con saldo."}</p> : <ul className="divide-y divide-line">{balances.slice(0, 6).map(({ row, balance }) => <RecordRow key={String(row.id)} href={`/admin/reservas/${row.id}`} icon={<ClipboardList size={18} strokeWidth={1.75} />} title={String(row.cliente_nombre)} meta={`${row.codigo} · ${row.destino} · Inicia ${formatDay(row.fecha_inicio as string | null)}`} aside={<span className="t-small font-semibold">{formatAmount(balance, String(row.moneda))}</span>} />)}</ul>}
      </Panel>
      <Panel title="Actividad reciente" description="Últimas cotizaciones creadas o editadas." action={<Link href="/admin/cotizaciones" className={`t-small ${textLink}`}>Ver cotizaciones</Link>}>
        {!recent.data?.length ? <p className="p-6 text-ink-soft">Todavía no hay cotizaciones.</p> : <ul className="divide-y divide-line">{recent.data.map(row => <RecordRow key={String(row.id)} href={`/admin/cotizaciones/${row.id}`} title={String(row.cliente_nombre)} badges={<StatusBadge tone={quotationTone[row.estado as QuotationStatus]}>{quotationStatusLabel(row.estado as QuotationStatus)}</StatusBadge>} meta={`${row.codigo} · ${row.destino}`} aside={<span className="t-small text-ink-soft">{formatDay(row.updated_at as string)}</span>} />)}</ul>}
      </Panel>
    </div>

    <section aria-labelledby="indicators-title" className="space-y-4">
      <h2 id="indicators-title" className="t-h2">Indicadores</h2>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Cotizaciones (90 días)">
          <dl className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">{[["Creadas", funnel.total], ["Enviadas", funnel.sent], ["Aceptadas", funnel.accepted], ["Aceptación", `${funnel.rate}%`]].map(([label, value]) => <div key={String(label)}><dt className="t-small text-ink-soft">{label}</dt><dd className="t-h3 tabular-nums">{value}</dd></div>)}</dl>
        </Panel>
        <Panel title="Leads" action={<Link href="/admin/leads" className={`t-small ${textLink}`}>Ver leads</Link>}>
          <dl className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">{[["Últimos 7 días", leadSummary.last7], ["Últimos 30 días", leadSummary.last30], ["Ganados (30 días)", leadSummary.won], ["Perdidos (30 días)", leadSummary.lost]].map(([label, value]) => <div key={String(label)}><dt className="t-small text-ink-soft">{label}</dt><dd className="t-h3 tabular-nums">{value}</dd></div>)}</dl>
          <div className="grid gap-6 border-t border-line p-6 sm:grid-cols-2">{[["Por servicio (30 días)", leadSummary.byService], ["Por origen (30 días)", leadSummary.bySource]].map(([title, rows]) => <div key={String(title)}><h3 className="mb-2 font-semibold">{String(title)}</h3>{(rows as [string, number][]).length ? <table className="t-small w-full"><tbody>{(rows as [string, number][]).slice(0, 6).map(([label, value]) => <tr key={label} className="border-t border-line"><td className="break-all py-2 pr-4">{label}</td><td className="py-2 text-right font-semibold tabular-nums">{value}</td></tr>)}</tbody></table> : <p className="t-small text-ink-soft">Sin leads en este periodo.</p>}</div>)}</div>
        </Panel>
      </div>
      <Panel title={`Ventas de ${month}`} description={incomeTracked ? undefined : "Para ver el ingreso neto, ejecute docs/sql/reservations_income.sql y registre la comisión en cada reserva."}>
        {!Object.keys(totals).length ? <p className="p-6 text-ink-soft">Todavía no hay reservas ni pagos registrados este mes.</p> : <div className="divide-y divide-line">{Object.entries(totals).map(([currency, value]) => <dl key={currency} className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-5"><div><dt className="t-small text-ink-soft">Moneda</dt><dd className="t-h3">{currency}</dd></div><div><dt className="t-small text-ink-soft">Reservas del mes</dt><dd className="t-h3 tabular-nums">{value.bookings}</dd></div><div><dt className="t-small text-ink-soft">Vendido</dt><dd className="t-h3 tabular-nums">{formatAmount(value.sold, currency)}</dd></div><div><dt className="t-small text-ink-soft">Pagos recibidos</dt><dd className="t-h3 tabular-nums">{formatAmount(value.received, currency)}</dd></div><div><dt className="t-small text-ink-soft">Ingreso neto registrado</dt><dd className="t-h3 tabular-nums">{incomeTracked ? formatAmount(value.income, currency) : "—"}</dd></div></dl>)}</div>}
      </Panel>
      <p className="t-small text-ink-soft">Otras herramientas: <Link href="/admin/promociones" className={textLink}>códigos de la ruleta</Link> · <a href="/api/admin/newsletter" className={textLink}>exportar newsletter (CSV)</a></p>
    </section>
  </>;
}
