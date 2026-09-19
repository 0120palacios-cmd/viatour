export const metadata = { title: "viatour | Guía interna de diseño", description: "Guía interna de componentes y diseño de viatour.", robots: { index: false, follow: false } };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const colors = [
  { name: "ink", hex: "#12161C", background: "bg-ink" },
  { name: "ink-soft", hex: "#5A6672", background: "bg-ink-soft" },
  { name: "canvas", hex: "#FFFFFF", background: "bg-canvas" },
  { name: "surface", hex: "#F5F7F8", background: "bg-surface" },
  { name: "line", hex: "#E4E8EB", background: "bg-line" },
  { name: "brand", hex: "#1656D6", background: "bg-brand" },
  { name: "brand-deep", hex: "#103FAE", background: "bg-brand-deep" },
  { name: "brand-tint", hex: "#E9F0FE", background: "bg-brand-tint" },
  { name: "wa", hex: "#25D366", background: "bg-wa" },
  { name: "wa-deep", hex: "#1EBE5B", background: "bg-wa-deep" },
  { name: "amber", hex: "#F5A524", background: "bg-amber" },
  { name: "success", hex: "#16A34A", background: "bg-success" },
  { name: "error", hex: "#DC2626", background: "bg-error" },
] as const;

const typography = [
  "t-display",
  "t-h1",
  "t-h2",
  "t-h3",
  "t-body-lg",
  "t-body",
  "t-small",
] as const;

export default function StyleguidePage() {
  return (
    <main className="container-site space-y-16 py-12">
      <section className="space-y-6" aria-labelledby="colores">
        <h1 id="colores" className="t-h1">Colores</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((color) => (
            <div key={color.name} className="overflow-hidden rounded-card border border-line">
              <div className={`h-24 ${color.background}`} />
              <div className="space-y-1 bg-canvas p-4">
                <p className="t-small">{color.name}</p>
                <p className="t-small text-ink-soft">{color.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8" aria-labelledby="tipografia">
        <h2 id="tipografia" className="t-h2">Tipografía</h2>
        {typography.map((role) => (
          <div key={role} className="space-y-2">
            <p className="t-small text-ink-soft">.{role}</p>
            <div className={role}>Sus asesores de viaje en Honduras.</div>
          </div>
        ))}
      </section>

      <section className="space-y-6" aria-labelledby="controles">
        <h2 id="controles" className="t-h2">Controles</h2>
        <div className="flex flex-wrap gap-4">
          <Button type="button">Primario</Button>
          <Button type="button" variant="whatsapp">WhatsApp</Button>
          <Button type="button" variant="ghost">Fantasma</Button>
        </div>
        <div className="measure space-y-2">
          <label htmlFor="campo" className="t-small">Campo de texto</label>
          <Input id="campo" type="text" />
        </div>
        <p className="measure t-body text-ink-soft">
          Presione Tab para recorrer los controles y comprobar el contorno de enfoque.
        </p>
      </section>

      <section className="space-y-6" aria-labelledby="radios">
        <h2 id="radios" className="t-h2">Radios</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-btn border border-line bg-surface p-8 t-small">rounded-btn — 10px</div>
          <div className="rounded-card border border-line bg-surface p-8 t-small">rounded-card — 16px</div>
          <div className="rounded-panel border border-line bg-surface p-8 t-small">rounded-panel — 20px</div>
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="sombras">
        <h2 id="sombras" className="t-h2">Sombras</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-canvas p-8 shadow-sm t-small">shadow-sm</div>
          <div className="rounded-card border border-line bg-canvas p-8 shadow-md t-small">shadow-md</div>
        </div>
      </section>
    </main>
  );
}
