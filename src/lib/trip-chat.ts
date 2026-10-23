// One conversation shape for the Mi viaje chat, whichever store backs it:
// - "messages": reservation_messages (docs/sql/reservation_messages.sql), once applied, with attachments
//   once docs/sql/mi_viaje_premium.sql is applied;
// - "requests": the support_tickets table that already exists, as a fallback. Each request is the
//   traveller's message, and the agency's reply (when there is one) follows it.
// Pure, so it can be tested and shared by the portal, the chat screen and the admin preview.

import type { MessageTopic, ReservationMessage } from "@/lib/reservation-messages";
import type { ChatAttachment } from "@/lib/chat-attachments";

export type ChatSource = "messages" | "requests";
export type ChatMessage = { id: string; from: "me" | "agency"; topic: string; body: string; at: string | null; unread: boolean; attachments: ChatAttachment[] };
export type ChatSummary = { source: ChatSource; last: ChatMessage | null; unread: number; count: number };
export type SupportRequest = { id: string; asunto: string; mensaje: string; estado: string; created_at: string; respuesta: string | null };

export function fromMessages(messages: (Pick<ReservationMessage, "id" | "sender" | "topic" | "body" | "created_at" | "customer_read_at"> & { attachments?: ChatAttachment[] })[]): ChatMessage[] {
  return messages.map(message => ({ id: message.id, from: message.sender === "cliente" ? "me" : "agency", topic: message.topic ?? "", body: message.body, at: message.created_at, unread: message.sender === "agencia" && !message.customer_read_at, attachments: message.attachments ?? [] }));
}

// Requests arrive newest first; the conversation reads oldest first. A reply has no timestamp of its own.
export function fromRequests(requests: SupportRequest[]): ChatMessage[] {
  return [...requests].sort((a, b) => a.created_at.localeCompare(b.created_at)).flatMap(request => [
    { id: `${request.id}-q`, from: "me" as const, topic: request.asunto, body: request.mensaje, at: request.created_at, unread: false, attachments: [] },
    ...(request.respuesta?.trim() ? [{ id: `${request.id}-r`, from: "agency" as const, topic: "", body: request.respuesta.trim(), at: null, unread: false, attachments: [] }] : []),
  ]);
}

export function chatSummary(source: ChatSource, messages: ChatMessage[]): ChatSummary {
  return { source, last: messages.at(-1) ?? null, unread: messages.filter(message => message.unread).length, count: messages.length };
}

// A support request needs a subject: the chosen topic, else the start of the message.
export function requestSubject(body: string, topicLabel: string) {
  if (topicLabel) return topicLabel;
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}...` : line;
}

export const chatTopics: MessageTopic[] = ["vuelo", "cambios", "pagos", "documentos", "hotel", "otro"];

// Date separators and "today" in the agency's time zone, so a conversation reads the same for both sides.
export const chatTimeZone = "America/Tegucigalpa";
export function chatDayKey(at: string | null) {
  return at ? new Intl.DateTimeFormat("en-CA", { timeZone: chatTimeZone }).format(new Date(at)) : "";
}
