import Link from "next/link";
import { cn } from "cn";

// Hoteles / Aerolíneas / Servicios switch at the top of the catalog pages.
export function CatalogTabs({ current }: { current: "hoteles" | "aerolineas" | "servicios" }) {
  const tabs = [["hoteles", "Hoteles"], ["aerolineas", "Aerolíneas"], ["servicios", "Servicios y navieras"]] as const;
  return <nav aria-label="Catálogos" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><ul className="chip-row flex gap-2">{tabs.map(([key, label]) => <li key={key}><Link href={`/admin/catalogos/${key}`} aria-current={current === key ? "page" : undefined} className={cn("t-small flex min-h-11 items-center whitespace-nowrap rounded-btn border px-4", current === key ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line bg-canvas text-ink hover:bg-surface")}>{label}</Link></li>)}</ul></nav>;
}

export function SchemaNotice({ file = "docs/sql/quotations_v6.sql", doc = "docs/quotations-v6.md" }: { file?: string; doc?: string }) {
  return <p role="alert" className="rounded-card border border-error/40 bg-canvas p-4 text-error">Este catálogo aún no existe en la base de datos. Ejecute {file} en Supabase (ver {doc}).</p>;
}
