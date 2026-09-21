import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production" || process.env.SEED_DEV !== "1") {
  throw new Error("Refusado: use únicamente NODE_ENV distinto de production y SEED_DEV=1.");
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
if (/miviatour\.com$/i.test(new URL(siteUrl || "http://localhost").hostname)) {
  throw new Error("Refusado: el fixture no se puede ejecutar contra el dominio de producción.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");

const reviews = [
  { id: "00000000-0000-4000-8000-000000000001", nombre: "Prueba local uno", email: "dev-review-1@example.invalid", calificacion: 5, texto: "Opinión de fixture local para verificar la distribución.", destino: "Fixture local", fuente: "dev-fixture", estado: "aprobada", verificada: true },
  { id: "00000000-0000-4000-8000-000000000002", nombre: "Prueba local dos", email: "dev-review-2@example.invalid", calificacion: 4, texto: "Segundo registro de fixture local para verificar el promedio.", destino: "Fixture local", fuente: "dev-fixture", estado: "aprobada", verificada: false },
  { id: "00000000-0000-4000-8000-000000000003", nombre: "Prueba local tres", email: "dev-review-3@example.invalid", calificacion: 4, texto: "Tercer registro de fixture local para verificar el promedio.", destino: "Fixture local", fuente: "dev-fixture", estado: "aprobada", verificada: false },
  { id: "00000000-0000-4000-8000-000000000004", nombre: "Prueba local cuatro", email: "dev-review-4@example.invalid", calificacion: 3, texto: "Cuarto registro de fixture local para verificar el promedio.", destino: "Fixture local", fuente: "dev-fixture", estado: "aprobada", verificada: false },
  { id: "00000000-0000-4000-8000-000000000005", nombre: "Prueba local cinco", email: "dev-review-5@example.invalid", calificacion: 1, texto: "Quinto registro de fixture local para verificar el promedio.", destino: "Fixture local", fuente: "dev-fixture", estado: "aprobada", verificada: false },
];

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const inserted = await client.from("reviews").upsert(reviews, { onConflict: "id" });
if (inserted.error) throw new Error(`No se pudieron cargar los fixtures: ${inserted.error.message}`);

const summary = await client.from("reviews_resumen").select("total,promedio,c5,c4,c3,c2,c1").single();
if (summary.error) throw new Error(`No se pudo leer reviews_resumen: ${summary.error.message}`);
console.log(JSON.stringify({ fixture: "dev-fixture", esperado: { total: 5, promedio: 3.4, c5: 1, c4: 2, c3: 1, c2: 0, c1: 1 }, actual: summary.data }, null, 2));
