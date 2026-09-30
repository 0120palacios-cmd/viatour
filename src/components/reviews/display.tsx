import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Star, ShieldCheck } from "lucide-react";
import { type PublicReview, type ReviewSummary } from "@/lib/reviews";
export function Stars({ value, size = 20 }: { value: number; size?: number }) { const t = useTranslations("reviews"); const label = `${value.toFixed(1)} / 5 ${t("stars")}`; return <span className="inline-flex gap-1" role="img" aria-label={label}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={size} strokeWidth={1.75} aria-hidden="true" className={n <= Math.round(value) ? "fill-amber text-amber" : "fill-line text-line"} />)}</span>; }
export function RatingSummary({ summary, compact = false }: { summary: ReviewSummary; compact?: boolean }) { const t = useTranslations("reviews"); if (!summary.total) return null; return <div className="space-y-4"><p className="flex items-baseline gap-2"><span className="t-h1">{summary.promedio.toFixed(1)}</span><span className="t-body text-ink-soft">/ 5</span></p><Stars value={summary.promedio} /><p className="t-body text-ink-soft">{t("ratingSummary", { count: summary.total })}</p>{!compact && <ul className="space-y-2 pt-2">{[5, 4, 3, 2, 1].map(n => { const count = summary[`c${n}` as keyof ReviewSummary]; return <li key={n} className="t-small grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-3"><span>{t("starsCount", { count: n })}</span><div className="h-2 overflow-hidden rounded-btn bg-line" aria-hidden="true"><div className="h-full bg-brand" style={{ width: `${count / summary.total * 100}%` }} /></div><span className="text-right text-ink-soft">{count}</span></li>; })}</ul>}</div>; }

function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-HN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value)); }

// clamp: short preview for teasers (the full text stays on /opiniones).
export function ReviewCard({ review, clamp = false }: { review: PublicReview; clamp?: boolean }) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  return <article className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-canvas p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><Stars value={review.calificacion} size={18} />{review.verificada && <span className="t-small inline-flex items-center gap-1 text-ink-soft"><ShieldCheck size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{t("verified")}</span>}</div>
    <p className={`t-body whitespace-pre-wrap break-words ${clamp ? "line-clamp-5" : ""}`}>{review.texto}</p>
    {!clamp && review.foto_url && <div className="overflow-hidden rounded-card"><Image unoptimized width={960} height={640} src={review.foto_url} alt={`${review.nombre}`} className="max-h-96 w-full object-contain" loading="lazy" /></div>}
    <footer className="t-small mt-auto flex items-center gap-3 border-t border-line pt-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint font-semibold text-brand-deep" aria-hidden="true">{review.nombre.trim().charAt(0).toUpperCase()}</span>
      <span className="min-w-0"><span className="block truncate font-semibold text-ink">{review.nombre}</span><span className="block text-ink-soft">{review.destino && <>{review.destino} · </>}<time dateTime={review.fecha}>{formatDate(review.fecha, locale)}</time></span></span>
    </footer>
  </article>;
}
export function ReviewCards({ reviews }: { reviews: PublicReview[] }) { return <div className="grid gap-6">{reviews.map(review => <ReviewCard key={review.id} review={review} />)}</div>; }
export function ReviewSkeletons() { const t = useTranslations("reviews"); return <div role="status" className="space-y-6"><span className="sr-only">{t("loading")}</span>{[1, 2].map(n => <div key={n} className="h-48 animate-pulse rounded-card border border-line bg-surface" aria-hidden="true" />)}</div>; }
