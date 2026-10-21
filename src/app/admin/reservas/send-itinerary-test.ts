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

export async function sendItineraryTest(
  _: { error?: string; success?: string },
  form: FormData
): Promise<{ error?: string; success?: string }> {
  const { client } = await requireAdmin();

  if (!process.env.RESEND_API_KEY) {
    return { error: "RESEND_API_KEY no está configurado." };
  }

  const id = String(form.get("id") ?? "");
  const testRecipient = String(form.get("testRecipient") ?? "").trim();

  if (!validUuid(id)) {
    return { error: "Reserva inválida." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)) {
    return { error: "Correo de prueba inválido." };
  }

  const [record, travel] = await Promise.all([
    getAdminReservation(client, id),
    getTravel(client, id)
  ]);

  if (!record || !travel.data || !travel.data.reviewed || !travel.data.passengers.length) {
    return { error: "Complete y revise el expediente antes de enviar." };
  }

  const r = record.reservation;

  let pdf: Buffer;
  let calendar: string | null = null;

  try {
    pdf = await renderItineraryPdf(r, travel.data, travel.revision);

    if (
      expandedDetails(
        sanitizeDetails(r.accepted_snapshot?.quotation.detalles)
      ).vuelos.journeys.some(j => j.segmentos.length)
    ) {
      calendar = renderTravelCalendar(r, travel.revision);
    }
  } catch {
    return { error: "No se pudo generar el itinerario de prueba." };
  }

  const email = itineraryEmail(r, travel.data);

  const attachments = [
    {
      filename: `itinerario-${r.codigo}.pdf`,
      content: pdf.toString("base64")
    },
    ...(calendar
      ? [{
          filename: `itinerario-${r.codigo}.ics`,
          content: Buffer.from(calendar).toString("base64")
        }]
      : [])
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: siteConfig.supportEmail,
        to: [testRecipient],
        reply_to: siteConfig.supportEmail,
        subject: `[PRUEBA INTERNA] Su itinerario ${r.codigo} | viatour`,
        text:
          "PRUEBA INTERNA — NO ENVIADA AL CLIENTE\n\n" +
          email.text,
        html:
          `<div style="padding:12px;background:#fff3cd;border:1px solid #ffe69c;margin-bottom:20px;font-family:Arial,sans-serif">
            <strong>PRUEBA INTERNA — NO ENVIADA AL CLIENTE</strong>
          </div>` +
          email.html,
        attachments
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      return { error: `Resend rechazó la prueba (${response.status}).` };
    }

    return {
      success: `Prueba enviada únicamente a ${testRecipient}. No se registró como envío al cliente.`
    };
  } catch {
    return { error: "No se pudo enviar la prueba." };
  }
}
