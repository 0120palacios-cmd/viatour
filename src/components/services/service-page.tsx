import { FlightTool, type FlightToolTab } from "@/components/home/flight-tool";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FinalCta } from "@/components/home/sections";

type ServicePageProps = {
  breadcrumbLabel: string;
  path: string;
  title: string;
  intro: string;
  defaultTab: FlightToolTab;
  help: readonly [string, string, string];
};

export function ServicePage({ breadcrumbLabel, path, title, intro, defaultTab, help }: ServicePageProps) {
  return <main>
    <section className="container-site section-space">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: breadcrumbLabel, href: path }]} />
      <header className="mt-8 max-w-3xl space-y-6">
        <h1 className="t-h1">{title}</h1>
        <p className="t-body-lg measure text-ink-soft">{intro}</p>
      </header>
      <section className="mt-12 rounded-panel border border-line bg-surface p-2 sm:p-4" aria-label="Solicitar cotización">
        <FlightTool defaultTab={defaultTab} />
      </section>
      <section className="mt-14 space-y-8" aria-labelledby="help-title">
        <h2 id="help-title" className="t-h2">Cómo le ayudamos</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {help.map((item, index) => <li key={item} className="rounded-card border border-line bg-canvas p-6 shadow-sm">
            <span className="t-small text-brand">{String(index + 1).padStart(2, "0")}</span>
            <p className="t-body mt-6">{item}</p>
          </li>)}
        </ol>
      </section>
    </section>
    <FinalCta />
  </main>;
}
