import "server-only";
import { createClient } from "@/lib/supabase/server";
export type FAQ = {
    id: string;
    pregunta: string;
    respuesta: string;
    categoria: string | null;
    orden: number;
};
export async function getFAQs(): Promise<FAQ[]> { const client = await createClient(); const { data, error } = await client.from("faqs").select("id,pregunta,respuesta,categoria,orden").eq("publicado", true).order("orden").order("id").abortSignal(AbortSignal.timeout(8000)); if (error)
    throw Error("No se pudieron cargar las preguntas frecuentes."); return data as FAQ[]; }
