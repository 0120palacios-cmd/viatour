import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarClock, Clock3, ListOrdered, MapPin } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { getBlogPost, getBlogPosts, type BlogPost } from "@/lib/blog";
import { getDestinations } from "@/lib/destinations";
import { getPackagesForDestination, type Package } from "@/lib/packages";
import { blogCoverUrl, blogDate } from "@/lib/blog-utils";
import { guideDestination, guideOutline, readingMinutes } from "@/lib/guide-utils";
import { Markdown } from "@/components/blog/markdown";
import { BlogCard } from "@/components/blog/card";
import { PackageGrid } from "@/components/packages/package-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { ShareButton } from "@/components/share-button";
import { absoluteUrl, agencyRef, breadcrumbSchema, localizedContentMetadata, localizedUrl, detailDescription, websiteId } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { getLocale } from "next-intl/server";

type Props = { params: Promise<{ slug: string }> };

function plain(value: string) { return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const locale = (await getLocale()) as Locale;
  const english = locale === "en";
  return localizedContentMetadata(
    `/blog/${post.slug}`,
    english ? `viatour | ${post.titulo} travel guide from Honduras` : post.meta_titulo?.trim() || `viatour | ${post.titulo} desde Honduras`,
    english ? `Read viatour’s guide about ${post.titulo} and use the information to plan a trip from Honduras with personal travel advice.` : detailDescription(post.titulo, post.meta_descripcion || post.extracto),
    blogCoverUrl(post.cover_url) ?? guideDestination(post.titulo)?.image,
    true,
  );
}

// Other guides worth reading next: same destination first, then same category, then newest.
function relatedGuides(post: BlogPost, posts: BlogPost[]) {
  const destination = guideDestination(post.titulo)?.nombre;
  const score = (other: BlogPost) => (destination && plain(other.titulo).includes(plain(destination)) ? 2 : 0) + (other.categoria === post.categoria ? 1 : 0);
  return posts.filter(other => other.id !== post.id).map((other, index) => ({ other, index, score: score(other) })).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).map(({ other }) => other);
}

export default async function Page({ params }: Props) {
  const common = await getTranslations("common");
  const home = await getTranslations("home");
  const ux = await getTranslations("ux");
  const packagePage = await getTranslations("packagePage");
  const locale = (await getLocale()) as Locale;
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const cover = blogCoverUrl(post.cover_url);
  const coverDestination = cover ? null : guideDestination(post.titulo);
  const image = cover ?? coverDestination?.image ?? null;
  const outline = guideOutline(post.cuerpo);
  const minutes = readingMinutes(post.cuerpo);
  const published = post.publicado_en?.slice(0, 10) ?? null;
  const updated = post.updated_at?.slice(0, 10) ?? null;
  // "Actualizado" only when the guide changed after the day it was published.
  const showUpdated = Boolean(updated && published && updated > published);
  const searchableCopy = plain(`${post.titulo} ${post.extracto} ${post.cuerpo}`);
  const [destinations, posts] = await Promise.all([getDestinations().catch(() => []), getBlogPosts().catch(() => [])]);
  const relatedDestinations = destinations.filter(destination => searchableCopy.includes(plain(destination.nombre)));
  const packageLists = await Promise.all(relatedDestinations.map(destination => getPackagesForDestination(destination).catch((): Package[] => [])));
  const relatedPackages = [...new Map(packageLists.flat().map(item => [item.id, item])).values()].slice(0, 3);
  const guides = relatedGuides(post, posts);
  const url = localizedUrl(`/blog/${post.slug}`, locale);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.titulo,
        articleSection: post.categoria,
        description: post.extracto,
        url,
        mainEntityOfPage: url,
        inLanguage: "es-HN",
        isPartOf: { "@id": websiteId },
        publisher: agencyRef,
        author: post.autor ? { "@type": "Person", name: post.autor, worksFor: agencyRef } : agencyRef,
        wordCount: post.cuerpo.split(/\s+/).filter(Boolean).length,
        dateModified: post.updated_at,
        ...(post.publicado_en ? { datePublished: post.publicado_en } : {}),
        ...(image ? { image: absoluteUrl(image) } : {}),
        ...(relatedDestinations.length ? { about: relatedDestinations.map(destination => ({ "@type": "TouristDestination", name: destination.nombre, url: localizedUrl(`/destinos/${destination.slug}`, locale) })) } : {}),
      },
      breadcrumbSchema([{ label: common("home"), href: "/" }, { label: common("blog"), href: "/blog" }, { label: post.titulo, href: `/blog/${post.slug}` }], locale),
    ],
  };
  return (
    <main className="pb-12 pt-8 sm:pb-24 sm:pt-12">
      <div className="reading-progress" aria-hidden="true" />
      <JsonLd data={schema} />
      <article className="container-site">
        <div className="mx-auto max-w-[68ch]">
          <Breadcrumbs schema={false} items={[{ label: common("home"), href: "/" }, { label: common("blog"), href: "/blog" }, { label: post.titulo, href: `/blog/${post.slug}` }]} />
          <header className="my-8 space-y-4">
            <p className="t-small text-brand">{post.categoria}</p>
            <h1 className="t-h1">{post.titulo}</h1>
            {post.extracto && <p className="t-body-lg text-ink-soft">{post.extracto}</p>}
            <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
              <ul className="t-small flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-soft">
                {post.autor && <li className="font-semibold text-ink">{post.autor}</li>}
                {published && <li><time dateTime={published}>{blogDate(published)}</time></li>}
                {showUpdated && <li className="inline-flex items-center gap-2"><CalendarClock size={16} strokeWidth={1.75} aria-hidden="true" /><time dateTime={updated!}>{ux("updatedOn", { date: blogDate(updated) })}</time></li>}
                <li className="inline-flex items-center gap-2"><Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />{ux("readingTime", { minutes })}</li>
              </ul>
              <ShareButton title={post.titulo} />
            </div>
          </header>
          {image && <div className="relative mb-8 aspect-video overflow-hidden rounded-card bg-surface"><Image fill preload sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc(100vw - 48px), 680px" src={image} alt={cover ? post.titulo : home("photoAlt", { name: coverDestination!.nombre })} className="object-cover" /></div>}
          {outline.length >= 3 && <nav aria-labelledby="guide-contents" className="mb-10 rounded-card border border-line bg-surface p-6">
            <h2 id="guide-contents" className="t-small mb-3 inline-flex items-center gap-2 font-semibold text-ink"><ListOrdered size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{ux("contents")}</h2>
            <ol className="t-body list-decimal space-y-1 pl-6 marker:text-ink-soft">{outline.map(item => <li key={item.id}><a href={`#${item.id}`} className="inline-flex min-h-10 items-center text-brand underline-offset-4 hover:underline">{item.text}</a></li>)}</ol>
          </nav>}
          <Markdown>{post.cuerpo}</Markdown>
          {relatedDestinations.length > 0 && <nav aria-labelledby="guide-destinations" className="mt-12 space-y-3">
            <h2 id="guide-destinations" className="t-h3">{common("destinations")}</h2>
            <ul className="flex flex-wrap gap-2">{relatedDestinations.map(destination => <li key={destination.id}><Link href={`/destinos/${destination.slug}`} className="t-small inline-flex min-h-11 items-center gap-2 rounded-btn border border-line bg-canvas px-4 text-ink transition-colors duration-(--duration-fast) ease-out hover:border-brand hover:text-brand"><MapPin size={16} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{destination.nombre}</Link></li>)}</ul>
          </nav>}
          <section aria-labelledby="guide-plan" className="mt-12 space-y-4 rounded-panel border border-line bg-brand-tint p-6 sm:p-8">
            <h2 id="guide-plan" className="t-h2">{common("planTrip")}</h2>
            <p className="t-body text-ink-soft">{home("finalBody")}</p>
            <WhatsAppLink placement="blog-post" />
          </section>
        </div>
      </article>
      {relatedPackages.length > 0 && <section aria-labelledby="guide-packages" className="container-site mt-16 space-y-6 sm:mt-24">
        <h2 id="guide-packages" className="t-h2">{packagePage("relatedPackages")}</h2>
        <PackageGrid items={relatedPackages} label={packagePage("relatedPackages")} />
      </section>}
      {guides.length > 0 && <section aria-labelledby="guide-related" className="container-site mt-16 space-y-6 sm:mt-24">
        <h2 id="guide-related" className="t-h2">{ux("relatedGuides")}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{guides.map(item => <BlogCard key={item.id} post={item} />)}</div>
      </section>}
    </main>
  );
}
