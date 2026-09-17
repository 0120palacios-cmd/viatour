import Image from "next/image";
import { Star, ShieldCheck } from "lucide-react";
import { reviewPhotoUrl, type PublicReview, type ReviewSummary } from "@/lib/reviews";

export function Stars({ value }: { value: number }) {
  return <span className="inline-flex gap-1" role="img" aria-label={`${value.toFixed(1)} de 5 estrellas`}>{[1,2,3,4,5].map(n => <Star key={n} size={20} strokeWidth={1.75} aria-hidden="true" className={n <= Math.round(value) ? "fill-amber text-amber" : "fill-line text-line"} />)}</span>;
}
export function RatingSummary({ summary, compact = false }: { summary: ReviewSummary; compact?: boolean }) {
  if (!summary.total) return null;
  return <div className="space-y-4"><p className="t-h2">{summary.promedio.toFixed(1)} <span className="t-body text-ink-soft">/ 5</span></p><Stars value={summary.promedio} /><p className="t-body text-ink-soft">{summary.total} opiniones</p>{!compact && <ul className="space-y-3">{[5,4,3,2,1].map(n => { const count = summary[`c${n}` as keyof ReviewSummary]; return <li key={n} className="flex items-center gap-3 t-small"><span className="shrink-0">{n} estrellas</span><div className="h-2 flex-1 overflow-hidden rounded-btn bg-line" aria-hidden="true"><div className="h-full bg-brand" style={{ width: `${count / summary.total * 100}%` }} /></div><span>{count}</span></li>; })}</ul>}</div>;
}
export function ReviewCards({ reviews }: { reviews: PublicReview[] }) {
  return <div className="grid gap-6">{reviews.map(review => <article key={review.id} className="min-w-0 space-y-4 rounded-card border border-line bg-canvas p-6"><Stars value={review.calificacion} /><p className="t-body whitespace-pre-wrap break-words">{review.texto}</p>{review.foto_path && <div className="overflow-hidden rounded-card"><Image unoptimized width={960} height={640} src={reviewPhotoUrl(review.foto_path)} alt={`Foto del viaje compartida por ${review.nombre}`} className="max-h-96 w-full object-contain" loading="lazy" /></div>}<footer className="t-small space-y-1 text-ink-soft"><p className="text-ink break-words">{review.nombre}</p>{review.destino && <p>{review.destino}</p>}<time dateTime={review.fecha}>{new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(review.fecha))}</time>{review.verificada && <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand" aria-hidden="true" />Verificada</p>}</footer></article>)}</div>;
}
export function ReviewSkeletons() {
  return <div role="status" className="space-y-6"><span className="sr-only">Cargando opiniones.</span>{[1,2].map(n => <div key={n} className="h-48 animate-pulse rounded-card border border-line bg-surface" aria-hidden="true" />)}</div>;
}
