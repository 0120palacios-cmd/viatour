import Link from "next/link";
import { UserPlus, UserRound } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { EmptyState, PageHeader, Pagination, RecordList, RecordRow, SearchForm, primaryLink } from "@/components/admin/ui";

export const metadata = pageMetadata("/admin/clientes", "viatour | Clientes", "Gestión privada de clientes de viatour.");

const pageSize = 50;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const { client } = await requireAdmin();
  const { q, pagina } = await searchParams;
  const search = String(q ?? "").trim();
  const page = Math.max(1, Math.min(10000, Math.floor(Number(pagina) || 1)));
  let query = client.from("customers").select("id,nombre,email,telefono,notas,created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
  if (safe) query = query.or(`nombre.ilike.%${safe}%,email.ilike.%${safe}%,telefono.ilike.%${safe}%`);
  const result = await query;
  if (result.error) throw new Error("No se pudieron cargar los clientes.");
  const customers = result.data ?? [];
  const ids = customers.map(row => String(row.id));
  const [quotations, reservations] = ids.length ? await Promise.all([
    client.from("quotations").select("customer_id").in("customer_id", ids).limit(5000),
    client.from("reservations").select("customer_id").in("customer_id", ids).limit(5000),
  ]) : [{ data: [] }, { data: [] }];
  const tally = (rows: { customer_id: unknown }[] | null) => (rows ?? []).reduce((map, row) => map.set(String(row.customer_id), (map.get(String(row.customer_id)) ?? 0) + 1), new Map<string, number>());
  const quotationCount = tally(quotations.data), reservationCount = tally(reservations.data);
  const total = result.count ?? customers.length;
  const href = (n: number) => `/admin/clientes?${new URLSearchParams({ ...(search ? { q: search } : {}), pagina: String(n) })}`;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return <>
    <PageHeader title="Clientes" description="Contactos, historial de cotizaciones y reservas de cada cliente." actions={<Link href="/admin/clientes/nuevo" className={primaryLink}><UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />Crear cliente</Link>} />
    <SearchForm id="customer-search" action="/admin/clientes" placeholder="Buscar por nombre, correo o teléfono" defaultValue={search} />
    {!customers.length ? <EmptyState title={search ? "Ningún cliente coincide con la búsqueda" : "Todavía no hay clientes"} description={search ? <Link href="/admin/clientes" className="text-brand underline underline-offset-4">Ver todos los clientes</Link> : "Los clientes se crean aquí o automáticamente al guardar una cotización."} action={search ? undefined : <Link href="/admin/clientes/nuevo" className={primaryLink}>Crear cliente</Link>} /> : <RecordList label="Clientes">{customers.map((customer: Record<string, unknown>) => {
      const id = String(customer.id);
      return <RecordRow key={id} href={`/admin/clientes/${id}`} icon={<UserRound size={18} strokeWidth={1.75} />} title={String(customer.nombre)}
        meta={<span className="break-all">{String(customer.email)}{customer.telefono ? ` · ${customer.telefono}` : ""}</span>}
        aside={<span className="t-small text-ink-soft">{plural(quotationCount.get(id) ?? 0, "cotización", "cotizaciones")} · {plural(reservationCount.get(id) ?? 0, "reserva", "reservas")}</span>} />;
    })}</RecordList>}
    <Pagination label="Páginas de clientes" summary={`${plural(total, "cliente", "clientes")} · página ${page}`} previous={page > 1 ? href(page - 1) : undefined} next={page * pageSize < total ? href(page + 1) : undefined} />
  </>;
}
