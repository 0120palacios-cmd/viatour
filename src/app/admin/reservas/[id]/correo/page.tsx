import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { getAdminReservation } from "@/lib/reservation-data";
import { getTravel } from "@/lib/travel-data";
import { getReceipts } from "@/lib/receipt-data";
import { itineraryEmail, receiptEmail, type CustomerEmail } from "@/lib/travel-email";
import { noindexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return noindexMetadata("viatour | Vista previa de correos", "Vista previa privada de los correos al cliente."); }

function Preview({ title, email, preheader, recipient }: { title: string; email: CustomerEmail; preheader: string; recipient: string }) {
  return <section className="space-y-4 rounded-panel border border-line bg-canvas p-4 sm:p-6">
    <h2 className="t-h3">{title}</h2>
    <dl className="t-small grid gap-2 sm:grid-cols-[10rem_1fr]">
      <dt className="text-ink-soft">Para</dt><dd className="break-all font-semibold">{recipient} <span className="font-normal text-ink-soft">(no se envía desde esta página)</span></dd>
      <dt className="text-ink-soft">Asunto</dt><dd className="font-semibold">{email.subject}</dd>
      <dt className="text-ink-soft">Texto de vista previa</dt><dd>{preheader}</dd>
    </dl>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div><p className="t-small mb-2 text-ink-soft">Escritorio</p><iframe title={`${title}: escritorio`} srcDoc={email.html} sandbox="" className="h-[900px] w-full rounded-card border border-line bg-surface" /></div>
      <div><p className="t-small mb-2 text-ink-soft">Teléfono (375 px)</p><iframe title={`${title}: teléfono`} srcDoc={email.html} sandbox="" className="h-[900px] w-[375px] max-w-full rounded-card border border-line bg-surface" /></div>
    </div>
    <details><summary className="min-h-11 cursor-pointer font-semibold text-brand">Versión de texto</summary><pre className="t-small mt-2 overflow-x-auto whitespace-pre-wrap rounded-card bg-surface p-4">{email.text}</pre></details>
  </section>;
}

// Owner review of every customer email for this reservation, rendered from the real data. Read-only:
// nothing here sends, records a delivery or touches the customer's session.
export default async function EmailPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!validUuid(id)) notFound();
  const [record, travel, receipts] = await Promise.all([getAdminReservation(client, id), getTravel(client, id), getReceipts(client, id)]);
  if (!record) notFound();
  const r = record.reservation;
  return <div className="mx-auto max-w-6xl space-y-6">
    <Link href={`/admin/reservas/${id}`} className="t-small inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline">Volver a la reserva {r.codigo}</Link>
    <div><h1 className="t-h2">Vista previa de correos al cliente</h1><p className="t-small mt-1 text-ink-soft">Así recibirá el cliente cada correo. El PDF adjunto es el mismo que se descarga en la reserva. Esta página no envía nada.</p></div>
    {travel.data && r.accepted_snapshot ? (() => { const email = itineraryEmail(r, travel.data); return <Preview title="Itinerario de viaje" email={email} preheader={email.preheader} recipient={r.cliente_email} />; })()
      : <p className="rounded-card border border-line bg-canvas p-5">El correo de itinerario estará disponible cuando el expediente de viaje esté guardado.</p>}
    {receipts.map(receipt => { const email = receiptEmail(receipt); return <Preview key={receipt.id} title={`Recibo ${receipt.number}`} email={email} preheader={email.preheader} recipient={r.cliente_email} />; })}
  </div>;
}
