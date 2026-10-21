import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { PortalView } from "@/app/mi-reserva/page";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminClientPreviewPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin();

  const { id } = await params;

  if (!validUuid(id)) {
    notFound();
  }

  return (
    <main className="container-site section-space">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 rounded-panel border border-brand/30 bg-brand-tint p-5">
          <p className="font-semibold text-brand-deep">
            Vista previa administrativa
          </p>

          <p className="t-small mt-1 text-ink-soft">
            Esta es una vista previa de la experiencia del cliente.
            No se genero ningun codigo OTP, no se inicio sesion como
            cliente y no se envio ningun correo.
          </p>

          <p className="t-small mt-2 font-semibold text-brand-deep">
            PREVIEW - NO ES UNA SESION REAL DEL CLIENTE
          </p>
        </div>

        <PortalView reservationId={id} />

      </div>
    </main>
  );
}
