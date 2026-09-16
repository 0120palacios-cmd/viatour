import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
export async function getDestinations(featured = false): Promise<Destination[]> {
  const supabase = await createClient();
  let query = supabase.from("destinations").select(columns).eq("publicado", true).order("orden").order("slug");
  if (featured) query = query.eq("destacado", true);
  const { data, error } = await query.abortSignal(AbortSignal.timeout(8000));
  if (error) throw new Error("No se pudieron cargar los destinos.");
  return (data as Destination[]).map(normalize);
}
export const getDestination = cache(async (value: string, by: "slug" | "id" = "slug"): Promise<Destination | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("destinations").select(columns).eq("publicado", true).eq(by, value).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
  if (error) throw new Error("No se pudo cargar el destino.");
  return data ? normalize(data as Destination) : null;
});
