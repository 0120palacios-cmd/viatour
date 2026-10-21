"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketPanel } from "@/components/portal/ticket-panel";
import { messageMaxLength, messageTopics, type MessageTopic } from "@/lib/reservation-messages";

type Message = { id: string; sender: "cliente" | "agencia"; topic: MessageTopic | null; body: string; created_at: string; unread?: boolean };
type State = { status: "loading" | "ready" | "unavailable" | "error"; messages: Message[] };

// "Messages about this trip": the conversation belongs to the reservation of the signed-in session (the
// API never takes a reservation ID). In the admin preview it shows the stored conversation read-only.
export function MessagesPanel({ mode, initial, whatsappHref }: { mode: "customer" | "preview"; initial?: { available: boolean; messages: Message[] }; whatsappHref: string }) {
  const t = useTranslations("trip.messages");
  const locale = useLocale();
  const [state, setState] = useState<State>(initial ? { status: initial.available ? "ready" : "unavailable", messages: initial.messages } : { status: "loading", messages: [] });
  const [topic, setTopic] = useState<MessageTopic | "">("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const preview = mode === "preview";

  useEffect(() => {
    if (preview) return;
    let active = true;
    fetch("/api/mi-reserva/mensajes", { cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then(result => { if (active) setState({ status: result.available ? "ready" : "unavailable", messages: result.messages ?? [] }); })
      .catch(() => { if (active) setState({ status: "error", messages: [] }); });
    return () => { active = false; };
  }, [preview]);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [state.messages.length]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || busy) return;
    const text = body.trim();
    if (!text) return;
    if (text.length > messageMaxLength) { setNotice({ tone: "error", text: t("tooLong") }); return; }
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/mi-reserva/mensajes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text, topic: topic || null }) });
      const result = await response.json().catch(() => ({}));
      if (result.available === false) { setState(current => ({ ...current, status: "unavailable" })); return; }
      if (!response.ok || !result.message) throw new Error(typeof result.error === "string" ? result.error : t("error"));
      setState(current => ({ status: "ready", messages: [...current.messages, result.message] }));
      setBody(""); setTopic("");
      setNotice({ tone: "ok", text: t("sent") });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error && error.message ? error.message : t("error") });
    } finally {
      setBusy(false);
    }
  }

  const time = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tegucigalpa" });

  if (state.status === "unavailable" || state.status === "error") {
    return <div className="space-y-4">
      <p className="t-small rounded-card border border-line bg-surface p-4 font-normal text-ink-soft">{t("unavailable")} <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-4 hover:underline">{t("whatsapp")}</a></p>
      {/* Until the conversation table exists, the support requests the portal already had keep working. */}
      {!preview && state.status === "unavailable" ? <TicketPanel /> : null}
    </div>;
  }

  return <div className="space-y-4">
    <div className="rounded-card border border-line bg-surface">
      {state.status === "loading" ? <p className="t-small p-4 font-normal text-ink-soft" role="status">{t("loading")}</p>
        : state.messages.length ? <ol ref={list} aria-label={t("label")} className="max-h-[28rem] space-y-3 overflow-y-auto p-3 sm:p-4">
          {state.messages.map(message => {
            const mine = message.sender === "cliente";
            return <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <article className={`max-w-[85%] rounded-card px-4 py-3 ${mine ? "bg-brand-tint text-ink" : "border border-line bg-canvas text-ink"}`}>
                <p className="t-small flex flex-wrap items-center gap-x-2 font-semibold">
                  <span className={mine ? "text-brand-deep" : "text-ink"}>{mine ? t("you") : t("agency")}</span>
                  {message.topic ? <span className="font-normal text-ink-soft">· {t(`topics.${message.topic}`)}</span> : null}
                  {message.unread ? <span className="rounded-btn bg-brand px-2 text-[12px] leading-5 text-white">{t("new")}</span> : null}
                </p>
                <p className="t-body mt-1 whitespace-pre-wrap break-words">{message.body}</p>
                <p className="t-small mt-1 font-normal text-ink-soft"><time dateTime={message.created_at}>{time.format(new Date(message.created_at))}</time></p>
              </article>
            </li>;
          })}
        </ol> : <p className="t-small p-4 font-normal text-ink-soft">{t("empty")}</p>}
    </div>

    <form onSubmit={submit} className="space-y-4" aria-describedby="trip-message-help">
      <fieldset disabled={preview || busy} className="space-y-4">
        <legend className="t-small font-semibold text-ink">{t("topic")}</legend>
        <div className="flex flex-wrap gap-2">
          {messageTopics.map(value => <label key={value} className={`t-small inline-flex min-h-11 cursor-pointer items-center rounded-btn border px-4 transition-colors duration-(--duration-fast) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${topic === value ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-canvas text-ink hover:border-brand"}`}>
            <input type="radio" name="topic" value={value} checked={topic === value} onChange={() => setTopic(value)} onClick={() => { if (topic === value) setTopic(""); }} className="sr-only" />
            {t(`topics.${value}`)}
          </label>)}
        </div>
        <label className="block">
          <span className="sr-only">{t("placeholder")}</span>
          <textarea value={body} onChange={event => setBody(event.target.value)} maxLength={messageMaxLength} rows={4} required placeholder={t("placeholder")} className="t-body w-full resize-y rounded-btn border border-line bg-canvas px-4 py-3 placeholder:text-ink-soft focus-visible:border-brand" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id="trip-message-help" className="t-small font-normal text-ink-soft">{preview ? t("previewDisabled") : `${body.length}/${messageMaxLength}`}</p>
          <Button type="submit" disabled={preview || busy || !body.trim()}><Send size={18} strokeWidth={1.75} aria-hidden="true" />{busy ? t("sending") : t("send")}</Button>
        </div>
      </fieldset>
      <p role="status" aria-live="polite" className={`t-small ${notice?.tone === "error" ? "text-error" : "text-success"}`}>{notice?.text}</p>
    </form>
  </div>;
}
