import Link from "next/link";
import { getReviews, reviewSchema } from "@/lib/reviews";
import { RatingSummary, ReviewCards } from "@/components/reviews/display";
export const metadata = { title: "Opiniones", alternates: { canonical: "/opiniones" } };
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const raw = Number((await searchParams).pagina || 1);
  const page = Number.isSafeInteger(raw) && raw > 0 && raw < 100000 ? raw : 1;
  const { summary, reviews } = await getReviews(30, page);
  const schema = reviewSchema(summary, reviews);
  return <main className="container-site space-y-12 py-14 sm:py-24"><header className="space-y-6"><h1 className="t-h1">Opiniones</h1><Link href="/opiniones/nueva" className="t-small text-brand underline underline-offset-4">Comparta su opinión</Link></header>{summary.total === 0 ? <div className="rounded-panel border border-line bg-surface p-8"><p className="t-body">Aún no hay opiniones publicadas.</p></div> : <div className="grid gap-12 md:grid-cols-3"><aside><RatingSummary summary={summary} /></aside><section className="space-y-8 md:col-span-2" aria-label="Opiniones publicadas"><ReviewCards reviews={reviews} />{!reviews.length && <p>No hay opiniones en esta página.</p>}<nav aria-label="Páginas de opiniones" className="flex gap-6">{page > 1 && <Link className="text-brand underline" href={`/opiniones?pagina=${page - 1}`}>Anterior</Link>}{page * 30 < summary.total && <Link className="text-brand underline" href={`/opiniones?pagina=${page + 1}`}>Siguiente</Link>}</nav></section></div>}{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}</main>;
}
