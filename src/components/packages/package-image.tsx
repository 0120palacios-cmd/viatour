import Image from "next/image";
import { canOptimizeImage } from "@/lib/image-optimization";
import type { Package } from "@/lib/packages";

export function PackageImage({ item, hero = false }: { item: Package; hero?: boolean }) {
  const className = `${hero ? "aspect-video" : "aspect-[4/3]"} relative overflow-hidden rounded-card bg-surface`;
  const sizes = hero
    ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1199px) calc((100vw - 80px) * 2 / 3), 747px"
    : "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px";

  if (!item.imagen_url) {
    return <div role="img" aria-label={`Espacio reservado para una fotografía de ${item.destino}`} className={className} />;
  }

  return (
    <div className={className}>
      <Image
        src={item.imagen_url}
        alt={`Fotografía de ${item.nombre} en ${item.destino}`}
        fill
        preload={hero}
        unoptimized={!canOptimizeImage(item.imagen_url)}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
