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

export async function notifySubmission(kind: "lead" | "review", id: string, fields: unknown) {
  try {
    await sendResendEmail({
      idempotencyKey: `${kind}/${id}`,
      from: siteConfig.supportEmail,
      to: [siteConfig.supportEmail],
      subject: kind === "lead" ? "Nueva solicitud de cotización — viatour" : "Nueva opinión pendiente de revisión — viatour",
      text: `Registro: ${id}\n\nDatos enviados:\n${JSON.stringify(fields, null, 2)}`,
    });
  } catch (error) { captureNotificationFailure(kind, id, error); }
}
