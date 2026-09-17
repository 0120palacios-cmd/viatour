import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/admin/login");
  const admin = await client.rpc("is_admin");
  if (admin.error || admin.data !== true) redirect("/admin/login");
  return { client, user };
}

export async function adminRows(table: "reviews" | "packages" | "destinations" | "leads") {
  const { client } = await requireAdmin();
  const { data, error } = await client.from(table).select("*").order(table === "packages" || table === "destinations" ? "orden" : "created_at", { ascending: table === "packages" || table === "destinations" }).limit(500);
  if (error) throw new Error("No se pudieron cargar los registros. Intente nuevamente.");
  return data as Record<string, unknown>[];
}

export async function adminPage(table: "reviews" | "packages" | "destinations" | "leads", page: number, state?: string) {
  const { client } = await requireAdmin();
  let query = client.from(table).select("*", { count: "exact" });
  if (table === "reviews" && state && ["pendiente", "aprobada", "rechazada"].includes(state)) query = query.eq("estado", state);
  const content = table === "packages" || table === "destinations";
  const { data, error, count } = await query.order(content ? "orden" : "created_at", { ascending: content }).order("id").range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("No se pudieron cargar los registros.");
  return { rows: data as Record<string, unknown>[], total: count ?? 0 };
}
