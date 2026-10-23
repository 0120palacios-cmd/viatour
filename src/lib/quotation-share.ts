import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteConfig } from "@/lib/site-config";

// Sharing a frozen quotation version with the customer through a secure link (docs/sql/quotation_shares.sql).
// The link carries a random token; the database only keeps its SHA-256, so a stored row is never a usable link.

export const shareTemplate = "cotizacion_v1";
export const linkPlaceholder = "{enlace}";
export const maxShareMessage = 1000;
const maxShareDays = 60;

// Borrador pendiente de aprobación del propietario: mensaje de WhatsApp al cliente (usted, sin emojis).
export function defaultShareMessage({ nombre, codigo, destino }: { nombre: string; codigo: string; destino: string }) {
  const saludo = nombre.trim() ? `Buen día, ${nombre.trim()}.` : "Buen día.";
  const viaje = destino.trim() && destino !== "Por definir" ? ` para ${destino.trim()}` : "";
  return `${saludo} Le compartimos su cotización ${codigo} de viatour${viaje}. Puede revisarla y descargar el PDF aquí: ${linkPlaceholder}\n\nQuedamos atentos a sus consultas.`;
}

export function newShareToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashShareToken(token) };
}
export const hashShareToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const validShareToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);

// Production links always use the public domain; preview deployments use their own host so a test link opens
// the same (staging) database that created it.
export function shareOrigin(host: string | null) {
  if (process.env.VERCEL_ENV === "production" || !host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return siteConfig.url;
  return `${host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"}://${host}`;
}

// The link lives as long as the version's validity, and never longer than 60 days.
export function shareExpiry(validUntil: string, now = Date.now()) {
  const validity = Date.parse(validUntil);
  const cap = now + maxShareDays * 86400000;
  return new Date(Number.isFinite(validity) ? Math.min(validity, cap) : cap);
}

// The advisor edits the text freely; the link goes where {enlace} is, or at the end if it was removed.
export function composeShareMessage(text: string, url: string) {
  const clean = text.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim();
  return clean.includes(linkPlaceholder) ? clean.replace(linkPlaceholder, url) : `${clean}\n\n${url}`.trim();
}
