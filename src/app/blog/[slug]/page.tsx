import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/blog";
import { blogCoverUrl, blogDate } from "@/lib/blog-utils";
import { Markdown } from "@/components/blog/markdown";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { absoluteUrl, breadcrumbSchema, localizedContentMetadata, localizedUrl, detailDescription } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { getLocale } from "next-intl/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const locale = (await getLocale()) as Locale;
  const english = locale === "en";
  return localizedContentMetadata(
    `/blog/${post.slug}`,
    english ? `viatour | ${post.titulo} travel guide from Honduras` : post.meta_titulo?.trim() || `viatour | ${post.titulo} desde Honduras`,
    english ? `Read viatour’s guide about ${post.titulo} and use the information to plan a trip from Honduras with personal travel advice.` : detailDescription(post.titulo, post.meta_descripcion || post.extracto),
    blogCoverUrl(post.cover_url),
    true,
  );
}

export default async function Page({ params }: Props) {
  const t = await getTranslations("static");
  const common = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const cover = blogCoverUrl(post.cover_url);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.titulo,
        description: post.extracto,
        url: localizedUrl(`/blog/${post.slug}`, locale),
        mainEntityOfPage: localizedUrl(`/blog/${post.slug}`, locale),
        dateModified: post.updated_at,
        ...(post.publicado_en ? { datePublished: post.publicado_en } : {}),
        ...(post.autor ? { author: { "@type": "Person", name: post.autor } } : {}),
        ...(cover ? { image: absoluteUrl(cover) } : {}),
      },
      breadcrumbSchema([{ label: common("home"), href: "/" }, { label: common("blog"), href: "/blog" }, { label: post.titulo, href: `/blog/${post.slug}` }], locale),
    ],
  };
  return (
    <main className="container-site py-14 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <article className="mx-auto max-w-[68ch]">
        <Link className="text-brand underline" href="/blog">{t("backToBlog")}</Link>
        <header className="my-8">
          <h1 className="t-h1">{post.titulo}</h1>
          <div className="mt-4 flex flex-wrap gap-4 t-small text-ink-soft">
            <span>{post.categoria}</span>
            {post.publicado_en && <time dateTime={post.publicado_en}>{blogDate(post.publicado_en)}</time>}
            {post.autor && <span>{post.autor}</span>}
          </div>
        </header>
        {cover && <div className="relative mb-8 aspect-video overflow-hidden rounded-card"><Image fill preload unoptimized={false} sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc(100vw - 48px), 680px" src={cover} alt={post.titulo} className="object-cover" /></div>}
        <Markdown>{post.cuerpo}</Markdown>
        <section className="mt-12 space-y-6 rounded-panel border bg-surface p-6">
          <h2 className="t-h2">{common("planTrip")}</h2>
          <WhatsAppLink />
        </section>
      </article>
    </main>
  );
}
