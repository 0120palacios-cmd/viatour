import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { adminPage } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";
import { getAdminReviewInvitations } from "@/lib/review-invitations";
import { reviewPhotoUrl } from "@/lib/reviews";
import { ReviewInvitationsPanel } from "@/components/admin/review-invitations";
import { DeleteForm, StatusForm } from "@/components/admin/forms";

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

function ReviewRecord({ row }: { row: Record<string, unknown> }) {
  return <>
    <h2 className="t-h3">{String(row.nombre)}</h2>
    <div className="my-4 flex gap-1" aria-label={`${row.calificacion} de 5 estrellas`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden size={20} strokeWidth={1.75} className={i < Number(row.calificacion) ? "fill-amber text-amber" : "text-ink-soft"} />)}</div>
    <p className="whitespace-pre-wrap">{String(row.texto)}</p>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">{["email", "destino", "fecha", "fuente", "numero_reserva"].map(key => <div key={key}><dt className="t-small text-ink-soft">{labels[key]}</dt><dd className="break-words">{String(row[key] ?? "—")}</dd></div>)}</dl>
    {typeof row.foto_path === "string" && row.foto_path && <a href={reviewPhotoUrl(row.foto_path)} target="_blank" rel="noreferrer" className="mt-4 inline-block"><Image unoptimized width={128} height={128} src={reviewPhotoUrl(row.foto_path)} alt={`Foto de la opinión de ${row.nombre}`} className="h-32 w-32 rounded-card object-cover" /></a>}
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
  const title = { reviews: "Opiniones", packages: "Paquetes", destinations: "Destinos", leads: "Leads", blog_posts: "Blog", faqs: "FAQ" }[table];

  return <>
    <div className="mb-6 flex flex-wrap justify-between gap-4"><h1 className="t-h1">{title}</h1>{["packages", "destinations", "blog_posts", "faqs"].includes(table) && <Link className="rounded-btn bg-brand px-6 py-3 text-canvas" href={`/admin/${section}/nuevo`}>Crear {table === "faqs" ? "pregunta frecuente" : table === "packages" ? "paquete" : table === "blog_posts" ? "publicación" : "destino"}</Link>}</div>
    {table === "reviews" && <nav aria-label="Filtrar opiniones por estado" className="mb-6 flex flex-wrap gap-4">{reviewStates.map(state => <Link key={state} aria-current={(estado ?? "todas") === state ? "page" : undefined} className="rounded-btn border p-3 text-brand aria-[current=page]:bg-brand-tint" href={`/admin/opiniones${state === "todas" ? "" : `?estado=${state}`}`}>{state === "todas" ? "Todas" : state}</Link>)}</nav>}
    {table === "blog_posts" && <nav aria-label="Filtrar publicaciones" className="mb-6 flex flex-wrap gap-4">{[["", "Todas"], ["true", "Publicadas"], ["false", "Borradores"]].map(([value, label]) => <Link key={value} href={`/admin/blog${value ? `?estado=${value}` : ""}`} aria-current={(estado ?? "") === value ? "page" : undefined} className="rounded-btn border p-3 text-brand aria-[current=page]:bg-brand-tint">{label}</Link>)}</nav>}
    <p className="t-small mb-6 text-ink-soft">{total} registros. Página {Math.floor(page)}.</p>
    {!rows.length && <p className="rounded-card border p-6">No hay registros en esta vista.</p>}
    <div className="space-y-6">{rows.map(row => <article key={String(row.id)} className="rounded-card border p-6">{table === "reviews" ? <ReviewRecord row={row} /> : table === "leads" ? <LeadRecord row={row} /> : <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="t-h3">{String(row.pregunta ?? row.titulo ?? row.nombre)}</h2><p className="t-small text-ink-soft">{String(row.categoria ?? row.slug ?? "General")} · {row.publicado ? "Publicado" : "Borrador"} · Orden {String(row.orden)}{table === "blog_posts" && <span> · {String(row.categoria)} · {String(row.publicado_en ?? "Sin fecha")}</span>}</p></div><div className="flex items-center gap-4"><Link className="text-brand underline" href={`/admin/${section}/${row.id}`}>Editar</Link><DeleteForm table={table} id={String(row.id)} name={String(row.pregunta ?? row.titulo ?? row.nombre)} /></div></div>}</article>)}</div>
    <nav aria-label="Páginas de registros" className="mt-6 flex gap-4">{page > 1 && <Link className="text-brand underline" href={`/admin/${section}?pagina=${Math.floor(page) - 1}${estado ? `&estado=${encodeURIComponent(estado)}` : ""}`}>Anterior</Link>}{page * 50 < total && <Link className="text-brand underline" href={`/admin/${section}?pagina=${Math.floor(page) + 1}${estado ? `&estado=${encodeURIComponent(estado)}` : ""}`}>Siguiente</Link>}</nav>
    {invitations && <ReviewInvitationsPanel available={invitations.available} rows={invitations.rows} />}
  </>;
}
