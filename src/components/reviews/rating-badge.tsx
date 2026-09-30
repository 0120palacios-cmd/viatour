import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getReviewSummary } from "@/lib/reviews";

// The published rating (approved reviews only), linked to the reviews page. Renders nothing
// without approved reviews or when the summary cannot be read: no rating is ever implied.
// Render it without Suspense: the summary is cached, and streaming it in would shift the
// content below it.
export async function RatingBadge({ className = "" }: { className?: string }) {
  const ux = await getTranslations("ux");
  let summary;
  try { summary = await getReviewSummary(); } catch { return null; }
  if (!summary.total) return null;
  return <Link href="/opiniones" aria-label={`${ux("ratingLabel")}: ${ux("proofRating", { rating: summary.promedio.toFixed(1), count: summary.total })}`} className={`t-small inline-flex min-h-11 items-center gap-2 rounded-btn text-ink underline-offset-4 hover:text-brand hover:underline ${className}`}>
    <span className="inline-flex" aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} strokeWidth={1.75} className={star <= Math.round(summary.promedio) ? "fill-amber text-amber" : "text-line"} />)}</span>
    <span>{ux("proofRating", { rating: summary.promedio.toFixed(1), count: summary.total })}</span>
  </Link>;
}
