import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicReview = { id: string; nombre: string; calificacion: number; texto: string; destino: string | null; foto_path: string | null; fecha: string; verificada: boolean; created_at: string };
export type ReviewSummary = { total: number; promedio: number; c5: number; c4: number; c3: number; c2: number; c1: number };
export async function getReviews(limit = 30, page = 1) {
  const client = await createClient();
  const [summary, reviews] = await Promise.all([
    client.from("reviews_resumen").select("total,promedio,c5,c4,c3,c2,c1").abortSignal(AbortSignal.timeout(8000)).single(),
    client.from("reviews_publicas").select("id,nombre,calificacion,texto,destino,foto_path,fecha,verificada,created_at").order("fecha", { ascending: false }).order("id").range((page - 1) * limit, page * limit - 1).abortSignal(AbortSignal.timeout(8000)),
  ]);
  if (summary.error || reviews.error) throw new Error("No se pudieron cargar las opiniones.");
  const raw = summary.data;
  const aggregate = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Number(value) || 0])) as ReviewSummary;
  return { summary: aggregate, reviews: reviews.data as PublicReview[] };
}
export function reviewPhotoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-photos/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export function reviewSchema(summary: ReviewSummary, reviews: PublicReview[]) {
  if (!summary.total) return null;
  return { "@context": "https://schema.org", "@type": "TravelAgency", "@id": "https://miviatour.com/#agency", name: "viatour", url: "https://miviatour.com", aggregateRating: { "@type": "AggregateRating", ratingValue: summary.promedio.toFixed(1), reviewCount: summary.total, bestRating: 5, worstRating: 1 }, review: reviews.map(review => ({ "@type": "Review", author: { "@type": "Person", name: review.nombre }, reviewBody: review.texto, datePublished: review.fecha, reviewRating: { "@type": "Rating", ratingValue: review.calificacion, bestRating: 5, worstRating: 1 } })) };
}
