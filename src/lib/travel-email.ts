import type { PublicTravel } from "@/lib/travel-operations";
import type { Reservation } from "@/lib/reservation-types";
import { hondurasToday } from "@/lib/portal-summary";
import { reservationTripView } from "@/lib/trip-view";
import { firstName, formatAmount, formatClock, formatDateRange, formatMinutes, formatTripDate } from "@/lib/trip-format";
import { tripCopy } from "@/lib/trip-copy";
import { emailButton, emailFacts, emailFooter, emailHeading, emailLayout, emailOrigin, emailText, escapeHtml } from "@/lib/email-layout";

export { escapeHtml };

export type CustomerEmail = { subject: string; text: string; html: string };

// Mi viaje link with the reservation code prefilled. The code alone never grants access: the visitor
// still needs the registered surname and the one-time code sent to the registered email.
export const portalLink = (code: string) => `${emailOrigin}/mi-reserva?ref=${encodeURIComponent(code)}`;
const capital = (text: string) => text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text;

// "Your trip is ready": built from the same trip view as the portal and the itinerary PDF.
export function itineraryEmail(r: Reservation, travel: PublicTravel, today = hondurasToday()): CustomerEmail & { preheader: string } {
  const view = reservationTripView(r, travel, today);
  const name = firstName(r.cliente_nombre);
  const dates = formatDateRange(view.start, view.end) || "Fechas por confirmar";
  const cancelled = view.stage === "cancelled";
  const ticketState = !view.hasFlights ? "" : view.ticketing === "issued" ? "Boletos emitidos" : view.ticketing === "processing" ? "En proceso de emisión" : "Pendiente de emisión";
  const subject = cancelled ? `Actualización de su reserva ${view.reference} | viatour` : `Su itinerario a ${view.destination} está listo | Reserva ${view.reference}`;
  const preheader = cancelled ? `Su reserva ${view.reference} fue cancelada.` : `${view.destination}, ${dates}. Adjuntamos su itinerario en PDF; también puede verlo en Mi viaje.`;
  const journeys = view.journeys.map(journey => ({
    label: journey.kind === "ida" ? "Ida" : journey.kind === "regreso" ? "Regreso" : `Vuelo ${journey.index + 1}`,
    value: `${capital(formatTripDate(journey.date, "es", "weekday"))} · ${journey.from.code} ${formatClock(journey.time)} → ${journey.to.code} ${formatClock(journey.arriveTime)}${journey.arriveDate && journey.arriveDate !== journey.date ? ` (${formatTripDate(journey.arriveDate, "es", "short")})` : ""}`,
    detail: [journey.airlines.join(", "), journey.stops ? `${journey.stops} ${journey.stops === 1 ? "escala" : "escalas"} en ${journey.connections.map(connection => connection.city).join(", ")}` : "Directo", journey.durationMin !== null ? formatMinutes(journey.durationMin) : ""].filter(Boolean).join(" · "),
  }));
  const facts: [string, string][] = [
    ["Reserva", view.reference],
    // Same status wording as Mi viaje: never more than the data supports.
    ["Estado de la reserva", tripCopy()(`stage.${view.stage}`)],
    ["Fechas", dates],
    ...(view.travelers.length ? [["Viajeros", view.travelers.map(traveler => traveler.name).join(", ")] as [string, string]] : view.travelerCount ? [["Viajeros", String(view.travelerCount)] as [string, string]] : []),
    ...(ticketState ? [["Boletos", ticketState] as [string, string]] : []),
    ...view.hotels.map(hotel => ["Hotel", `${hotel.name} · ${formatDateRange(hotel.checkIn, hotel.checkOut)}`] as [string, string]),
  ];
  const flightRows = journeys.map(journey => `<tr><td style="padding:12px 0;border-top:1px solid #E4E8EB"><p style="margin:0;font-family:Manrope,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;color:#1656D6;font-weight:700">${escapeHtml(journey.label)}</p><p style="margin:2px 0 0;font-family:Manrope,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:#12161C;font-weight:700">${escapeHtml(journey.value)}</p><p style="margin:2px 0 0;font-family:Manrope,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:19px;color:#5A6672">${escapeHtml(journey.detail)}</p></td></tr>`).join("");
  const link = portalLink(view.reference);
  const whatsapp = `https://wa.me/50488668704?text=${encodeURIComponent(`Hola, le escribo sobre mi reserva ${view.reference} (${view.destination}).`)}`;
  const body = cancelled
    ? emailText(`Hola, ${escapeHtml(name)}:`) + emailText(`Le informamos que la reserva ${escapeHtml(view.reference)} a ${escapeHtml(view.destination)} fue cancelada. Si tiene preguntas, su asesor le atiende por WhatsApp o respondiendo a este correo.`)
    : [
      emailText(`Hola, ${escapeHtml(name)}:`),
      emailText(`Su itinerario de viaje a <strong>${escapeHtml(view.destination)}</strong> está listo. Lo adjuntamos en PDF y también lo encuentra en Mi viaje, junto con sus documentos, pagos y mensajes con su asesor.`),
      `<div style="margin:24px 0 8px">${emailButton(link, "Ver mi viaje")}</div>`,
      emailText(`Para entrar necesitará su código de reserva <strong style="white-space:nowrap">${escapeHtml(view.reference)}</strong>, su apellido y el código de verificación que le enviaremos a este correo.`, "font-size:13px;line-height:20px;color:#5A6672;text-align:center"),
      emailHeading("Su viaje de un vistazo"),
      emailFacts(facts),
      journeys.length ? emailHeading("Vuelos · horarios locales") + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${flightRows}</table>` : "",
      emailHeading("Antes de viajar"),
      emailText("Revise que los nombres coincidan con el documento de viaje de cada persona, verifique los requisitos de entrada de su destino y haga el check-in en línea con la aerolínea cuando se habilite.", "font-size:15px;line-height:23px"),
      emailHeading("¿Necesita ayuda?"),
      emailText(`Escríbanos por <a href="${escapeHtml(whatsapp)}" style="color:#1656D6;font-weight:700">WhatsApp</a>, envíe un mensaje desde Mi viaje o responda a este correo.`, "font-size:15px;line-height:23px"),
      emailText("Buen viaje,<br>El equipo de viatour", "margin-top:24px"),
    ].join("");
  const text = [
    `Hola, ${name}:`,
    "",
    cancelled ? `La reserva ${view.reference} a ${view.destination} fue cancelada. Si tiene preguntas, escríbanos por WhatsApp o responda a este correo.` : `Su itinerario de viaje a ${view.destination} está listo. Lo adjuntamos en PDF.`,
    "",
    ...facts.map(([label, value]) => `${label}: ${value}`),
    ...(journeys.length && !cancelled ? ["", "Vuelos (horarios locales):", ...journeys.map(journey => `- ${journey.label}: ${journey.value} · ${journey.detail}`)] : []),
    "",
    `Ver mi viaje: ${link}`,
    `(Necesitará su código de reserva ${view.reference}, su apellido y el código de verificación que le enviaremos a este correo.)`,
    "",
    "WhatsApp: +504 8866-8704 · soporte@miviatour.com",
    "",
    "Buen viaje,",
    "El equipo de viatour",
  ].join("\n");
  const html = emailLayout({ title: subject, preheader, hero: { eyebrow: cancelled ? "Actualización de su reserva" : "Su itinerario está listo", title: cancelled ? `Reserva ${view.reference}` : `Su viaje a ${view.destination}`, lines: [dates, `Reserva ${view.reference}`] }, body, footer: emailFooter(view.reference) });
  return { subject, preheader, text, html };
}

// "We received your payment": the receipt PDF is attached; this message only confirms and points to it.
export function receiptEmail(receipt: { number: string; snapshot: { customer: string; reservation: string; amount: number; currency: "USD" | "HNL"; date: string; balance: number } }): CustomerEmail & { preheader: string } {
  const r = receipt.snapshot;
  const amount = formatAmount(Number(r.amount), r.currency);
  const balance = Number(r.balance) <= 0 ? "Pagada en su totalidad" : formatAmount(Number(r.balance), r.currency);
  const subject = `Recibimos su pago | Recibo ${receipt.number}`;
  const preheader = `Pago de ${amount} registrado en su reserva ${r.reservation}. Adjuntamos su recibo.`;
  const link = portalLink(r.reservation);
  const facts: [string, string][] = [["Recibo", receipt.number], ["Reserva", r.reservation], ["Fecha del pago", formatTripDate(r.date, "es", "long")], ["Monto recibido", amount], ["Saldo de la reserva", balance]];
  const body = [
    emailText(`Hola, ${escapeHtml(firstName(r.customer))}:`),
    emailText(`Registramos su pago de <strong>${escapeHtml(amount)}</strong> en la reserva ${escapeHtml(r.reservation)}. Adjuntamos su recibo en PDF.`),
    emailFacts(facts),
    `<div style="margin:24px 0 8px">${emailButton(link, "Ver mis pagos en Mi viaje")}</div>`,
    emailText("Gracias por su confianza,<br>El equipo de viatour", "margin-top:24px"),
  ].join("");
  const text = [`Hola, ${firstName(r.customer)}:`, "", `Registramos su pago de ${amount} en la reserva ${r.reservation}. Adjuntamos su recibo en PDF.`, "", ...facts.map(([label, value]) => `${label}: ${value}`), "", `Ver mis pagos en Mi viaje: ${link}`, "", "WhatsApp: +504 8866-8704 · soporte@miviatour.com", "", "Gracias por su confianza,", "El equipo de viatour"].join("\n");
  return { subject, preheader, text, html: emailLayout({ title: subject, preheader, hero: { eyebrow: "Pago registrado", title: amount, lines: [`Recibo ${receipt.number}`, `Reserva ${r.reservation}`] }, body, footer: emailFooter(r.reservation) }) };
}
