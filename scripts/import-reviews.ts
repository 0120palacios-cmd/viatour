// Local owner utility: never import from src/ or expose through a route.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ""; closed = false;
      if (c !== ',') { if (row.some(value => value.trim())) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else {
      if (closed || c === '"') throw new Error("CSV inválido: revise las comillas.");
      cell += c;
    }
  }
  if (quoted) throw new Error("CSV inválido: comillas sin cerrar.");
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}
export function importRows(csv: string) {
  const [headers, ...records] = parseCsv(csv);
  const required = ["nombre", "calificacion", "texto", "destino", "fecha_original", "fuente"];
  const allowed = [...required, "numero_reserva", "email", "verificada"];
  if (!headers || new Set(headers).size !== headers.length || required.some(key => !headers.includes(key)) || headers.some(key => !allowed.includes(key))) throw new Error("Encabezados CSV inválidos.");
  const seen = new Set<string>();
  return records.map((record, index) => {
    const fail = () => { throw new Error(`Fila ${index + 2}: revise campos, longitudes, fecha YYYY-MM-DD, calificación y fuente.`); };
    if (record.length !== headers.length) fail();
    const data = Object.fromEntries(headers.map((key, i) => [key, record[i]?.trim() || ""]));
    const calificacion = Number(data.calificacion);
    const date = new Date(`${data.fecha_original}T00:00:00Z`);
    if (!data.nombre || data.nombre.length > 120 || !data.texto || data.texto.length > 3000 || data.destino.length > 160 || (data.numero_reserva || "").length > 80 || !Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5 || !["facebook", "whatsapp"].includes(data.fuente) || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha_original) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== data.fecha_original || date > new Date()) fail();
    if (data.email && (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) fail();
    if (!["", "true", "false", "1", "0"].includes(data.verificada || "")) fail();
    const identity = JSON.stringify([data.nombre, data.texto, data.fecha_original, data.fuente]);
    if (seen.has(identity)) throw new Error(`Fila ${index + 2}: duplicada en el archivo.`);
    seen.add(identity);
    return { nombre: data.nombre, calificacion, texto: data.texto, destino: data.destino || null, fecha_original: data.fecha_original, fuente: data.fuente, numero_reserva: data.numero_reserva || null, email: data.email || null, verificada: ["true", "1"].includes(data.verificada), estado: "aprobada" };
  });
}
async function main() {
  const file = process.argv[2];
  if (!file || !file.endsWith(".csv")) throw new Error("Indique un archivo CSV UTF-8 exportado desde su hoja de cálculo.");
  const rows = importRows(readFileSync(file, "utf8"));
  if (!rows.length || process.argv.includes("--dry-run")) { console.log(`${rows.length} opiniones validadas. No se insertaron registros.`); return; }
  if (rows.length > 500) throw new Error("Use archivos de hasta 500 opiniones para una sola inserción atómica.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY localmente.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.from("reviews").insert(rows);
  if (error) throw new Error("No se confirmó la importación. Revise la tabla antes de reintentar para evitar duplicados. Para correos ausentes, la columna debe permitir NULL; nunca invente correos.");
  console.log(`${rows.length} opiniones genuinas importadas como aprobadas.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "No se pudo completar la importación."); process.exitCode = 1; });
}
