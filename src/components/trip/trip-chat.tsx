"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, FileText, ImageIcon, MessageCircle, MessagesSquare, Paperclip, RotateCw, SendHorizontal, X } from "lucide-react";
import { messageMaxLength, type MessageTopic } from "@/lib/reservation-messages";
import { attachmentMaxBytes, isImageAttachment, type ChatAttachment } from "@/lib/chat-attachments";
import { chatDayKey, chatTimeZone, fromMessages, fromRequests, requestSubject, type ChatMessage, type ChatSource } from "@/lib/trip-chat";

type Delivery = "sending" | "failed";
type Item = ChatMessage & { delivery?: Delivery; draft?: { body: string; topic: MessageTopic | null; file: File | null } };
type State = { status: "loading" | "ready" | "error"; source: ChatSource; attachments: boolean; messages: Item[] };
type Suggestion = { topic: MessageTopic; key: "flight" | "add" | "change" | "payment" };
const suggestions: Suggestion[] = [{ topic: "vuelo", key: "flight" }, { topic: "cambios", key: "change" }, { topic: "otro", key: "add" }, { topic: "pagos", key: "payment" }];
const accepted = "image/jpeg,image/png,image/webp,application/pdf";
const topicKeys = { vuelo: 1, hotel: 1, documentos: 1, cambios: 1, pagos: 1, otro: 1 };

// Plain strings (they cross from the server page to this client component); an attachment opens at `${attachments}/${id}`.
export type ChatEndpoints = { messages: string; requests: string; attachments: string };
const customerEndpoints: ChatEndpoints = { messages: "/api/mi-reserva/mensajes", requests: "/api/mi-reserva/tickets", attachments: "/api/mi-reserva/mensajes/adjuntos" };

// Client-side IDs and times for messages not yet confirmed by the server (module scope: not render logic).
let localSequence = 0;
const stamp = (prefix: string) => ({ id: `${prefix}-${Date.now()}-${++localSequence}`, at: new Date().toISOString() });

const size = (bytes: number, locale: string) => bytes >= 1024 * 1024 ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Photos are redrawn in the browser before upload: smaller (at most 2400 px), upright, and without the
// camera and location data phones embed. The server re-encodes them again; this keeps uploads light.
async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Upload with progress (fetch cannot report upload progress); resolves with the parsed JSON response.
function post(url: string, body: FormData | string, onProgress: (value: number) => void): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    if (typeof body === "string") request.setRequestHeader("Content-Type", "application/json");
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => { let data = {}; try { data = JSON.parse(request.responseText); } catch {} resolve({ status: request.status, data }); };
    request.onerror = () => reject(new Error("network"));
    request.send(body);
  });
}

// The traveller's conversation with the agency, as a chat. The reservation always comes from the session
// cookie on the server; this component never sends a reservation ID. It reads the conversation table when
// it exists and otherwise the support requests, so the screen works before the messages SQL is applied.
export function TripChat({ mode, initial, reference, whatsappHref, backHref, endpoints = customerEndpoints }: { mode: "customer" | "preview"; initial?: { source: ChatSource; attachments?: boolean; messages: ChatMessage[] }; reference: string; whatsappHref: string; backHref: string; endpoints?: ChatEndpoints }) {
  const t = useTranslations("trip.chat");
  const topicLabel = useTranslations("trip.messages.topics");
  const locale = useLocale();
  const preview = mode === "preview";
  const [state, setState] = useState<State>(initial ? { status: "ready", source: initial.source, attachments: Boolean(initial.attachments), messages: initial.messages } : { status: "loading", source: "messages", attachments: false, messages: [] });
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<MessageTopic | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [firstUnread] = useState(() => initial?.messages.find(message => message.unread)?.id ?? null);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const preview_ = useMemo(() => file && isImageAttachment(file.type) ? URL.createObjectURL(file) : null, [file]);
  useEffect(() => () => { if (preview_) URL.revokeObjectURL(preview_); }, [preview_]);

  async function load() {
    setState(current => ({ ...current, status: "loading" }));
    try {
      const response = await fetch(endpoints.messages, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const result = await response.json();
      if (result.available) { setState({ status: "ready", source: "messages", attachments: Boolean(result.attachments), messages: fromMessages(result.messages.map((message: { unread?: boolean }) => ({ ...message, customer_read_at: message.unread ? null : "seen" }))) }); return; }
      // Conversation table not applied yet: the support requests carry the conversation.
      const requests = await fetch(endpoints.requests, { cache: "no-store" });
      if (!requests.ok) throw new Error(String(requests.status));
      setState({ status: "ready", source: "requests", attachments: false, messages: fromRequests((await requests.json()).tickets ?? []) });
    } catch {
      setState(current => ({ ...current, status: "error" }));
    }
  }

  useEffect(() => {
    if (preview || initial) return;
    let active = true;
    // Deferred so the first render is the loading state, then the data.
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per mount
  }, []);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [state.messages.length, state.status]);

  // Grows with the text up to about six lines, then scrolls.
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 176)}px`;
  }, [body]);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!picked) return;
    setNotice(null);
    if (!accepted.split(",").includes(picked.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(picked.name)) { setNotice({ tone: "error", text: t("attachType") }); return; }
    setPreparing(true);
    const ready = picked.type === "application/pdf" ? picked : await prepareImage(picked);
    setPreparing(false);
    if (ready.size > attachmentMaxBytes) { setNotice({ tone: "error", text: t("attachTooLarge") }); return; }
    setFile(ready);
  }

  async function deliver(item: Item) {
    const draft = item.draft!;
    setProgress(draft.file ? 0 : null);
    try {
      let sent: ChatMessage;
      if (state.source === "messages") {
        let payload: FormData | string;
        if (draft.file) { const form = new FormData(); form.set("body", draft.body); if (draft.topic) form.set("topic", draft.topic); form.set("archivo", draft.file, draft.file.name); payload = form; }
        else payload = JSON.stringify({ body: draft.body, topic: draft.topic });
        const { status, data } = await post(endpoints.messages, payload, setProgress);
        if (data.available === false) { setState(current => ({ ...current, source: "requests" })); throw new Error(t("retryNow")); }
        if (data.attachments === false) setState(current => ({ ...current, attachments: false }));
        if (status >= 400 || !data.message) throw new Error(typeof data.error === "string" ? data.error : t("error"));
        sent = fromMessages([{ ...(data.message as { id: string; sender: "cliente"; topic: MessageTopic | null; body: string; created_at: string; attachments: ChatAttachment[] }), customer_read_at: null }])[0];
      } else {
        const form = new FormData();
        form.set("asunto", requestSubject(draft.body, draft.topic ? topicLabel(draft.topic) : ""));
        form.set("mensaje", draft.body);
        const response = await fetch(endpoints.requests, { method: "POST", body: form });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : t("error"));
        sent = { ...stamp("local"), from: "me", topic: draft.topic ? topicLabel(draft.topic) : "", body: draft.body, unread: false, attachments: [] };
      }
      setState(current => ({ ...current, messages: current.messages.map(message => message.id === item.id ? sent : message) }));
      setNotice({ tone: "ok", text: t("sent") });
    } catch (error) {
      setState(current => ({ ...current, messages: current.messages.map(message => message.id === item.id ? { ...message, delivery: "failed" } : message) }));
      setNotice({ tone: "error", text: error instanceof Error && error.message && error.message !== "network" ? error.message : t("error") });
    } finally {
      setProgress(null);
    }
  }

  function send(event?: React.FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (preview || (!text && !file) || state.messages.some(message => message.delivery === "sending")) return;
    if (text.length > messageMaxLength) { setNotice({ tone: "error", text: t("tooLong") }); return; }
    if (file && state.source !== "messages") { setNotice({ tone: "error", text: t("attachUnavailable") }); return; }
    const item: Item = { ...stamp("pending"), from: "me", topic: topic ? topicLabel(topic) : "", body: text, unread: false, attachments: file ? [{ id: "", name: file.name, mime: file.type as ChatAttachment["mime"], size: file.size }] : [], delivery: "sending", draft: { body: text, topic, file } };
    setState(current => ({ ...current, status: "ready", messages: [...current.messages, item] }));
    setBody(""); setTopic(null); setFile(null); setNotice(null);
    void deliver(item);
  }

  function retry(item: Item) {
    setState(current => ({ ...current, messages: current.messages.map(message => message.id === item.id ? { ...message, delivery: "sending" } : message) }));
    void deliver({ ...item, delivery: "sending" });
  }
  function discard(item: Item) {
    setState(current => ({ ...current, messages: current.messages.filter(message => message.id !== item.id) }));
    if (item.draft) { setBody(item.draft.body); setFile(item.draft.file); }
  }

  const intl = locale === "en" ? "en-US" : "es-HN";
  const time = useMemo(() => new Intl.DateTimeFormat(intl, { hour: "numeric", minute: "2-digit", timeZone: chatTimeZone }), [intl]);
  const day = useMemo(() => new Intl.DateTimeFormat(intl, { weekday: "long", day: "numeric", month: "long", timeZone: chatTimeZone }), [intl]);
  const today = chatDayKey(new Date().toISOString());
  const sending = state.messages.some(message => message.delivery === "sending");
  const canAttach = state.attachments && state.source === "messages" && !preview;

  return <section data-trip-portal aria-labelledby="chat-title" className="flex min-h-[calc(100dvh-4rem)] flex-col sm:min-h-[calc(100dvh-5rem)]">
    <header className="sticky top-16 z-10 -mx-4 flex items-center gap-3 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:top-20 sm:mx-0 sm:px-0">
      <a href={backHref} className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn text-ink hover:bg-surface" aria-label={t("back")}><ArrowLeft size={22} strokeWidth={1.75} aria-hidden="true" /></a>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white" aria-hidden="true">v</span>
      <div className="min-w-0 flex-1">
        <h1 id="chat-title" className="truncate font-bold text-ink">{t("title")}</h1>
        <p className="t-small truncate font-normal text-ink-soft">{t("subtitle", { code: reference })}</p>
      </div>
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn text-ink hover:bg-surface" aria-label={t("whatsapp")}><MessageCircle size={22} strokeWidth={1.75} aria-hidden="true" /></a>
    </header>

    <div className="flex-1 py-6" aria-busy={state.status === "loading"}>
      {state.status === "loading" ? <div className="space-y-4" role="status"><span className="sr-only">{t("loading")}</span>{[60, 40, 70].map((width, index) => <div key={index} className={`flex ${index % 2 ? "justify-end" : "justify-start"}`}><div className="skeleton h-14 rounded-card" style={{ width: `${width}%` }} /></div>)}</div>
        : state.status === "error" ? <div role="alert" className="mx-auto max-w-md space-y-4 py-10 text-center">
          <p className="font-semibold text-ink">{t("loadError")}</p>
          <p className="t-small font-normal text-ink-soft">{t("loadErrorBody")}</p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => void load()} className="t-small inline-flex min-h-11 items-center gap-2 rounded-btn border border-line px-4 font-semibold text-ink hover:bg-surface"><RotateCw size={16} strokeWidth={1.75} aria-hidden="true" />{t("retry")}</button>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline"><MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />{t("whatsapp")}</a>
          </div>
        </div>
        : state.messages.length ? <ol aria-label={t("label")} className="space-y-3">
          {state.messages.map((message, index) => {
            const mine = message.from === "me";
            const key = chatDayKey(message.at);
            const showDay = key && key !== chatDayKey(state.messages.slice(0, index).reverse().find(item => item.at)?.at ?? null);
            const grouped = index > 0 && state.messages[index - 1].from === message.from && !showDay;
            return <li key={message.id} className={grouped ? "!mt-1" : ""}>
              {message.id === firstUnread ? <p className="t-small my-4 flex items-center gap-3 font-semibold text-brand"><span className="h-px flex-1 bg-brand/30" aria-hidden="true" />{t("unreadDivider")}<span className="h-px flex-1 bg-brand/30" aria-hidden="true" /></p> : null}
              {showDay ? <p className="t-small my-4 text-center font-semibold text-ink-soft">{key === today ? t("today") : day.format(new Date(message.at!))}</p> : null}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <article className={`flex max-w-[85%] flex-col sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
                  {!mine && !grouped ? <p className="t-small mb-1 font-semibold text-ink">{t("agency")}{message.unread ? <span className="ml-2 rounded-btn bg-brand px-2 text-[12px] leading-5 text-white">{t("new")}</span> : null}</p> : null}
                  <div className={`overflow-hidden text-left ${mine ? "rounded-card rounded-br-btn bg-brand text-white" : "rounded-card rounded-bl-btn bg-surface text-ink"} ${message.delivery === "failed" ? "opacity-70" : ""}`}>
                    {message.attachments.map(file => <Attachment key={file.id || file.name} file={file} href={file.id ? `${endpoints.attachments}/${file.id}` : null} mine={mine} locale={intl} openLabel={t("attachOpen")} />)}
                    {message.topic || message.body ? <div className="px-4 py-3">
                      {message.topic ? <p className={`t-small font-semibold ${mine ? "text-white/80" : "text-ink-soft"}`}>{message.topic in topicKeys ? topicLabel(message.topic as MessageTopic) : message.topic}</p> : null}
                      {message.body ? <p className="t-body whitespace-pre-wrap break-words">{message.body}</p> : null}
                    </div> : null}
                  </div>
                  {message.delivery === "sending" ? <p className="t-small mt-1 font-normal text-ink-soft" role="status">{progress !== null && message.attachments.length ? t("uploading", { progress }) : t("sending")}</p>
                    : message.delivery === "failed" ? <p className="t-small mt-1 flex flex-wrap items-center justify-end gap-x-3 font-semibold text-error">{t("notSent")}<button type="button" onClick={() => retry(message)} className="inline-flex min-h-11 items-center gap-1 text-brand underline-offset-4 hover:underline"><RotateCw size={14} strokeWidth={2} aria-hidden="true" />{t("retry")}</button><button type="button" onClick={() => discard(message)} className="inline-flex min-h-11 items-center text-ink-soft underline-offset-4 hover:underline">{t("edit")}</button></p>
                    : message.at ? <p className="t-small mt-1 font-normal text-ink-soft"><time dateTime={message.at}>{time.format(new Date(message.at))}</time>{mine && message.id.startsWith("local-") ? ` · ${t("delivered")}` : ""}</p> : null}
                </article>
              </div>
            </li>;
          })}
        </ol>
        : <div className="mx-auto max-w-md py-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true"><MessagesSquare size={26} strokeWidth={1.75} /></span>
          <h2 className="t-h3 mt-4 text-ink">{t("emptyTitle")}</h2>
          <p className="t-small mt-2 font-normal text-ink-soft">{t("emptyBody")}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">{suggestions.map(suggestion => <li key={suggestion.key}><button type="button" disabled={preview} onClick={() => { setTopic(suggestion.topic); setBody(t(`suggestions.${suggestion.key}`)); field.current?.focus(); }} className="t-small min-h-11 rounded-full border border-line bg-canvas px-4 font-semibold text-ink transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand disabled:opacity-60">{t(`suggestions.${suggestion.key}`)}</button></li>)}</ul>
        </div>}
      {/* Clears the sticky composer when scrolling to the latest message. */}
      <div ref={end} className="scroll-mb-52" />
    </div>

    <form onSubmit={send} className="sticky bottom-0 -mx-4 border-t border-line bg-canvas px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:mx-0 sm:px-0">
      <p role="status" aria-live="polite" className={`t-small mb-2 empty:hidden ${notice?.tone === "error" ? "text-error" : "text-success"}`}>{notice?.text}</p>
      {file ? <div className="mb-2 flex items-center gap-3 rounded-card border border-line bg-surface p-2 pr-1">
        {/* A local blob preview of the chosen file: next/image cannot load it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview_ ? <img src={preview_} alt="" className="size-12 shrink-0 rounded-btn object-cover" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-btn bg-canvas text-brand" aria-hidden="true"><FileText size={22} strokeWidth={1.75} /></span>}
        <p className="t-small min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{file.name}</span><span className="block font-normal text-ink-soft">{size(file.size, intl)}</span></p>
        <button type="button" onClick={() => setFile(null)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn text-ink-soft hover:bg-canvas hover:text-ink" aria-label={t("attachRemove", { name: file.name })}><X size={18} strokeWidth={1.75} aria-hidden="true" /></button>
      </div> : null}
      {progress !== null ? <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={t("uploadLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} /></div> : null}
      <fieldset disabled={preview || state.status !== "ready"} className="flex items-end gap-2">
        <legend className="sr-only">{t("composer")}</legend>
        {canAttach ? <>
          <input ref={picker} type="file" accept={accepted} onChange={choose} className="sr-only" tabIndex={-1} aria-hidden="true" />
          <button type="button" onClick={() => picker.current?.click()} disabled={preparing || Boolean(file)} className="flex size-12 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink disabled:opacity-50" aria-label={preparing ? t("attachPreparing") : t("attach")}><Paperclip size={22} strokeWidth={1.75} aria-hidden="true" /></button>
        </> : null}
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("placeholder")}</span>
          <textarea ref={field} value={body} onChange={event => setBody(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send(); }} maxLength={messageMaxLength} rows={1} placeholder={file ? t("captionPlaceholder") : t("placeholder")} className="t-body block max-h-44 min-h-12 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 placeholder:text-ink-soft focus-visible:border-brand focus-visible:bg-canvas" />
        </label>
        <button type="submit" disabled={(!body.trim() && !file) || sending || preview} aria-label={sending ? t("sending") : t("send")} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors duration-(--duration-fast) hover:bg-brand-deep disabled:bg-line disabled:text-ink-soft"><SendHorizontal size={20} strokeWidth={2} aria-hidden="true" /></button>
      </fieldset>
      <p className="t-small mt-2 font-normal text-ink-soft">{preview ? t("previewDisabled") : <>{canAttach ? `${t("attachHint")} ` : ""}{t("footnote")} <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-4 hover:underline">{t("whatsappShort")}</a></>}</p>
    </form>
  </section>;
}

function Attachment({ file, href, mine, locale, openLabel }: { file: ChatAttachment; href: string | null; mine: boolean; locale: string; openLabel: string }) {
  const image = isImageAttachment(file.mime);
  const label = `${openLabel}: ${file.name}`;
  if (image && href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block" aria-label={label}>
    {/* Served from this site with no-store; next/image would cache a private file. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={href} alt={file.name} loading="lazy" className="block max-h-72 w-full min-w-48 object-cover" />
  </a>;
  const Icon = image ? ImageIcon : FileText;
  const inner = <><span className={`flex size-10 shrink-0 items-center justify-center rounded-btn ${mine ? "bg-white/15" : "bg-canvas text-brand"}`} aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{file.name}</span><span className={`block ${mine ? "text-white/80" : "text-ink-soft"}`}>{image ? "" : "PDF · "}{size(file.size, locale)}</span></span></>;
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`t-small flex min-w-56 items-center gap-3 border-b px-3 py-3 ${mine ? "border-white/15" : "border-line"}`}>{inner}</a>
    : <span className={`t-small flex min-w-56 items-center gap-3 border-b px-3 py-3 ${mine ? "border-white/15" : "border-line"}`}>{inner}</span>;
}
