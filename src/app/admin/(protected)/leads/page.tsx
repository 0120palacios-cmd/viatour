import Link from "next/link";
import { CalendarDays, FilePlus2, Mail, MapPin, MessageCircle, Phone, Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { LeadStatusForm } from "@/components/admin/lead-status-form";
import { customerWhatsappHref, leadAge, leadContact, leadGreeting, leadServices, leadStateLabels, leadStates, type LeadState } from "@/lib/lead-admin";

export const metadata = pageMetadata("/admin/leads", "viatour | Leads", "Bandeja privada de solicitudes de cotización de viatour.");

const pageSize = 25;
const stateClass: Record<string, string> = { nuevo: "bg-brand-tint text-brand-deep", contactado: "bg-surface text-ink", ganado: "bg-surface text-success", perdido: "bg-surface text-error", cerrado: "bg-surface text-ink-soft" };
const serviceLabel = (value: string) => ({ destino: "Destino", descubrimiento: "Descubrir", contacto: "Contacto" } as Record<string, string>)[value] ?? value;

type Search = { estado?: string; servicio?: string; q?: string; pagina?: string };

function filterHref(current: Search, patch: Partial<Search>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, pagina: undefined, ...patch })) if (value) params.set(key, value);
  const query = params.toString();
  return `/admin/leads${query ? `?${query}` : ""}`;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { client } = await requireAdmin();
  const current = await searchParams;
  const estado = leadStates.includes(current.estado as LeadState) ? current.estado as LeadState : "";
  const servicio = leadServices.includes(current.servicio as never) ? String(current.servicio) : "";
  const search = String(current.q ?? "").replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const page = Math.max(1, Math.min(10000, Math.floor(Number(current.pagina) || 1)));

  const run = (searchColumns: string[]) => {
    let query = client.from("leads").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1);
    if (estado) query = query.eq("estado", estado);
    if (servicio) query = query.eq("servicio", servicio);
    if (search) query = query.or(searchColumns.map(column => `${column}.ilike.%${search}%`).join(","));
    return query;
  };
  let result = await run(["nombre", "destino", "referencia", "telefono", "email"]);
  // Before docs/sql/leads_contact.sql runs, the reference and phone columns do not exist yet.
  if (result.error && search) result = await run(["nombre", "destino"]);
  if (result.error) throw new Error("No se pudieron cargar los leads.");
  const rows = (result.data ?? []) as Record<string, unknown>[];
  const total = result.count ?? 0;

  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="t-h1">Leads</h1><p className="mt-2 text-ink-soft">Solicitudes de cotización capturadas en el sitio, de la más reciente a la más antigua.</p></div></div>
    <form role="search" className="flex flex-col gap-3 sm:flex-row" action="/admin/leads">
      {estado && <input type="hidden" name="estado" value={estado} />}{servicio && <input type="hidden" name="servicio" value={servicio} />}
      <label className="sr-only" htmlFor="lead-search">Buscar leads</label>
      <input id="lead-search" name="q" defaultValue={search} placeholder="Buscar por referencia, nombre, teléfono, correo o destino" className="h-12 w-full rounded-btn border border-line bg-canvas px-3 text-ink focus-visible:border-brand" />
      <Button type="submit" variant="ghost"><Search size={18} strokeWidth={1.75} aria-hidden="true" />Buscar</Button>
    </form>
    <div className="space-y-3">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">{[["", "Todos"], ...leadStates.map(value => [value, leadStateLabels[value]])].map(([value, label]) => <Link key={value || "all"} href={filterHref(current, { estado: value })} aria-current={estado === value ? "page" : undefined} className="t-small rounded-btn border border-line px-4 py-2 text-brand aria-[current=page]:bg-brand-tint">{label}</Link>)}</nav>
      <nav aria-label="Filtrar por servicio" className="flex flex-wrap gap-2">{["", "Vuelos", "Hoteles", "Paquetes", "Paquete", "Viaje a medida", "destino", "descubrimiento", "contacto"].map(value => <Link key={value || "all"} href={filterHref(current, { servicio: value })} aria-current={servicio === value ? "page" : undefined} className="t-small rounded-btn border border-line px-3 py-2 text-ink-soft aria-[current=page]:border-brand aria-[current=page]:text-brand">{value ? serviceLabel(value) : "Todos los servicios"}</Link>)}</nav>
    </div>
    <p className="t-small text-ink-soft">{total} {total === 1 ? "lead" : "leads"} · página {page}</p>
    {!rows.length ? <p className="rounded-card border border-line p-6">No hay leads en esta vista.</p> : <div className="space-y-4">{rows.map(row => {
      const contact = leadContact(row);
      const name = String(row.nombre ?? "").trim();
      const whatsapp = contact.telefono ? customerWhatsappHref(contact.telefono, leadGreeting(name, contact.referencia)) : "";
      const state = String(row.estado ?? "nuevo");
      const origin = [contact.origen.pagina && `Página: ${contact.origen.pagina}`, contact.origen.utm_source && `Fuente: ${contact.origen.utm_source}${contact.origen.utm_campaign ? ` / ${contact.origen.utm_campaign}` : ""}`, contact.origen.referrer && `Referencia web: ${contact.origen.referrer}`].filter(Boolean).join(" · ");
      return <article key={String(row.id)} className="rounded-card border border-line bg-canvas p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><h2 className="t-h3 break-words">{name || "Sin nombre"}</h2><span className={`t-small rounded-btn px-3 py-1 ${stateClass[state] ?? stateClass.cerrado}`}>{leadStateLabels[state as LeadState] ?? state}</span>{contact.referencia && <span className="t-small rounded-btn border border-line px-3 py-1 font-semibold tracking-wide">{contact.referencia}</span>}</div><p className="t-small text-ink-soft">{serviceLabel(String(row.servicio ?? ""))} · {leadAge(String(row.created_at))} · {new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tegucigalpa" }).format(new Date(String(row.created_at)))}</p></div>
          <div className="flex flex-wrap gap-2">{whatsapp && <Button asChild variant="whatsapp"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />Escribir al cliente</a></Button>}<Button asChild variant="ghost"><Link href={`/admin/cotizaciones/nuevo?lead=${row.id}`}><FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" />Crear cotización</Link></Button></div>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {[[MapPin, "Destino", row.destino], [CalendarDays, "Fechas", row.fechas], [Users, "Pasajeros", row.pasajeros], [Phone, "Teléfono", contact.telefono], [Mail, "Correo", contact.email], [MapPin, "Origen del viaje", row.origen], [null, "Clase", row.clase], [null, "Presupuesto", row.presupuesto != null ? `${row.presupuesto} ${row.moneda ?? "USD"}` : ""]].filter(([, , value]) => value).map(([Icon, label, value]) => { const I = Icon as typeof MapPin | null; return <div key={String(label)} className="min-w-0"><dt className="t-small flex items-center gap-1 text-ink-soft">{I && <I size={14} strokeWidth={1.75} aria-hidden="true" />}{String(label)}</dt><dd className="break-words">{String(value)}</dd></div>; })}
        </dl>
        {row.notas ? <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-ink-soft">{String(row.notas)}</p> : null}
        {origin && <p className="t-small mt-3 text-ink-soft">{origin}</p>}
        {row.motivo_perdida ? <p className="t-small mt-3 text-error">Motivo de pérdida: {String(row.motivo_perdida)}</p> : null}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4"><LeadStatusForm id={String(row.id)} estado={state} motivo={String(row.motivo_perdida ?? "")} /><details className="t-small"><summary className="cursor-pointer text-brand">Ver datos completos</summary><pre className="mt-3 max-w-full overflow-auto rounded-btn bg-surface p-4">{JSON.stringify(row.payload, null, 2)}</pre></details></div>
      </article>;
    })}</div>}
    <nav aria-label="Páginas de leads" className="flex gap-4">{page > 1 && <Link className="text-brand underline underline-offset-4" href={filterHref(current, { pagina: String(page - 1) })}>Anterior</Link>}{page * pageSize < total && <Link className="text-brand underline underline-offset-4" href={filterHref(current, { pagina: String(page + 1) })}>Siguiente</Link>}</nav>
  </div>;
}
