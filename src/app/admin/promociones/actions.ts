"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function createPromoCode(form: FormData) {
  const { client } = await requireAdmin();
  const name = String(form.get("cliente_nombre") ?? "").trim().slice(0, 160) || null;
  const reservation = String(form.get("reservation_ref") ?? "").trim().slice(0, 100) || null;
  const expiry = String(form.get("expires_at") ?? "");
  const expiresAt = expiry ? new Date(`${expiry}T23:59:59Z`) : new Date(Date.now() + 183 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date() || expiresAt > new Date(Date.now() + 367 * 24 * 60 * 60 * 1000)) throw new Error("Seleccione una fecha de vencimiento dentro del próximo año.");
  const code = `VT-${randomBytes(8).toString("hex").toUpperCase()}`;
  const { error } = await client.from("promo_spins").insert({ code, cliente_nombre: name, reservation_ref: reservation, expires_at: expiresAt.toISOString() });
  if (error) throw new Error("No se pudo generar el código. Ejecute primero la migración promo_spins.");
  revalidatePath("/admin/promociones");
}
