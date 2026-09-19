"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { heroImages } from "@/lib/hero-images";

export function HeroBackdrop({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const [loaded, setLoaded] = useState<number[]>([]);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || hovered || focused || paused || heroImages.length < 2) return;
    const timer = window.setInterval(() => setActive(current => (current + 1) % heroImages.length), 5500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, hovered, focused, paused]);

  const visible = reducedMotion ? 0 : active;
  return <section aria-labelledby="hero-title" data-photo={heroImages.length > 0} className="group/hero relative isolate overflow-hidden bg-ink py-14 sm:py-24"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-ink via-brand-deep to-brand">
      {heroImages.map((photo, index) => !failed.includes(index) && (!reducedMotion || index === 0) && <Image
        key={`${index}-${photo.src}`} src={photo.src} alt={photo.alt} fill sizes="100vw"
        preload={index === 0}
        aria-hidden={index !== visible}
        className={`object-cover transition-opacity duration-(--duration-reveal) ease-out motion-reduce:transition-none ${index === visible && loaded.includes(index) ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(previous => previous.includes(index) ? previous : [...previous, index])}
        onError={() => setFailed(previous => previous.includes(index) ? previous : [...previous, index])}
      />)}
    </div>
    {children}
    {heroImages.length > 1 && !reducedMotion && <div className="container-site relative mt-6">
      {/* Functional accessibility copy pending approval. */}
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}
        className="t-small min-h-12 rounded-btn border border-canvas/50 bg-ink px-4 py-3 text-canvas focus-visible:outline-brand-tint">
        Pausar imágenes
      </button>
    </div>}
  </section>;
}
