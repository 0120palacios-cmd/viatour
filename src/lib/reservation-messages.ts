// Reservation conversation shared by the traveller portal and the admin reservation page.
// Tables: docs/sql/reservation_messages.sql (messages) and docs/sql/mi_viaje_premium.sql (attachments).
// Until the first is applied every read reports `available: false` and the portal falls back to support
// requests and WhatsApp; until the second is applied, `attachments: false` and no file can be attached.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatAttachment } from "@/lib/chat-attachments";

export const messageTopics = ["vuelo", "hotel", "documentos", "cambios", "pagos", "otro"] as const;
export type MessageTopic = (typeof messageTopics)[number];
export const messageMaxLength = 2000;

export type ReservationMessage = { id: string; sender: "cliente" | "agencia"; topic: MessageTopic | null; body: string; created_at: string; customer_read_at: string | null; agency_read_at: string | null; attachments?: ChatAttachment[] };
export type MessageThread = { available: boolean; attachments?: boolean; messages: ReservationMessage[] };

const fields = "id,sender,topic,body,created_at,customer_read_at,agency_read_at";

// PostgREST answers PGRST205 (and Postgres 42P01) when the table does not exist yet.
export function missingTable(error: { code?: string } | null | undefined) {
  return Boolean(error && ["PGRST205", "42P01", "PGRST202"].includes(String(error.code)));
}

// `withAttachment`: the message carries a file, so its text may be empty (customer messages only).
export function validateMessage(input: { body: unknown; topic: unknown }, options: { withAttachment?: boolean } = {}): { body: string; topic: MessageTopic | null } | null {
  const body = typeof input.body === "string" ? input.body.replace(/\r\n/g, "\n").trim() : options.withAttachment && (input.body === undefined || input.body === null) ? "" : null;
  if (body === null || (!body && !options.withAttachment) || body.length > messageMaxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body)) return null;
  const topic = typeof input.topic === "string" && (messageTopics as readonly string[]).includes(input.topic) ? input.topic as MessageTopic : null;
  if (input.topic && input.topic !== "" && !topic) return null;
  return { body, topic };
}

export async function readThread(client: SupabaseClient, reservationId: string, limit = 200): Promise<MessageThread> {
  const result = await client.from("reservation_messages").select(fields).eq("reservation_id", reservationId).order("created_at", { ascending: true }).limit(limit);
  if (missingTable(result.error)) return { available: false, attachments: false, messages: [] };
  if (result.error) throw new Error("No se pudieron cargar los mensajes.");
  const messages = (result.data ?? []) as ReservationMessage[];
  // Attachments of this reservation only; their table may not exist yet.
  const files = await client.from("reservation_message_attachments").select("id,message_id,name,mime,size").eq("reservation_id", reservationId).limit(400);
  if (files.error) return { available: true, attachments: false, messages };
  const byMessage = new Map<string, ChatAttachment[]>();
  for (const file of (files.data ?? []) as (ChatAttachment & { message_id: string })[]) byMessage.set(file.message_id, [...(byMessage.get(file.message_id) ?? []), { id: file.id, name: file.name, mime: file.mime, size: file.size }]);
  return { available: true, attachments: true, messages: messages.map(message => byMessage.has(message.id) ? { ...message, attachments: byMessage.get(message.id) } : message) };
}

export function unreadFor(thread: MessageThread, reader: "cliente" | "agencia") {
  return thread.messages.filter(message => message.sender !== reader && !(reader === "cliente" ? message.customer_read_at : message.agency_read_at)).length;
}
