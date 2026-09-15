import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Package = {
  id: string; slug: string; nombre: string; destino: string; resumen: string;
  descripcion: string; incluye: string[]; duracion: string;
  precio_desde: number | null; moneda: string; imagen_url: string | null;
  destacado: boolean; publicado: boolean; orden: number;
};
const columns = "id,slug,nombre,destino,resumen,descripcion,incluye,duracion,precio_desde,moneda,imagen_url,destacado,publicado,orden";

export async function getPackages(featured = false): Promise<Package[]> {
  const supabase = await createClient();
  let query = supabase.from("packages").select(columns).eq("publicado", true).order("orden").order("slug");
  if (featured) query = query.eq("destacado", true).limit(3);
  const { data, error } = await query.abortSignal(AbortSignal.timeout(8000));
  if (error) throw new Error("No se pudieron cargar los paquetes.");
  return data as Package[];
}
export const getPackage = cache(async (slug: string): Promise<Package | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("packages").select(columns).eq("publicado", true).eq("slug", slug).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
  if (error) throw new Error("No se pudo cargar el paquete.");
  return data as Package | null;
});

