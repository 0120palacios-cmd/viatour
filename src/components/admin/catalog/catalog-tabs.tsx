import Link from "next/link";
import { cn } from "cn";

// Hoteles / Aerolíneas switch at the top of the catalog pages.
export function CatalogTabs({ current }: { current: "hoteles" | "aerolineas" }) {
  const tabs = [["hoteles", "Hoteles"], ["aerolineas", "Aerolíneas"]] as const;
  return <nav aria-label="Catálogos" className="flex gap-2">{tabs.map(([key, label]) => <Link key={key} href={`/admin/catalogos/${key}`} aria-current={current === key ? "page" : undefined} className={cn("t-small flex min-h-11 items-center rounded-btn border px-4", current === key ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line text-ink hover:bg-surface")}>{label}</Link>)}</nav>;
}

export function SchemaNotice() {
  return <p role="alert" className="rounded-card border border-error/40 bg-canvas p-4 text-error">Los catálogos aún no existen en la base de datos. Ejecute docs/sql/quotations_v6.sql en Supabase (ver docs/quotations-v6.md).</p>;
}
