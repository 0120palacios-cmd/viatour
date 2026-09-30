import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirementsChecker } from "@/components/requirements/requirements-checker";
import { localizedPageMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<{ destino?: string | string[] }> };

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/requisitos", "requirements"); }
// ?destino= (linked from destination pages) opens the checker with that destination chosen.
// The canonical stays /requisitos, so the parameter never creates duplicate pages.
export default async function RequirementsPage({ searchParams }: Props) {
  const t = await getTranslations("requirements");
  const destino = (await searchParams).destino;
  const initialDestination = typeof destino === "string" ? destino : "";
  return <main><section className="container-site section-space" aria-labelledby="requirements-page-title"><div className="mb-12 max-w-3xl space-y-6"><p className="t-small text-brand">{t("eyebrow")}</p><h1 id="requirements-page-title" className="t-h1">{t("title")}</h1><p className="t-body-lg text-ink-soft">{t("intro")}</p></div><RequirementsChecker initialDestination={initialDestination} /></section></main>;
}
