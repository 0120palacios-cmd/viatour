import "server-only";
import * as Sentry from "@sentry/nextjs";
import { siteConfig } from "@/lib/site-config";

export function captureNotificationFailure(kind: string, reference: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown notification error";
  console.error("Notification email failed", { kind, reference, error: message });
  Sentry?.captureException?.(error instanceof Error ? error : new Error(message), {
    tags: { notification_kind: kind },
    extra: { notification_reference: reference },
  });
}

export async function sendResendEmail(input: { idempotencyKey: string; from: string; to: string[]; replyTo?: string; subject: string; text: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing Resend configuration");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({ from: input.from, to: input.to, reply_to: input.replyTo, subject: input.subject, text: input.text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
}

type LeadNotice = { servicio?: string; referencia?: string; fields?: Record<string, string>; contacto?: { telefono?: string; email?: string }; origen?: Record<string, string> };

// Labeled lines in the same order as the WhatsApp message, readable on a phone.
export function leadNotificationText(id: string, lead: LeadNotice) {
  const lines = [`Referencia: ${lead.referencia || "—"}`, `Servicio: ${lead.servicio || "—"}`, "", ...Object.entries(lead.fields ?? {}).filter(([, value]) => String(value ?? "").trim()).map(([label, value]) => `${label}: ${value}`)];
  const phone = lead.contacto?.telefono?.replace(/\D/g, "");
  if (phone) lines.push("", `Escribir al cliente por WhatsApp: https://wa.me/${phone}`);
  const origin = Object.entries(lead.origen ?? {}).map(([key, value]) => `${key}: ${value}`).join(" · ");
  if (origin) lines.push("", `Origen web: ${origin}`);
  lines.push("", `Ver en la administración: ${siteConfig.url}/admin/leads?q=${encodeURIComponent(lead.referencia || "")}`, `Registro: ${id}`);
  return lines.join("\n");
}

export async function notifySubmission(kind: "lead" | "review", id: string, fields: unknown) {
  const lead = kind === "lead" && typeof fields === "object" && fields !== null ? fields as LeadNotice : null;
  const summary = lead ? [lead.referencia, lead.servicio, lead.fields?.Destino].filter(Boolean).join(" · ") : "";
  try {
    await sendResendEmail({
      idempotencyKey: `${kind}/${id}`,
      from: siteConfig.supportEmail,
      to: [siteConfig.supportEmail],
      subject: kind === "lead" ? `Nueva solicitud de cotización${summary ? ` — ${summary}` : ""} — viatour` : "Nueva opinión pendiente de revisión — viatour",
      text: lead ? leadNotificationText(id, lead) : `Registro: ${id}\n\nDatos enviados:\n${JSON.stringify(fields, null, 2)}`,
    });
  } catch (error) { captureNotificationFailure(kind, id, error); }
}
