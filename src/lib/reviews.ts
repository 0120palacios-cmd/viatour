import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { agencySchema } from "@/lib/seo";

export type PublicReview = { id: string; nombre: string; calificacion: number; texto: string; destino: string | null; foto_path: string | null; foto_url: string | null; fecha: string; verificada: boolean; created_at: string };
export type ReviewSummary = { total: number; promedio: number; c5: number; c4: number; c3: number; c2: number; c1: number };
export async function getReviews(limit = 30, page = 1) {
  const client = await createClient();
  const [summary, reviews] = await Promise.all([
    client.from("reviews_resumen").select("total,promedio,c5,c4,c3,c2,c1").abortSignal(AbortSignal.timeout(8000)).single(),
    client.from("reviews_publicas").select("id,nombre,calificacion,texto,destino,foto_path,fecha,verificada,created_at").order("fecha", { ascending: false }).order("id").range((page - 1) * limit, page * limit - 1).abortSignal(AbortSignal.timeout(8000)),
  ]);
  if (summary.error || reviews.error) throw new Error("No se pudieron cargar las opiniones.");
  const raw = summary.data;
  const aggregate = {
    total: Number(raw.total) || 0,
    promedio: raw.promedio == null ? 0 : Number(Number(raw.promedio).toFixed(1)),
    c5: Number(raw.c5) || 0,
    c4: Number(raw.c4) || 0,
    c3: Number(raw.c3) || 0,
    c2: Number(raw.c2) || 0,
    c1: Number(raw.c1) || 0,
  } satisfies ReviewSummary;
  const signedReviews = await Promise.all((reviews.data ?? []).map(async review => ({ ...review, foto_url: review.foto_path ? await getReviewPhotoSignedUrl(review.foto_path) : null })));
  return { summary: aggregate, reviews: signedReviews as PublicReview[] };
}

export async function getReviewPhotoSignedUrl(path: string, expiresIn = 300) {
  if (!path || path.length > 500 || path.includes("..")) return null;
  const result = await createAdminClient().storage.from("review-photos").createSignedUrl(path, expiresIn);
  return result.data?.signedUrl ?? null;
}
export function reviewSchema(summary: ReviewSummary, reviews: PublicReview[]) {
  if (!summary.total) return null;
  return { ...agencySchema, aggregateRating: { "@type": "AggregateRating", ratingValue: summary.promedio.toFixed(1), reviewCount: summary.total, bestRating: 5, worstRating: 1 }, review: reviews.map(review => ({ "@type": "Review", author: { "@type": "Person", name: review.nombre }, reviewBody: review.texto, datePublished: review.fecha, reviewRating: { "@type": "Rating", ratingValue: review.calificacion, bestRating: 5, worstRating: 1 } })) };
}
