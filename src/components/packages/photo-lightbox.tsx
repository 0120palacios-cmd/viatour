"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

export type LightboxImage = { src: string; alt: string; unoptimized?: boolean };

type Props = { images: LightboxImage[]; index: number | null; onClose: () => void; label: string };

// Full-screen viewer on the native <dialog>: focus stays inside, Escape closes it and the page behind is
// inert. Arrow keys and swipes move between photos; the caption repeats the alt text. Each opening mounts a
// fresh viewer, so it starts on the photo that was tapped.
export function PhotoLightbox(props: Props) {
  return <Viewer key={props.index ?? "closed"} {...props} />;
}

function Viewer({ images, index, onClose, label }: Props) {
  const t = useTranslations("packagePage");
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<number | null>(null);
  const [current, setCurrent] = useState(index ?? 0);
  const total = images.length;

  useEffect(() => {
    const node = dialog.current;
    if (node && index !== null && !node.open) node.showModal();
  }, [index]);

  const go = (next: number) => setCurrent(Math.max(0, Math.min(total - 1, next)));
  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(current + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(current - 1); }
  }
  const onTouchStart = (event: TouchEvent) => { touch.current = event.touches[0]?.clientX ?? null; };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current, end = event.changedTouches[0]?.clientX;
    touch.current = null;
    if (start == null || end == null || Math.abs(end - start) < 40) return;
    go(current + (end < start ? 1 : -1));
  };
  const image = images[current];
  const control = "inline-flex size-11 items-center justify-center rounded-btn border border-canvas/30 bg-ink/60 text-canvas transition-colors duration-(--duration-fast) ease-out hover:bg-ink disabled:pointer-events-none disabled:opacity-0";

  return <dialog ref={dialog} aria-label={label} onClose={onClose} onKeyDown={onKeyDown} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-canvas backdrop:bg-ink/80">
    {index !== null && image && <div className="flex h-full flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="t-small text-canvas/80" aria-live="polite">{t("galleryPosition", { number: current + 1, total })}</p>
        <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label={t("viewerClose")} className={control}><X size={22} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>
      <div className="relative min-h-0 flex-1">
        <Image key={image.src} src={image.src} alt={image.alt} fill unoptimized={image.unoptimized} sizes="100vw" className="object-contain" />
        {total > 1 && <>
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label={t("galleryPrevious")} className={`${control} absolute left-3 top-1/2 -translate-y-1/2`}><ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" /></button>
          <button type="button" onClick={() => go(current + 1)} disabled={current === total - 1} aria-label={t("galleryNext")} className={`${control} absolute right-3 top-1/2 -translate-y-1/2`}><ChevronRight size={24} strokeWidth={1.75} aria-hidden="true" /></button>
        </>}
      </div>
      <p className="t-small px-4 py-4 text-center text-canvas/80">{image.alt}</p>
    </div>}
  </dialog>;
}
