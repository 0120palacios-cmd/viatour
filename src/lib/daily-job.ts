import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inviteToReview } from "@/lib/review-invitation-send";
import { sendResendEmail, captureNotificationFailure } from "@/lib/notifications";
import { siteConfig } from "@/lib/site-config";
import { leadAge, leadContact } from "@/lib/lead-admin";

// Deterministic, rule-based daily routine (no AI): an owner digest plus opt-in automations.
// Every automatic send is keyed to an exact calendar day, so running once a day sends once.
export type DailyOptions = { now?: Date; autoReviews?: boolean; customerReminders?: boolean; docRetentionDays?: number };
type Row = Record<string, unknown>;
const s = (value: unknown) => String(value ?? "").trim();

export function hondurasDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
const money = (amount: number, currency: string) => `${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${currency}`;

export async function runDailyJob(client: SupabaseClient, options: DailyOptions = {}) {
  const now = options.now ?? new Date();
  const today = hondurasDate(now);
  const sections: { title: string; lines: string[] }[] = [];
  const actions: string[] = [];
  const problems: string[] = [];
  const section = (title: string, lines: string[]) => { if (lines.length) sections.push({ title, lines }); };

  // 1. Leads still "nuevo" after 24 hours.
  const staleLeads = await client.from("leads").select("*").eq("estado", "nuevo").lt("created_at", new Date(now.getTime() - 86400000).toISOString()).order("created_at", { ascending: true }).limit(30);
  if (staleLeads.error) problems.push("leads");
  section("Leads sin contactar (más de 24 horas)", (staleLeads.data ?? []).map((row: Row) => { const contact = leadContact(row); return `${contact.referencia || "sin referencia"} · ${s(row.nombre) || "Sin nombre"} · ${s(row.servicio)} · ${s(row.destino) || "—"} · ${contact.telefono || "sin teléfono"} · ${leadAge(s(row.created_at), now.getTime())}`; }));

  // 2. Quotations past their validity: sent ones expire automatically; drafts are listed.
  const expired = await client.from("quotations").update({ estado: "expirada" }).eq("estado", "enviada").lt("validez", today).select("codigo,cliente_nombre,destino");
  if (expired.error) problems.push("vencimiento de cotizaciones");
  else if (expired.data?.length) actions.push(`${expired.data.length} cotización(es) enviadas pasaron a "expirada" por fecha de validez.`);
  section("Cotizaciones vencidas hoy (marcadas como expiradas)", (expired.data ?? []).map((row: Row) => `${s(row.codigo)} · ${s(row.cliente_nombre)} · ${s(row.destino)}`));

  // 3. Sent quotations without an answer after 3 days.
  const followUp = await client.from("quotations").select("codigo,cliente_nombre,destino,cliente_telefono,created_at,validez").eq("estado", "enviada").lt("created_at", new Date(now.getTime() - 3 * 86400000).toISOString()).order("created_at", { ascending: true }).limit(30);
  if (followUp.error) problems.push("seguimiento de cotizaciones");
  section("Cotizaciones enviadas sin respuesta (más de 3 días)", (followUp.data ?? []).map((row: Row) => `${s(row.codigo)} · ${s(row.cliente_nombre)} · ${s(row.destino)} · válida hasta ${s(row.validez)}${row.cliente_telefono ? ` · ${s(row.cliente_telefono)}` : ""}`));

  // 4. Open reservations: upcoming trips and balances due.
  const open = await client.from("reservations").select("id,codigo,cliente_nombre,cliente_email,destino,fecha_inicio,fecha_fin,total,moneda,estado").in("estado", ["pendiente", "confirmada", "en_curso"]).order("fecha_inicio", { ascending: true }).limit(300);
  if (open.error) problems.push("reservas");
  const openRows = (open.data ?? []) as Row[];
  const paid = new Map<string, number>();
  if (openRows.length) {
    const payments = await client.from("payments").select("reservation_id,monto,moneda").in("reservation_id", openRows.map(row => s(row.id)));
    if (payments.error) problems.push("pagos");
    for (const payment of (payments.data ?? []) as Row[]) {
      const reservation = openRows.find(row => row.id === payment.reservation_id);
      // Only same-currency payments count toward the balance; mixed currencies are reviewed by hand.
      if (reservation && reservation.moneda === payment.moneda) paid.set(s(payment.reservation_id), (paid.get(s(payment.reservation_id)) ?? 0) + (Number(payment.monto) || 0));
    }
  }
  const balance = (row: Row) => (Number(row.total) || 0) - (paid.get(s(row.id)) ?? 0);
  const upcoming = openRows.filter(row => s(row.fecha_inicio) >= today && s(row.fecha_inicio) <= addDays(today, 30));
  section("Viajes en los próximos 30 días", upcoming.map(row => `${s(row.fecha_inicio)} · ${s(row.codigo)} · ${s(row.cliente_nombre)} · ${s(row.destino)}${balance(row) > 0.009 ? ` · saldo pendiente ${money(balance(row), s(row.moneda))}` : ""}`));
  section("Reservas con saldo pendiente", openRows.filter(row => balance(row) > 0.009).map(row => `${s(row.codigo)} · ${s(row.cliente_nombre)} · saldo ${money(balance(row), s(row.moneda))}${row.fecha_inicio ? ` · viaja ${s(row.fecha_inicio)}` : ""}`));

  // 5. Opt-in customer reminders (copy pending approval): trip in 7 days; balance 14 days before travel.
  if (options.customerReminders) {
    for (const row of openRows.filter(row => row.cliente_email && (s(row.fecha_inicio) === addDays(today, 7) || (s(row.fecha_inicio) === addDays(today, 14) && balance(row) > 0.009)))) {
      const soon = s(row.fecha_inicio) === addDays(today, 7);
      const text = soon
        ? `Estimado/a ${s(row.cliente_nombre)}:\n\nSu viaje a ${s(row.destino)} (reserva ${s(row.codigo)}) comienza el ${s(row.fecha_inicio)}. Le recomendamos revisar sus documentos de viaje y los requisitos de su destino:\n${siteConfig.url}/requisitos\n\nPuede consultar su reserva en ${siteConfig.url}/mi-reserva. Si tiene alguna pregunta, su asesor le atiende por WhatsApp al +504 8866-8704.\n\nSaludos,\nviatour | asesores de viaje`
        : `Estimado/a ${s(row.cliente_nombre)}:\n\nLe recordamos que su reserva ${s(row.codigo)} para ${s(row.destino)} tiene un saldo pendiente de ${money(balance(row), s(row.moneda))}. Su asesor le indicará cómo completarlo.\n\nPuede consultar su reserva en ${siteConfig.url}/mi-reserva.\n\nSaludos,\nviatour | asesores de viaje`;
      try {
        await sendResendEmail({ idempotencyKey: `${soon ? "trip-7" : "balance-14"}/${s(row.id)}/${today}`, from: siteConfig.supportEmail, to: [s(row.cliente_email)], replyTo: siteConfig.supportEmail, subject: soon ? `Su viaje a ${s(row.destino)} se acerca | viatour` : `Saldo pendiente de su reserva ${s(row.codigo)} | viatour`, text });
        actions.push(`Recordatorio enviado a ${s(row.cliente_nombre)} (${s(row.codigo)}).`);
      } catch (error) { captureNotificationFailure("customer_reminder", s(row.id), error); problems.push(`recordatorio ${s(row.codigo)}`); }
    }
  }

  // 6. Completed trips (last 60 days) without a review invitation; auto-invite exactly 2 days after return.
  const completed = await client.from("reservations").select("id,codigo,cliente_nombre,cliente_email,fecha_fin").eq("estado", "completada").gte("fecha_fin", addDays(today, -60)).lte("fecha_fin", addDays(today, -2)).limit(200);
  if (completed.error) problems.push("reservas completadas");
  const completedRows = (completed.data ?? []) as Row[];
  const emails = [...new Set(completedRows.map(row => s(row.cliente_email).toLowerCase()).filter(Boolean))];
  const invited = new Set<string>();
  if (emails.length) {
    const invitations = await client.from("review_invitations").select("email").in("email", emails);
    if (invitations.error) problems.push("invitaciones");
    for (const row of (invitations.data ?? []) as Row[]) invited.add(s(row.email).toLowerCase());
  }
  const pendingInvites = completedRows.filter(row => row.cliente_email && !invited.has(s(row.cliente_email).toLowerCase()));
  const autoInvited = new Set<string>();
  if (options.autoReviews) {
    for (const row of pendingInvites.filter(row => s(row.fecha_fin) === addDays(today, -2))) {
      const result = await inviteToReview(client, s(row.cliente_nombre).slice(0, 120), s(row.cliente_email).toLowerCase());
      if (result.ok) { autoInvited.add(s(row.id)); actions.push(`Invitación a opinar enviada a ${s(row.cliente_nombre)} (${s(row.codigo)}).`); }
      else problems.push(`invitación ${s(row.codigo)}`);
    }
  }
  section("Viajes completados sin invitación a opinar", pendingInvites.filter(row => !autoInvited.has(s(row.id))).map(row => `${s(row.codigo)} · ${s(row.cliente_nombre)} · regresó ${s(row.fecha_fin)}`));

  // 7. Opt-in document retention: remove portal documents N days after the trip ended.
  if (options.docRetentionDays && options.docRetentionDays >= 30) {
    const old = await client.from("reservations").select("id,codigo").in("estado", ["completada", "cancelada"]).lt("fecha_fin", addDays(today, -options.docRetentionDays)).gte("fecha_fin", addDays(today, -options.docRetentionDays - 30)).limit(100);
    for (const row of (old.data ?? []) as Row[]) {
      const listed = await client.storage.from("portal-docs").list(s(row.id), { limit: 100 });
      const paths = (listed.data ?? []).map(file => `${s(row.id)}/${file.name}`);
      if (paths.length) {
        const removed = await client.storage.from("portal-docs").remove(paths);
        if (removed.error) problems.push(`documentos ${s(row.codigo)}`); else actions.push(`${paths.length} documento(s) eliminados de ${s(row.codigo)} por política de conservación.`);
      }
    }
  }

  const text = [`Resumen diario de viatour — ${today}`, "", ...(actions.length ? ["Acciones automáticas:", ...actions.map(line => `- ${line}`), ""] : []),
    ...(sections.length ? sections.flatMap(({ title, lines }) => [`${title} (${lines.length}):`, ...lines.map(line => `- ${line}`), ""]) : ["No hay pendientes para hoy.", ""]),
    ...(problems.length ? [`No se pudieron revisar: ${problems.join(", ")}. Revise los registros del servidor.`, ""] : []),
    `Administración: ${siteConfig.url}/admin`].join("\n");
  return { today, text, sections, actions, problems };
}

export async function sendDailyDigest(client: SupabaseClient, options: DailyOptions = {}) {
  const report = await runDailyJob(client, options);
  await sendResendEmail({ idempotencyKey: `daily-digest/${report.today}`, from: siteConfig.supportEmail, to: [siteConfig.supportEmail], subject: `Resumen diario ${report.today} — viatour`, text: report.text });
  return report;
}
