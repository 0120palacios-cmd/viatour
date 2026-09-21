import { RequirementsChecker } from "@/components/requirements/requirements-checker";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "/requisitos",
  "viatour | Requisitos de viaje",
  "Consulte requisitos referenciales de visa, permanencia y pasaporte para su viaje desde Honduras. Verifique siempre con la autoridad oficial."
);

export default function RequirementsPage() {
  return (
    <main>
      <section className="container-site section-space" aria-labelledby="requirements-page-title">
        <div className="mb-12 max-w-3xl space-y-6">
          <p className="t-small text-brand">Antes de viajar</p>
          <h1 id="requirements-page-title" className="t-h1">Requisitos de viaje</h1>
          <p className="t-body-lg text-ink-soft">Consulte una orientación inicial según su pasaporte, destino, fechas y escalas. Cuando necesite confirmación para su caso, escríbanos.</p>
        </div>
        <RequirementsChecker />
      </section>
    </main>
  );
}
