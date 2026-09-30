import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck, FileCheck2, MessageSquare, ShieldCheck, SlidersHorizontal, Star, UserRound } from "lucide-react";
import { getBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/blog/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getFAQs, type FAQ } from "@/lib/faqs";
import { getReviews, getReviewSummary } from "@/lib/reviews";
import { RatingSummary, ReviewCard } from "@/components/reviews/display";
import { getPackages } from "@/lib/packages";
import { PackageGrid } from "@/components/packages/package-card";
import { DestinationSkeletons, DestinationTile, destinationGridClass } from "@/components/destinations/destination-card";
import { getDestinations } from "@/lib/destinations";
import { homeDestinations } from "@/lib/home-destinations";
import { FlightTool } from "@/components/home/flight-tool";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { QuoteButton } from "@/components/home/quote-button";

export { SocialReels } from "@/components/home/social-reels";
export { Services } from "@/components/home/services";
export { WhyViatour } from "@/components/home/why-viatour";

// Section heading with an optional "see all" action; left-aligned on purpose (the closing CTA is the centred one).
export function SectionHeading({ id, title, intro, action }: { id: string; title: string; intro?: string; action?: { href: string; label: string } }) {
  return <div className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-2xl space-y-3"><h2 id={id} className="t-h2">{title}</h2>{intro && <p className="t-body-lg text-ink-soft">{intro}</p>}</div>
    {action && <Button asChild variant="ghost" className="self-start sm:self-auto"><Link href={action.href}>{action.label}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button>}
  </div>;
}

async function FeaturedDestinationData() {
  let destinationSlugs = new Set<string>();
  try { destinationSlugs = new Set((await getDestinations()).map(item => item.slug)); } catch { /* Local launch catalogue remains useful when the CMS is unavailable. */ }
  return <div className={destinationGridClass}>{homeDestinations.map(destination => <DestinationTile key={destination.slug} href={destinationSlugs.has(destination.slug) ? `/destinos/${destination.slug}` : "/destinos"} name={destination.nombre} image={destination.image} />)}</div>;
}

async function HeroRating() {
  const t = await getTranslations();
  let summary;
  try { summary = await getReviewSummary(); } catch { return null; }
  if (!summary.total) return null;
  return <li><Link href="/opiniones" className="inline-flex min-h-11 items-center gap-3 rounded-btn underline-offset-4 hover:underline"><Star size={20} strokeWidth={1.75} className="shrink-0 fill-amber text-amber" aria-hidden="true" /><span>{t("ux.proofRating", { rating: summary.promedio.toFixed(1), count: summary.total })}</span></Link></li>;
}

// Above the fold: who viatour is, why to trust it, and the quote tool, side by side from 1024px.
export function Hero() {
  const t = useTranslations();
  const proof = [{ icon: UserRound, label: t("home.why1Title") }, { icon: BadgeCheck, label: t("ux.proofFree") }, { icon: CalendarCheck, label: t("home.why6Title") }];
  return <HeroBackdrop pauseLabel={t("home.pauseImages")} resumeLabel={t("home.resumeImages")}>
    <div className="container-site grid items-center gap-8 py-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16 lg:py-24">
      <div className="space-y-6 text-ink group-data-[photo=true]/hero:text-canvas">
        <h1 id="hero-title" className="t-display max-w-xl">{t("home.heroTitle")}</h1>
        <p className="t-body-lg max-w-lg group-data-[photo=true]/hero:text-canvas/90">{t("static.aboutTitle")} {t("home.assistance")}</p>
        <ul className="t-body space-y-1 font-medium">
          {proof.map(({ icon: Icon, label }) => <li key={label} className="flex min-h-11 items-center gap-3"><Icon size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />{label}</li>)}
          <Suspense fallback={null}><HeroRating /></Suspense>
        </ul>
      </div>
      <FlightTool compact heading={<div className="border-b border-line px-4 py-4 sm:px-8 sm:py-6"><p className="t-h3">{t("common.requestQuote")}</p></div>} />
    </div>
  </HeroBackdrop>;
}

export function HowItWorks() { const t = useTranslations(); const steps = [{ icon: MessageSquare, title: t("home.how1Title"), body: t("home.how1Body") }, { icon: SlidersHorizontal, title: t("home.how2Title"), body: t("home.how2Body") }, { icon: ShieldCheck, title: t("home.how3Title"), body: t("home.how3Body") }]; return <section className="section-space" aria-labelledby="how-title"><div className="container-site"><SectionHeading id="how-title" title={t("home.howTitle")} intro={t("home.howIntro")} /><ol className="grid gap-6 md:grid-cols-3">{steps.map(({ icon: Icon, title, body }, index) => <li key={title} className="relative rounded-card border border-line bg-canvas p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><span className="t-small flex size-10 items-center justify-center rounded-btn bg-brand text-canvas" aria-hidden="true">{index + 1}</span><Icon size={24} strokeWidth={1.75} className="text-brand" aria-hidden="true" /></div><h3 className="t-h3 mb-3">{title}</h3><p className="t-body text-ink-soft">{body}</p></li>)}</ol></div></section>; }

export function FeaturedDestinations() { const t = useTranslations(); return <section className="container-site section-space" aria-labelledby="destinations-title"><SectionHeading id="destinations-title" title={t("common.destinations")} intro={t("home.destinationsIntro")} action={{ href: "/destinos", label: t("home.allDestinations") }} /><Suspense fallback={<DestinationSkeletons />}><FeaturedDestinationData /></Suspense></section>; }

export function FeaturedPackages() { return <Suspense fallback={null}><FeaturedPackageData /></Suspense>; }
async function FeaturedPackageData() { const t = await getTranslations(); let items; try { items = await getPackages(true); } catch { return null; } if (!items.length) return null; return <section className="section-space border-y border-line bg-surface" aria-labelledby="packages-title"><div className="container-site"><SectionHeading id="packages-title" title={t("home.featuredPackages")} intro={t("home.packagesIntro")} action={{ href: "/paquetes", label: t("ux.allPackages") }} /><PackageGrid items={items.slice(0, 6)} label={t("home.featuredPackages")} /></div></section>; }

export function ReviewsTeaser() { return <Suspense fallback={null}><ReviewTeaserData /></Suspense>; }
async function ReviewTeaserData() {
  const t = await getTranslations();
  let data;
  try { data = await getReviews(12, 1); } catch { return null; }
  const { summary } = data;
  if (!summary.total) return <section className="section-space container-site" aria-labelledby="reviews-title"><div className="grid gap-8 md:grid-cols-2 md:items-center"><div className="space-y-4"><h2 id="reviews-title" className="t-h2">{t("common.reviews")}</h2><p className="t-body-lg text-ink-soft">{t("home.reviewsIntro")}</p></div><div className="space-y-4 rounded-panel border border-line bg-surface p-8"><p className="t-body">{t("home.noReviews")}</p><Button asChild variant="ghost"><Link href="/opiniones/nueva">{t("home.shareReview")}</Link></Button></div></div></section>;
  // Real, recent reviews with enough detail to be useful; the full list (all ratings) is one click away.
  const featured = data.reviews.filter(review => review.calificacion >= 4 && review.texto.length >= 80).slice(0, 3);
  return <section className="section-space border-y border-line bg-surface" aria-labelledby="reviews-title"><div className="container-site">
    <SectionHeading id="reviews-title" title={t("common.reviews")} intro={t("home.reviewsIntro")} action={{ href: "/opiniones", label: t("ux.allReviews") }} />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div className="self-start rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8"><RatingSummary summary={summary} /></div>
      {featured.length > 0 && <div className="grid gap-6 md:grid-cols-3">{featured.map(review => <ReviewCard key={review.id} review={review} clamp />)}</div>}
    </div>
  </div></section>;
}

export function TravelGuides() { return <Suspense fallback={null}><TravelGuidesContent /></Suspense>; }
async function TravelGuidesContent() { const t = await getTranslations(); let posts; try { posts = await getBlogPosts(); } catch { return null; } if (!posts.length) return null; return <section className="section-space container-site" aria-labelledby="guides-title"><SectionHeading id="guides-title" title={t("home.guidesTitle")} intro={t("home.guidesIntro")} action={{ href: "/blog", label: t("home.allGuides") }} /><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.slice(0, 3).map(post => <BlogCard key={post.id} post={post} />)}</div></section>; }

// FAQ and travel requirements answer the same need ("what should I know before asking?"), so they share one section.
export function FrequentlyAskedQuestions() { return <Suspense fallback={null}><FrequentlyAskedQuestionsContent /></Suspense>; }
async function FrequentlyAskedQuestionsContent() { const t = await getTranslations(); let faqs: FAQ[] = []; try { faqs = await getFAQs(); } catch { /* Keep the FAQ entry point visible while content is unavailable. */ } const visible = faqs.slice(0, 5); const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: visible.map(faq => ({ "@type": "Question", name: faq.pregunta, acceptedAnswer: { "@type": "Answer", text: faq.respuesta } })) }; return <section className="section-space border-y border-line bg-surface" aria-labelledby="faq-title"><div className="container-site grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16"><div className="space-y-6"><div className="space-y-4"><h2 id="faq-title" className="t-h2">{t("common.faq")}</h2><p className="t-body-lg text-ink-soft">{t("home.faqIntro")}</p><Button asChild variant="ghost"><Link href="/preguntas-frecuentes">{t("home.allQuestions")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button></div><div className="space-y-4 rounded-card border border-line bg-canvas p-6 shadow-sm"><div className="flex items-center gap-3"><FileCheck2 size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /><h3 className="t-h3">{t("common.requirements")}</h3></div><p className="t-body text-ink-soft">{t("home.requirementsIntro")}</p><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><Button asChild><Link href="/requisitos">{t("home.checkRequirements")}</Link></Button><a className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4" href="https://www.iatatravelcentre.com/" target="_blank" rel="noopener noreferrer">IATA Travel Centre<ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" /></a></div></div></div>{visible.length > 0 && <Accordion type="single" collapsible className="w-full self-start rounded-card border border-line bg-canvas px-6">{visible.map(faq => <AccordionItem key={faq.id} value={faq.id} className="last:border-b-0"><AccordionTrigger>{faq.pregunta}</AccordionTrigger><AccordionContent>{faq.respuesta}</AccordionContent></AccordionItem>)}</Accordion>}</div>{visible.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}</section>; }

export function FinalCta() { const t = useTranslations(); return <section className="section-space container-site" aria-labelledby="cta-title"><div className="rounded-panel border border-line bg-brand-tint px-6 py-12 text-center sm:px-12 sm:py-16"><div className="mx-auto max-w-2xl space-y-6"><h2 id="cta-title" className="t-h2">{t("home.finalTitle")}</h2><p className="t-body-lg text-ink-soft">{t("home.finalBody")}</p><div className="flex justify-center"><QuoteButton align="center" payload={{ service: "Viaje a medida", fields: {} }}>{t("common.whatsapp")}</QuoteButton></div></div></div></section>; }

