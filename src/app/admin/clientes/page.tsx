import Link from "next/link";
import { UserPlus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = pageMetadata("/admin/clientes", "viatour | Clientes", "Gestión privada de clientes de viatour.");

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { client } = await requireAdmin();
  const { q } = await searchParams;
  const search = String(q ?? "").trim();
  let query = client.from("customers").select("id,nombre,email,telefono,notas,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  if (search) {
    const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
    if (safe) query = query.or(`nombre.ilike.%${safe}%,email.ilike.%${safe}%,telefono.ilike.%${safe}%`);
  }
  const result = await query;
  if (result.error) throw new Error("No se pudieron cargar los clientes.");
  const customers = result.data ?? [];
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="t-h1">Clientes</h1><p className="mt-2 text-ink-soft">Clientes disponibles para preparar cotizaciones.</p></div><Button asChild><Link href="/admin/clientes/nuevo"><UserPlus size={19} strokeWidth={1.75} aria-hidden="true" />Crear cliente</Link></Button></div>
    <form className="flex flex-col gap-3 sm:flex-row" role="search"><label className="sr-only" htmlFor="customer-search">Buscar clientes</label><Input id="customer-search" name="q" placeholder="Buscar por nombre, correo o teléfono" defaultValue={search} /><Button type="submit" variant="ghost">Buscar</Button></form>
    {!customers.length ? <p className="rounded-card border p-6">No hay clientes en esta vista.</p> : <div className="grid gap-4 lg:grid-cols-2">{customers.map((customer: Record<string, unknown>) => <article key={String(customer.id)} className="rounded-card border bg-canvas p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="t-h3">{String(customer.nombre)}</h2><p className="mt-2 break-all text-ink-soft">{String(customer.email)}</p>{customer.telefono ? <p className="text-ink-soft">{String(customer.telefono)}</p> : null}</div><Link className="text-brand underline underline-offset-4" href={`/admin/clientes/${customer.id}`}>Editar</Link></div>{customer.notas ? <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-ink-soft">{String(customer.notas)}</p> : null}</article>)}</div>}
  </div>;
}
