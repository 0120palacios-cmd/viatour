import "server-only";
import { siteConfig } from "@/lib/site-config";

export async function notifySubmission(kind: "lead" | "review", id: string, fields: unknown) {
  try {
    if (!process.env.RESEND_API_KEY) throw new Error("Missing Resend configuration");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `${kind}/${id}` },
      body: JSON.stringify({ from: siteConfig.supportEmail, to: [siteConfig.supportEmail], subject: kind === "lead" ? "Nueva solicitud de cotización — viatour" : "Nueva opinión pendiente de revisión — viatour", text: `Registro: ${id}\n\nDatos enviados:\n${JSON.stringify(fields, null, 2)}` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
  } catch (error) { console.error("Notification email failed", { kind, id, error: error instanceof Error ? error.message : "Unknown error" }); }
}
