import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirementsChecker } from "@/components/requirements/requirements-checker";
import { localizedPageMetadata } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/blog/card";

type Props = { searchParams: Promise<{ destino?: string | string[] }> };

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/requisitos", "requirements"); }
// ?destino= (linked from destination pages) opens the checker with that destination chosen.
// The canonical stays /requisitos, so the parameter never creates duplicate pages.
export default async function RequirementsPage({ searchParams }: Props) {
  const t = await getTranslations("requirements");
  const destino = (await searchParams).destino;
  const initialDestination = typeof destino === "string" ? destino : "";
  const ux = await getTranslations("ux");
  // The published guides on documents and entry rules go deeper than the checker; link them here.
  const guides = (await getBlogPosts().catch(() => [])).filter(post => post.categoria === "Requisitos de viaje").slice(0, 3);
  return <main><section className="container-site section-space" aria-labelledby="requirements-page-title"><div className="mb-12 max-w-3xl space-y-6"><p className="t-small text-brand">{t("eyebrow")}</p><h1 id="requirements-page-title" className="t-h1">{t("title")}</h1><p className="t-body-lg text-ink-soft">{t("intro")}</p></div><RequirementsChecker initialDestination={initialDestination} /></section>{guides.length > 0 && <section className="container-site pb-12 sm:pb-24" aria-labelledby="requirements-guides"><h2 id="requirements-guides" className="t-h2 mb-8">{ux("relatedGuides")}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{guides.map(post => <BlogCard key={post.id} post={post} />)}</div></section>}</main>;
}
