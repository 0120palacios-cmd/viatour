import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { adminPage } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { getAdminReviewInvitations } from "@/lib/review-invitations";
import { getReviewPhotoSignedUrl } from "@/lib/reviews";
import { ReviewInvitationsPanel } from "@/components/admin/review-invitations";
import { DeleteForm, StatusForm } from "@/components/admin/forms";
import { EmptyState, FilterNav, PageHeader, Pagination, RecordList, RecordRow, StatusBadge, primaryLink } from "@/components/admin/ui";
import { reviewStatusLabels } from "@/lib/admin-status";

const sections = { opiniones: "reviews", paquetes: "packages", destinos: "destinations", leads: "leads", blog: "blog_posts", faq: "faqs" } as const;
const reviewStates = ["todas", "pendiente", "aprobada", "rechazada", "despublicada"];
const labels: Record<string, string> = {
  email: "Correo electrónico", destino: "Destino", fecha: "Fecha", fuente: "Fuente", numero_reserva: "Número de reserva",
  id: "Identificador", servicio: "Servicio", nombre: "Nombre", origen: "Origen", fechas: "Fechas", pasajeros: "Pasajeros", clase: "Clase", presupuesto: "Presupuesto", moneda: "Moneda", notas: "Notas", estado: "Estado", created_at: "Fecha de solicitud", updated_at: "Última actualización", user_agent: "Navegador", telefono: "Teléfono",
};

export async function generateMetadata({ params }: { params: Promise<{ section: string; id?: string }> }) {
  const { section, id } = await params;
  const url = "/admin/" + section + (id ? "/" + id : "");
  return pageMetadata(url, "viatour | Administración de " + section + (id ? " — " + id : ""), "Administración privada de " + section + (id ? ". Registro " + id : "") + ". Contenido excluido de la indexación pública.");
}

async function ReviewRecord({ row }: { row: Record<string, unknown> }) {
  const photoUrl = typeof row.foto_path === "string" && row.foto_path ? await getReviewPhotoSignedUrl(row.foto_path) : null;
  return <>
    <h2 className="t-h3">{String(row.nombre)}</h2>
    <div className="my-4 flex gap-1" aria-label={`${row.calificacion} de 5 estrellas`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden size={20} strokeWidth={1.75} className={i < Number(row.calificacion) ? "fill-amber text-amber" : "text-ink-soft"} />)}</div>
    <p className="whitespace-pre-wrap">{String(row.texto)}</p>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">{["email", "destino", "fecha", "fuente", "numero_reserva"].map(key => <div key={key}><dt className="t-small text-ink-soft">{labels[key]}</dt><dd className="break-words">{String(row[key] ?? "—")}</dd></div>)}</dl>
    {photoUrl && <a href={photoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block"><Image unoptimized width={128} height={128} src={photoUrl} alt={`Foto de la opinión de ${row.nombre}`} className="h-32 w-32 rounded-card object-cover" /></a>}
    <StatusForm table="reviews" row={row} />
  </>;
}

function LeadRecord({ row }: { row: Record<string, unknown> }) {
  return <><h2 className="t-h3">{String(row.nombre ?? "Solicitud de cotización")}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{Object.entries(row).filter(([key]) => key !== "payload").map(([key, value]) => <div key={key}><dt className="t-small text-ink-soft">{labels[key] ?? key}</dt><dd className="break-all whitespace-pre-wrap">{key === "presupuesto" && value != null ? `${value} ${row.moneda ?? "USD"}` : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "—")}</dd></div>)}</dl><details className="mt-4"><summary className="cursor-pointer text-brand">Ver datos completos de la solicitud</summary><pre className="mt-4 overflow-auto rounded-btn bg-surface p-4 t-small">{JSON.stringify(row.payload, null, 2)}</pre></details><StatusForm table="leads" row={row} /></>;
}

export default async function Page({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const table = sections[section as keyof typeof sections];
  const { estado, pagina } = await searchParams;
  const page = Math.max(1, Math.min(100000, Number(pagina) || 1));
  const { rows, total } = await adminPage(table, Math.floor(page), estado);
  const invitations = table === "reviews" ? await getAdminReviewInvitations() : null;
  const title = { reviews: "Opiniones", packages: "Paquetes", destinations: "Destinos", leads: "Leads", blog_posts: "Blog", faqs: "Preguntas frecuentes" }[table];

  const createLabel = ({ faqs: "Crear pregunta frecuente", packages: "Crear paquete", blog_posts: "Crear publicación", destinations: "Crear destino" } as Record<string, string>)[table];
  const descriptions: Record<string, string> = { reviews: "Opiniones enviadas por clientes. Solo las aprobadas se publican en el sitio.", packages: "Paquetes publicados en el sitio. Las cotizaciones se preparan en Cotizaciones.", destinations: "Guías de destino del sitio público.", leads: "Solicitudes de cotización del sitio.", blog_posts: "Publicaciones del blog.", faqs: "Preguntas frecuentes del sitio." };
  const pageHref = (n: number) => `/admin/${section}?pagina=${n}${estado ? `&estado=${encodeURIComponent(estado)}` : ""}`;

  return <>
    <PageHeader title={title} description={descriptions[table]} actions={createLabel ? <Link className={primaryLink} href={`/admin/${section}/nuevo`}>{createLabel}</Link> : undefined} />
    {table === "reviews" && <FilterNav label="Filtrar opiniones por estado" items={reviewStates.map(state => ({ href: `/admin/opiniones${state === "todas" ? "" : `?estado=${state}`}`, label: state === "todas" ? "Todas" : reviewStatusLabels[state] ?? state, current: (estado ?? "todas") === state }))} />}
    {table === "blog_posts" && <FilterNav label="Filtrar publicaciones" items={[["", "Todas"], ["true", "Publicadas"], ["false", "Borradores"]].map(([value, label]) => ({ href: `/admin/blog${value ? `?estado=${value}` : ""}`, label, current: (estado ?? "") === value }))} />}
    {!rows.length ? <EmptyState title="No hay registros en esta vista" /> : table === "reviews" || table === "leads" ? <div className="space-y-4">{rows.map(row => <article key={String(row.id)} className="rounded-card border border-line bg-canvas p-4 sm:p-6">{table === "reviews" ? <ReviewRecord row={row} /> : <LeadRecord row={row} />}</article>)}</div>
      : <RecordList label={title}>{rows.map(row => <RecordRow key={String(row.id)} href={`/admin/${section}/${row.id}`} title={String(row.pregunta ?? row.titulo ?? row.nombre)} badges={<StatusBadge tone={row.publicado ? "success" : "muted"}>{row.publicado ? "Publicado" : "Borrador"}</StatusBadge>} meta={<>{String(row.categoria ?? row.slug ?? "General")} · Orden {String(row.orden)}{table === "blog_posts" ? ` · ${String(row.publicado_en ?? "Sin fecha")}` : ""}</>} actions={<DeleteForm table={table} id={String(row.id)} name={String(row.pregunta ?? row.titulo ?? row.nombre)} />} />)}</RecordList>}
    <Pagination label="Páginas de registros" summary={`${total} registros · página ${Math.floor(page)}`} previous={page > 1 ? pageHref(Math.floor(page) - 1) : undefined} next={page * 50 < total ? pageHref(Math.floor(page) + 1) : undefined} />
    {invitations && <ReviewInvitationsPanel available={invitations.available} rows={invitations.rows} />}
  </>;
}
