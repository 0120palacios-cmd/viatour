import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { faqs } from "../data/faqs.mjs";

dotenv.config({ path: [".env.local", ".env"] });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY localmente.");

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = faqs.map(({ orden, categoria, pregunta, respuesta }) => ({ orden, categoria, pregunta, respuesta, publicado: true }));
  const { data: existing, error: readError } = await client.from("faqs").select("id,pregunta");
  if (readError) throw new Error(`No se pudieron consultar las preguntas existentes: ${readError.message}`);
  const idsByQuestion = new Map((existing ?? []).map((row) => [row.pregunta, row.id]));
  let inserted = 0;
  for (const row of rows) {
    const id = idsByQuestion.get(row.pregunta);
    const query = id
      ? client.from("faqs").update(row).eq("id", id)
      : client.from("faqs").insert(row);
    const { error } = await query;
    if (error) throw new Error(`No se pudo importar "${row.pregunta}": ${error.message}`);
    if (!id) inserted += 1;
  }
  console.log(`Preguntas frecuentes importadas: ${inserted} insertadas, ${rows.length - inserted} actualizadas y publicadas.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar la importación.");
  process.exitCode = 1;
});
