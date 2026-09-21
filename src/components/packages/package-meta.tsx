import { Clock3, MapPin, Tag } from "lucide-react";
import type { Package } from "@/lib/packages";

export function PackageMeta({ item }: { item: Package }) {
  return (
    <div className="t-small flex flex-wrap gap-4 text-ink-soft">
      <span className="inline-flex items-center gap-2">
        <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
        {item.destino}
      </span>
      <span className="inline-flex items-center gap-2">
        <Tag size={16} strokeWidth={1.75} aria-hidden="true" />
        Paquete
      </span>
      {item.duracion && <span className="inline-flex items-center gap-2">
        <Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />
        Duración: {item.duracion}
      </span>}
    </div>
  );
}
