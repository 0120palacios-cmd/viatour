"use server";

import { requireAdmin } from "@/lib/admin";
import { getAdminReservation } from "@/lib/reservation-data";
import { getTravel } from "@/lib/travel-data";
import { renderItineraryPdf } from "@/lib/itinerary-pdf";
import { renderTravelCalendar } from "@/lib/travel-calendar";
import { expandedDetails, sanitizeDetails } from "@/lib/quotation-details";
import { itineraryEmail } from "@/lib/travel-email";
import { validUuid } from "@/lib/quotation-validation";
import { siteConfig } from "@/lib/site-config";
import { testRecipients } from "@/lib/test-recipients";

// Internal test of the itinerary email: same PDF, calendar and message as the real send, delivered only to
// an address on the owner-approved TRAVEL_TEST_RECIPIENTS list, never to the customer, never recorded as a
// delivery. Without that list the test is disabled.
export async function sendItineraryTest(_: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const { client } = await requireAdmin();
  const allowed = testRecipients();
  if (!process.env.RESEND_API_KEY || !allowed.length) return { error: "La prueba interna está deshabilitada: configure RESEND_API_KEY y TRAVEL_TEST_RECIPIENTS con los correos internos aprobados." };
  const id = String(form.get("id") ?? "");
  const testRecipient = String(form.get("testRecipient") ?? "").trim().toLowerCase();
  if (!validUuid(id)) return { error: "Reserva inválida." };
  if (!allowed.includes(testRecipient)) return { error: "Ese correo no está en la lista de destinatarios de prueba aprobados." };

  const [record, travel] = await Promise.all([getAdminReservation(client, id), getTravel(client, id)]);
  if (!record || !travel.data || !travel.data.reviewed || !travel.data.passengers.length) return { error: "Complete y revise el expediente antes de enviar." };
  const r = record.reservation;
  if (testRecipient === r.cliente_email.trim().toLowerCase()) return { error: "El correo de prueba no puede ser el del cliente." };

  let pdf: Buffer;
  let calendar: string | null = null;
  try {
    pdf = await renderItineraryPdf(r, travel.data, travel.revision);
    if (expandedDetails(sanitizeDetails(r.accepted_snapshot?.quotation.detalles)).vuelos.journeys.some(j => j.segmentos.length)) calendar = renderTravelCalendar(r, travel.revision);
  } catch {
    return { error: "No se pudo generar el itinerario de prueba." };
  }
  const email = itineraryEmail(r, travel.data);
  const attachments = [{ filename: `itinerario-${r.codigo}.pdf`, content: pdf.toString("base64") }, ...(calendar ? [{ filename: `itinerario-${r.codigo}.ics`, content: Buffer.from(calendar).toString("base64") }] : [])];
  const banner = `<div style="padding:12px;background:#FFF3CD;border:1px solid #FFE69C;font-family:Arial,sans-serif;font-size:14px"><strong>PRUEBA INTERNA — NO ENVIADA AL CLIENTE</strong></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: siteConfig.supportEmail, to: [testRecipient], reply_to: siteConfig.supportEmail, subject: `[PRUEBA INTERNA] ${email.subject}`, text: `PRUEBA INTERNA — NO ENVIADA AL CLIENTE\n\n${email.text}`, html: email.html.replace(/<body([^>]*)>/, `<body$1>${banner}`), attachments }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { error: `Resend rechazó la prueba (${response.status}).` };
    return { success: `Prueba enviada únicamente a ${testRecipient}. No se registró como envío al cliente.` };
  } catch {
    return { error: "No se pudo enviar la prueba." };
  }
}
