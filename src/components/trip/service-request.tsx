"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { CheckCircle2, MessageCircle, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { OfferKey } from "@/lib/trip-offers";
import { requestNoteMaxLength } from "@/lib/trip-requests";

// "Cotizar auto", "Agregar traslado"...: asks for one additional service. The request is saved first
// (the agency's record, with the reservation, destination and dates read on the server); only then does the
// traveller see the option to continue on WhatsApp, opened by their own tap. In the admin preview the
// button is shown but does nothing.

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; text: string } | { kind: "sent" };

// `title`: the service name already worded for this trip ("¿Necesita un auto en Miami?").
export function ServiceRequestButton({ service, endpoint, label, title, className, whatsappHref, children }: { service: OfferKey; endpoint?: string; label: string; title: string; className: string; whatsappHref: string; children?: React.ReactNode }) {
  const t = useTranslations("trip.request");
  const offer = useTranslations("trip.offers.items");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const titleId = useId(), noteId = useId(), hintId = useId();
  const done = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (status.kind === "sent") done.current?.focus(); }, [status.kind]);

  if (!endpoint) return <span className={`${className} cursor-not-allowed opacity-60`} aria-disabled="true" title={t("previewDisabled")}>{children ?? label}</span>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      const response = await fetch(endpoint!, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service, note: note.trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(typeof result.error === "string" ? result.error : t("error"));
      setStatus({ kind: "sent" });
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error && error.message ? error.message : t("error") });
    }
  }

  const continueHref = `${whatsappHref}${encodeURIComponent(note.trim() ? ` ${t("whatsappNote", { note: note.trim() })}` : "")}`;
  return <Dialog.Root open={open} onOpenChange={value => { setOpen(value); if (!value && status.kind !== "sending") { setStatus({ kind: "idle" }); setNote(""); } }}>
    <Dialog.Trigger asChild><button type="button" className={className}>{children ?? label}</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <Dialog.Content aria-labelledby={titleId} aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-panel bg-canvas px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 shadow-md data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(32rem,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel sm:p-8 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <Dialog.Title id={titleId} className="t-h3 text-ink">{title}</Dialog.Title>
          <Dialog.Close className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-btn text-ink-soft hover:bg-surface hover:text-ink" aria-label={t("close")}><X size={22} strokeWidth={1.75} aria-hidden="true" /></Dialog.Close>
        </div>
        {status.kind === "sent" ? <div role="status" className="mt-4 space-y-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={26} strokeWidth={1.75} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <div className="space-y-1"><h3 ref={done} tabIndex={-1} className="font-semibold text-ink outline-none">{t("sentTitle")}</h3><p className="t-small font-normal text-ink-soft">{t("sentBody")}</p></div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={continueHref} target="_blank" rel="noopener noreferrer" className={`${buttonVariants({ variant: "whatsapp" })} w-full sm:w-auto`}><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{t("continueWhatsapp")}</a>
            <Dialog.Close className={`${buttonVariants({ variant: "ghost" })} w-full sm:w-auto`}>{t("done")}</Dialog.Close>
          </div>
          <p className="t-small font-normal text-ink-soft">{t("sentFallback")}</p>
        </div> : <form onSubmit={submit} className="mt-2 space-y-4">
          <p className="t-body text-ink-soft">{t("intro")}</p>
          <label htmlFor={noteId} className="block">
            <span className="t-small font-semibold text-ink">{t("noteLabel")}</span>
            <textarea id={noteId} value={note} onChange={event => setNote(event.target.value.slice(0, requestNoteMaxLength))} maxLength={requestNoteMaxLength} rows={3} aria-describedby={hintId} placeholder={offer(`${service}.placeholder`)} className="t-body mt-2 block w-full resize-y rounded-btn border border-line bg-canvas px-3 py-3 placeholder:text-ink-soft focus-visible:border-brand" />
            <span id={hintId} className="t-small mt-1 block font-normal text-ink-soft">{t("noteHint")}</span>
          </label>
          {status.kind === "error" ? <p role="alert" className="t-small text-error">{status.text}</p> : null}
          <button type="submit" disabled={status.kind === "sending"} className={`${buttonVariants({ variant: "default" })} w-full`}>{status.kind === "sending" ? t("sending") : t("submit")}</button>
          <p className="t-small font-normal text-ink-soft">{t("privacy")}</p>
        </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
