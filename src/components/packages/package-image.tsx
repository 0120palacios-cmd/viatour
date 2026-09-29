import Image from "next/image";
import { useTranslations } from "next-intl";
import { canOptimizeImage } from "@/lib/image-optimization";
import type { Package } from "@/lib/packages";

// Card: 3:2 cover clipped by the card's own rounded corners. Hero: 16:9 rounded panel.
export function PackageImage({ item, hero = false }: { item: Package; hero?: boolean }) {
  const t = useTranslations("home");
  const className = hero ? "relative aspect-video overflow-hidden rounded-card bg-surface" : "relative aspect-[3/2] overflow-hidden bg-surface";
  const sizes = hero
    ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1199px) calc((100vw - 88px) * 2 / 3), 747px"
    : "(max-width: 639px) 300px, (max-width: 1023px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px";

  if (!item.imagen_url) {
    return <div role="img" aria-label={t("photoPlaceholder", { name: item.destino })} className={className} />;
  }

  return (
    <div className={className}>
      <Image
        src={item.imagen_url}
        alt={t("photoAlt", { name: item.destino })}
        fill
        preload={hero}
        unoptimized={!canOptimizeImage(item.imagen_url)}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
