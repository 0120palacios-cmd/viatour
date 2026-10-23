"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { feedbackCommentMaxLength } from "@/lib/trip-requests";

// Private feedback about viatour's service (1 to 5 and an optional comment). It goes to the agency only;
// nothing the traveller sees afterwards depends on the rating. In the admin preview it is inert.
export function TripFeedback({ endpoint, initialRating = null, soft = false }: { endpoint?: string; initialRating?: number | null; soft?: boolean }) {
  const t = useTranslations("trip.feedback");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" } | { kind: "error"; text: string }>(initialRating ? { kind: "sent" } : { kind: "idle" });
  const groupId = useId(), commentId = useId();

  if (state.kind === "sent") return <p role="status" className="t-body flex items-start gap-3 rounded-card bg-surface p-4 text-ink"><CheckCircle2 size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{initialRating && !rating ? t("alreadySent") : t("thanks")}</p>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!endpoint || !rating || state.kind === "sending") return;
    setState({ kind: "sending" });
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment: comment.trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(typeof result.error === "string" ? result.error : t("error"));
      setState({ kind: "sent" });
    } catch (error) {
      setState({ kind: "error", text: error instanceof Error && error.message ? error.message : t("error") });
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <fieldset aria-describedby={groupId} disabled={!endpoint}>
      <legend className="font-semibold text-ink">{soft ? t("softQuestion") : t("question")}</legend>
      <p id={groupId} className="t-small font-normal text-ink-soft">{t("scale")}</p>
      <div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map(value => <label key={value} className="relative inline-flex size-12 cursor-pointer items-center justify-center rounded-btn has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-tint hover:bg-surface">
        <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="peer sr-only" />
        <Star size={30} strokeWidth={1.75} className={rating !== null && value <= rating ? "fill-amber text-amber" : "text-ink-soft"} aria-hidden="true" />
        <span className="sr-only">{t("stars", { count: value })}</span>
      </label>)}</div>
    </fieldset>
    <label htmlFor={commentId} className="block">
      <span className="t-small font-semibold text-ink">{t("commentLabel")}</span>
      <textarea id={commentId} value={comment} onChange={event => setComment(event.target.value.slice(0, feedbackCommentMaxLength))} rows={3} maxLength={feedbackCommentMaxLength} disabled={!endpoint} placeholder={t("commentPlaceholder")} className="t-body mt-2 block w-full resize-y rounded-btn border border-line bg-canvas px-3 py-3 placeholder:text-ink-soft focus-visible:border-brand" />
    </label>
    {state.kind === "error" ? <p role="alert" className="t-small text-error">{state.text}</p> : null}
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={!endpoint || !rating || state.kind === "sending"} className={buttonVariants({ variant: "default" })}>{state.kind === "sending" ? t("sending") : t("submit")}</button>
      <p className="t-small font-normal text-ink-soft">{endpoint ? t("private") : t("previewDisabled")}</p>
    </div>
  </form>;
}
