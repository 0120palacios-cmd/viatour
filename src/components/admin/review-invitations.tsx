import { InvitationForm } from "@/components/admin/review-invitation-form";
import type { AdminReviewInvitation } from "@/lib/review-invitations";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function ReviewInvitationsPanel({ available, rows }: { available: boolean; rows: AdminReviewInvitation[] }) {
  return <section className="mt-12 space-y-6" aria-labelledby="review-invitations-title">
    <div className="space-y-2"><h2 id="review-invitations-title" className="t-h2">Invitaciones para opinar</h2><p className="t-body text-ink-soft">Envíe un enlace individual para asociar la opinión con la persona invitada.</p></div>
    <InvitationForm />
    {!available ? <p role="status" className="rounded-card border border-line bg-surface p-6 t-small">La tabla de invitaciones todavía no está disponible. Ejecute el SQL indicado en docs/sql/review_invitations.sql.</p> : !rows.length ? <p className="rounded-card border border-line p-6 t-body">Aún no hay invitaciones.</p> : <div className="overflow-x-auto rounded-card border border-line"><table className="w-full min-w-[620px] border-collapse text-left"><caption className="sr-only">Invitaciones enviadas para compartir opiniones</caption><thead className="bg-surface"><tr><th className="p-4 t-small" scope="col">Nombre</th><th className="p-4 t-small" scope="col">Correo</th><th className="p-4 t-small" scope="col">Estado</th><th className="p-4 t-small" scope="col">Enviada</th><th className="p-4 t-small" scope="col">Usada</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-line"><td className="p-4 t-body">{row.nombre}</td><td className="p-4 t-body break-all">{row.email}</td><td className="p-4 t-small">{row.estado}</td><td className="p-4 t-small">{formatDate(row.created_at)}</td><td className="p-4 t-small">{formatDate(row.used_at)}</td></tr>)}</tbody></table></div>}
  </section>;
}
