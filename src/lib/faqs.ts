import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedContent } from "@/lib/content-cache";
export type FAQ = {
    id: string;
    pregunta: string;
    respuesta: string;
    categoria: string | null;
    orden: number;
};
export const getFAQs = cachedContent(async (): Promise<FAQ[]> => { const client = createPublicClient(); const { data, error } = await client.from("faqs").select("id,pregunta,respuesta,categoria,orden").eq("publicado", true).order("orden").order("id").abortSignal(AbortSignal.timeout(8000)); if (error)
    throw Error("No se pudieron cargar las preguntas frecuentes."); return data as FAQ[]; }, "faqs", "faqs");
