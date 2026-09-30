import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { canOptimizeImage } from "@/lib/image-optimization";
import type { Package } from "@/lib/packages";

// Card: 3:2 cover clipped by the card's own rounded corners. Hero: 16:9 rounded panel.
export function PackageImage({ item, hero = false, preload = false, dense = false }: { item: Package; hero?: boolean; preload?: boolean; dense?: boolean }) {
  const t = useTranslations("home");
  const className = hero ? "relative aspect-video overflow-hidden rounded-card bg-surface" : "relative aspect-[3/2] overflow-hidden bg-surface";
  const sizes = hero
    ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1199px) calc((100vw - 88px) * 2 / 3), 747px"
    : dense ? "(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px" : "(max-width: 639px) 300px, (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px";

  if (!item.imagen_url) {
    // Tonal placeholder until a real photo exists: reads as intentional, not as a failed image.
    return <div role="img" aria-label={t("photoPlaceholder", { name: item.destino })} className={`${className} flex flex-col items-center justify-center gap-2 bg-brand-tint text-brand`}><MapPin size={28} strokeWidth={1.5} aria-hidden="true" /><span className="t-small px-4 text-center font-semibold text-brand-deep">{item.destino}</span></div>;
  }

  return (
    <div className={className}>
      <Image
        src={item.imagen_url}
        alt={t("photoAlt", { name: item.destino })}
        fill
        preload={hero || preload}
        unoptimized={!canOptimizeImage(item.imagen_url)}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
