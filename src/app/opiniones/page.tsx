import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, ArrowUpRight, PenLine, ShieldCheck, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TrackedLink } from "@/components/tracked-link";
import { localizedPageMetadata } from "@/lib/seo";
import { getReviews, reviewSchema, type ReviewSummary } from "@/lib/reviews";
import { RatingSummary, ReviewCards } from "@/components/reviews/display";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { siteConfig } from "@/lib/site-config";
import { FinalCta } from "@/components/home/sections";
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/opiniones", "reviews"); }

type Search = { pagina?: string; estrellas?: string };
// Filter and page live in the URL, so every view is shareable and works without JavaScript.
function reviewsHref(stars?: number, page = 1) {
  const query = new URLSearchParams();
  if (stars) query.set("estrellas", String(stars));
  if (page > 1) query.set("pagina", String(page));
  return "/opiniones" + (query.size ? `?${query}` : "");
}

// Read first, then act: the rating and the ways to leave a review sit together in a sticky column.
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getTranslations("reviews"); const common = await getTranslations("common"); const home = await getTranslations("home"); const v3 = await getTranslations("v3");
  const params = await searchParams;
  const raw = Number(params.pagina || 1); const page = Number.isSafeInteger(raw) && raw > 0 && raw < 100000 ? raw : 1;
  const rawStars = Number(params.estrellas); const stars = Number.isInteger(rawStars) && rawStars >= 1 && rawStars <= 5 ? rawStars : undefined;
  const { summary, reviews } = await getReviews(30, page, stars);
  // The rating markup describes the whole review set; a one-rating view would misrepresent it.
  const schema = stars ? null : reviewSchema(summary, reviews);
  const matching = stars ? summary[`c${stars}` as keyof ReviewSummary] : summary.total;
  const actions = <div className="space-y-3"><Button asChild className="w-full"><Link href="/opiniones/nueva"><PenLine size={18} strokeWidth={1.75} aria-hidden="true" />{t("share")}</Link></Button><Button asChild variant="ghost" className="w-full"><TrackedLink event="google_review_click" placement="reviews-page" href={siteConfig.googleReviewUrl} target="_blank" rel="noopener noreferrer">{t("googleCta")}<ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" /></TrackedLink></Button><p className="t-small text-center text-ink-soft">{t("googleSubline")}</p></div>;
  // How the list is built, stated plainly: moderation exists and every rating can be filtered, low ones included.
  const policy = <div className="flex gap-3 border-t border-line pt-6"><ShieldCheck size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><div className="space-y-1"><p className="t-small font-semibold text-ink">{v3("reviewsPolicyTitle")}</p><p className="t-small font-normal text-ink-soft">{v3("reviewsPolicyBody")}</p></div></div>;
  const pages = Math.max(1, Math.ceil(matching / 30));
  return <main><div className="container-site pb-12 sm:pb-16">
    <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("reviews"), href: "/opiniones" }]} title={common("reviews")} intro={home("reviewsIntro")} />
    {summary.total === 0 ? <div className="grid gap-6 rounded-panel border border-line bg-surface p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_20rem] md:items-center"><p className="t-body">{t("noPublished")}</p>{actions}</div> : <div className="grid items-start gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <aside className="space-y-6 rounded-panel border border-line bg-surface p-6 lg:top-28 lg:[@media(min-height:880px)]:sticky"><RatingSummary summary={summary} filter={{ active: stars, href: value => reviewsHref(value) }} />{actions}{policy}</aside>
      <section id="opiniones-publicadas" className="scroll-mt-28 space-y-8" aria-label={t("published")}>
        {stars && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-2">
          <p className="t-small font-semibold text-ink">{t("filterActive", { stars, count: matching })}</p>
          <Button asChild variant="ghost"><Link href={reviewsHref()} scroll={false}><X size={18} strokeWidth={1.75} aria-hidden="true" />{t("filterClear")}</Link></Button>
        </div>}
        <ReviewCards reviews={reviews} />{!reviews.length && <p role="status">{t("emptyPage")}</p>}
        {pages > 1 && <nav aria-label={t("pages")} className="flex items-center justify-between gap-4 border-t border-line pt-6">
          {page > 1 ? <Button asChild variant="ghost"><Link href={reviewsHref(stars, page - 1)}><ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />{common("previous")}</Link></Button> : <span />}
          <span className="t-small text-ink-soft">{page} / {pages}</span>
          {page < pages ? <Button asChild variant="ghost"><Link href={reviewsHref(stars, page + 1)}>{common("next")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button> : <span />}
        </nav>}
      </section>
    </div>}
    {schema && <JsonLd data={schema} />}
  </div><FinalCta /></main>;
}
