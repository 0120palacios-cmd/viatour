"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export type GalleryImage = { src: string; unoptimized: boolean };

const mainSizes = "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1199px) calc((100vw - 88px) * 2 / 3), 747px";

// One image per view. Mobile: swipe + dots. From 640px: arrows + thumbnail strip.
export function PackageGallery({ images, name, destination }: { images: GalleryImage[]; name: string; destination: string }) {
  const t = useTranslations("packagePage");
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const total = images.length;

  useEffect(() => {
    const node = track.current;
    if (!node || total < 2) return;
    const slides = Array.from(node.children);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
    }, { root: node, threshold: 0.6 });
    slides.forEach(slide => observer.observe(slide));
    return () => observer.disconnect();
  }, [total]);

  function go(index: number) {
    const node = track.current;
    const slide = node?.children[Math.max(0, Math.min(total - 1, index))] as HTMLElement | undefined;
    if (!node || !slide) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({ left: slide.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(active + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(active - 1); }
  }

  const alt = (index: number) => t("galleryAlt", { name, destination, number: index + 1, total });
  const arrow = "absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-btn border border-line bg-canvas text-ink shadow-sm transition-opacity duration-(--duration-fast) ease-out hover:bg-surface disabled:pointer-events-none disabled:opacity-0";

  return <section aria-label={t("galleryLabel", { name })} className="space-y-3">
    <div className="relative">
      <div ref={track} tabIndex={total > 1 ? 0 : undefined} onKeyDown={total > 1 ? onKeyDown : undefined} className="package-gallery-track relative rounded-card bg-surface">
        {images.map((image, index) => <div key={`${image.src}-${index}`} aria-hidden={index !== active} className="relative aspect-[3/2] sm:aspect-video">
          <Image src={image.src} alt={alt(index)} fill preload={index === 0} unoptimized={image.unoptimized} sizes={mainSizes} className="object-cover" />
        </div>)}
      </div>
      {total > 1 && <>
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label={t("galleryPrevious")} className={`${arrow} left-3`}><ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" /></button>
        <button type="button" onClick={() => go(active + 1)} disabled={active === total - 1} aria-label={t("galleryNext")} className={`${arrow} right-3`}><ChevronRight size={24} strokeWidth={1.75} aria-hidden="true" /></button>
      </>}
    </div>
    {total > 1 && <>
      <p className="sr-only" aria-live="polite">{t("galleryPosition", { number: active + 1, total })}</p>
      <div aria-hidden="true" className="flex justify-center gap-2 sm:hidden">{images.map((image, index) => <span key={`${image.src}-dot-${index}`} className={`size-2 rounded-full transition-colors duration-(--duration-fast) ease-out ${index === active ? "bg-brand" : "bg-line"}`} />)}</div>
      <div className="hidden gap-3 overflow-x-auto pb-2 sm:flex">{images.map((image, index) => <button key={`${image.src}-thumb-${index}`} type="button" onClick={() => go(index)} aria-label={t("galleryShow", { number: index + 1, total })} aria-current={index === active ? "true" : undefined} className={`relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-btn border-2 bg-surface transition-opacity duration-(--duration-fast) ease-out ${index === active ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}>
        <Image src={image.src} alt="" fill unoptimized={image.unoptimized} sizes="96px" className="object-cover" />
      </button>)}</div>
    </>}
  </section>;
}
