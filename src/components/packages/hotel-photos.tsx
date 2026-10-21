"use client";

import Image from "next/image";
import { useState } from "react";
import { BedDouble, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { PhotoLightbox } from "@/components/packages/photo-lightbox";
import type { PhotoRef } from "@/lib/package-sheet";

const sizes = "(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), 360px";

// A hotel card's cover photo; a tap opens all of the hotel's photos full screen. Without authorized photos
// it shows a tonal placeholder with the hotel's name rather than an image of somewhere else.
export function HotelPhotos({ name, photos }: { name: string; photos: PhotoRef[] }) {
  const t = useTranslations("packagePage");
  const [viewer, setViewer] = useState<number | null>(null);
  const cover = photos[0];
  if (!cover) return <div role="img" aria-label={t("hotelNoPhoto", { name })} className="flex aspect-[5/2] flex-col items-center justify-center gap-2 bg-brand-tint text-brand md:aspect-[3/2]"><BedDouble size={28} strokeWidth={1.5} aria-hidden="true" /><span className="t-small px-4 text-center font-semibold text-brand-deep">{name}</span></div>;
  return <div className="relative aspect-[3/2] bg-surface">
    <button type="button" onClick={() => setViewer(0)} aria-label={t("hotelPhotos", { name, count: photos.length })} className="absolute inset-0 block">
      <Image src={cover.archivo} alt={cover.alt} fill sizes={sizes} className="object-cover" />
    </button>
    {photos.length > 1 && <span aria-hidden="true" className="t-small pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-btn bg-canvas px-3 py-1 text-ink shadow-sm"><Images size={16} strokeWidth={1.75} className="text-brand" />{photos.length}</span>}
    <PhotoLightbox images={photos.map(photo => ({ src: photo.archivo, alt: photo.alt }))} index={viewer} onClose={() => setViewer(null)} label={t("hotelPhotosLabel", { name })} />
  </div>;
}
