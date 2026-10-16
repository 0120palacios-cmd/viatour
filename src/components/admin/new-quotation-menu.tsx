"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, FilePlus2, Hotel, Package, Plane, Receipt, Ship } from "lucide-react";

const kinds = [
  ["combinado", "Paquete combinado", "Cualquier combinación de vuelos, hoteles, ferris, traslados, tours y seguros.", Package],
  ["vuelo", "Vuelo", "Itinerario pegado, tarifa y equipaje.", Plane],
  ["hotel", "Hotel", "Estadía con habitaciones, fotos e inclusiones.", Hotel],
  ["ferry", "Ferry", "Ida o ida y vuelta con condiciones de la naviera.", Ship],
  ["general", "Otros servicios", "Conceptos libres con precio.", Receipt],
] as const;

// One primary action instead of a row of five buttons. `query` carries context such as the
// customer the quotation is for (cliente=<id>).
export function NewQuotationMenu({ query = "", label = "Nueva cotización", variant = "primary" }: { query?: string; label?: string; variant?: "primary" | "secondary" }) {
  const trigger = variant === "primary" ? "bg-brand text-white hover:bg-brand-deep data-[state=open]:bg-brand-deep" : "border border-line text-ink hover:bg-surface data-[state=open]:bg-surface";
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger className={`inline-flex min-h-12 items-center gap-2 rounded-btn px-5 font-semibold ${trigger}`}>
      <FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" />{label}<ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={16} className="z-50 w-[min(360px,calc(100vw-32px))] rounded-card border border-line bg-canvas p-2 shadow-md">
        <DropdownMenu.Label className="t-small px-3 py-2 text-ink-soft">Tipo de cotización</DropdownMenu.Label>
        {kinds.map(([kind, title, description, Icon]) => <DropdownMenu.Item key={kind} asChild>
          <Link href={`/admin/cotizaciones/nuevo?tipo=${kind}${query ? `&${query}` : ""}`} className="flex gap-3 rounded-btn px-3 py-2.5 outline-none data-highlighted:bg-brand-tint">
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            <span><span className="block font-semibold text-ink">{title}</span><span className="t-small block text-ink-soft">{description}</span></span>
          </Link>
        </DropdownMenu.Item>)}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
