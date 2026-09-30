import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { blogCoverUrl, blogDate } from "@/lib/blog-utils";
import { guideDestination } from "@/lib/guide-utils";

const coverSizes = "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px";

// The whole card is one link (title as its name). Without its own cover, a guide about one
// destination shows that destination's real photo; only general guides keep the tonal cover.
export function BlogCard({ post }: { post: BlogPost }) {
  const t = useTranslations();
  const cover = blogCoverUrl(post.cover_url);
  const destination = cover ? null : guideDestination(post.titulo);
  const image = cover ?? destination?.image ?? null;
  return <article className="media-card group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-sm">
    <div className={`relative overflow-hidden bg-surface ${image ? "aspect-[3/2]" : "aspect-[4/1] sm:aspect-[3/2]"}`}>
      {image
        ? <Image fill sizes={coverSizes} src={image} alt={cover ? post.titulo : t("home.photoAlt", { name: destination!.nombre })} className="object-cover" />
        : <div className="flex h-full items-center justify-center bg-brand-tint text-brand" aria-hidden="true"><BookOpen size={32} strokeWidth={1.5} /></div>}
    </div>
    <div className="flex flex-1 flex-col gap-3 p-6">
      <p className="t-small text-brand">{post.categoria} · {post.tipo === "guia" ? t("common.guides") : t("common.articles")}</p>
      <h3 className="t-h3 group-hover:text-brand"><Link href={"/blog/" + post.slug} className="after:absolute after:inset-0 after:rounded-card">{post.titulo}</Link></h3>
      <p className="t-body line-clamp-3 text-ink-soft">{post.extracto}</p>
      <div className="t-small mt-auto flex items-center justify-between gap-4 pt-2 text-ink-soft">
        {post.publicado_en ? <time dateTime={post.publicado_en}>{blogDate(post.publicado_en)}</time> : <span />}
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-brand" aria-hidden="true">{t("common.readMore")}<ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-(--duration-fast) group-hover:translate-x-1 motion-reduce:transition-none" /></span>
      </div>
    </div>
  </article>;
}
