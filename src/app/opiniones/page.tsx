import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, ArrowUpRight, PenLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localizedPageMetadata } from "@/lib/seo";
import { getReviews, reviewSchema } from "@/lib/reviews";
import { RatingSummary, ReviewCards } from "@/components/reviews/display";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { siteConfig } from "@/lib/site-config";
export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/opiniones", "reviews"); }
// Read first, then act: the rating and the ways to leave a review sit together in a sticky column.
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const t = await getTranslations("reviews"); const common = await getTranslations("common"); const home = await getTranslations("home");
  const raw = Number((await searchParams).pagina || 1); const page = Number.isSafeInteger(raw) && raw > 0 && raw < 100000 ? raw : 1;
  const { summary, reviews } = await getReviews(30, page); const schema = reviewSchema(summary, reviews);
  const actions = <div className="space-y-3"><Button asChild className="w-full"><Link href="/opiniones/nueva"><PenLine size={18} strokeWidth={1.75} aria-hidden="true" />{t("share")}</Link></Button><Button asChild variant="ghost" className="w-full"><a href={siteConfig.googleReviewUrl} target="_blank" rel="noopener noreferrer">{t("googleCta")}<ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" /></a></Button><p className="t-small text-center text-ink-soft">{t("googleSubline")}</p></div>;
  const pages = Math.max(1, Math.ceil(summary.total / 30));
  return <main className="container-site pb-12 sm:pb-24">
    <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("reviews"), href: "/opiniones" }]} title={common("reviews")} intro={home("reviewsIntro")} />
    {summary.total === 0 ? <div className="grid gap-6 rounded-panel border border-line bg-surface p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_20rem] md:items-center"><p className="t-body">{t("noPublished")}</p>{actions}</div> : <div className="grid items-start gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
      <aside className="space-y-6 rounded-panel border border-line bg-surface p-6 lg:sticky lg:top-28"><RatingSummary summary={summary} />{actions}</aside>
      <section className="space-y-8" aria-label={t("published")}>
        <ReviewCards reviews={reviews} />{!reviews.length && <p role="status">{t("emptyPage")}</p>}
        {pages > 1 && <nav aria-label={t("pages")} className="flex items-center justify-between gap-4 border-t border-line pt-6">
          {page > 1 ? <Button asChild variant="ghost"><Link href={`/opiniones?pagina=${page - 1}`}><ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />{common("previous")}</Link></Button> : <span />}
          <span className="t-small text-ink-soft">{page} / {pages}</span>
          {page < pages ? <Button asChild variant="ghost"><Link href={`/opiniones?pagina=${page + 1}`}>{common("next")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button> : <span />}
        </nav>}
      </section>
    </div>}
    {schema && <JsonLd data={schema} />}
  </main>;
}
