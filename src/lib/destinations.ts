import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedContent } from "@/lib/content-cache";

export type Destination = {
  id: string; slug: string; nombre: string; titulo_seo: string | null;
  meta_descripcion: string | null; intro: string | null; cuerpo: string | null;
  mejor_epoca: string | null; faqs: { pregunta: string; respuesta: string }[];
  imagen_url: string | null; destacado: boolean; publicado: boolean; orden: number;
};
const columns = "id,slug,nombre,titulo_seo,meta_descripcion,intro,cuerpo,mejor_epoca,faqs,imagen_url,destacado,publicado,orden";
function normalize(item: Destination): Destination {
  return { ...item, faqs: Array.isArray(item.faqs) ? item.faqs.filter(faq => faq && typeof faq.pregunta === "string" && faq.pregunta.trim() && typeof faq.respuesta === "string" && faq.respuesta.trim()) : [] };
}
const readDestinations = cachedContent(async (featured: boolean): Promise<Destination[]> => {
  const supabase = createPublicClient();
  let query = supabase.from("destinations").select(columns).eq("publicado", true).order("orden").order("slug");
  if (featured) query = query.eq("destacado", true);
  const { data, error } = await query.abortSignal(AbortSignal.timeout(8000));
  if (error) throw new Error("No se pudieron cargar los destinos.");
  return (data as Destination[]).map(normalize);
}, "destinations", "destinations");
export async function getDestinations(featured = false): Promise<Destination[]> {
  return readDestinations(featured);
}
const readDestination = cachedContent(async (value: string, by: "slug" | "id"): Promise<Destination | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("destinations").select(columns).eq("publicado", true).eq(by, value).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
  if (error) throw new Error("No se pudo cargar el destino.");
  return data ? normalize(data as Destination) : null;
}, "destination", "destinations");
export const getDestination = cache((value: string, by: "slug" | "id" = "slug") => readDestination(value, by));
