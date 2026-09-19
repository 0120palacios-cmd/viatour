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
    const available = heroImages.map((_, index) => index).filter(index => loaded.includes(index) && !failed.includes(index));
    if (reducedMotion || hovered || focused || paused || available.length < 2) return;
    const timer = window.setInterval(() => setActive(current => {
      const next = available.find(index => index > current);
      return next ?? available[0];
    }), 5500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, hovered, focused, paused, loaded, failed]);

  const visible = reducedMotion ? 0 : active;
  return <section aria-labelledby="hero-title" data-photo={heroImages.length > 0} className="group/hero relative isolate overflow-hidden bg-ink py-14 sm:py-24"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-ink via-brand-deep to-brand">
      {heroImages.map((photo, index) => !failed.includes(index) && (!reducedMotion || index === 0) && <Image
        key={`${index}-${photo.src}`} src={photo.src} alt={photo.alt} fill sizes="100vw"
        // Next.js 16 replaces the deprecated priority prop with preload.
        preload={index === 0}
        aria-hidden={index !== visible}
        className={`object-cover transition-opacity duration-(--duration-reveal) ease-out motion-reduce:transition-none ${index === visible && loaded.includes(index) ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(previous => previous.includes(index) ? previous : [...previous, index])}
        onError={() => setFailed(previous => previous.includes(index) ? previous : [...previous, index])}
      />)}
    </div>
    {children}
    {loaded.filter(index => !failed.includes(index)).length > 1 && !reducedMotion && <div className="container-site relative mt-6">
      {/* Functional accessibility copy pending approval. */}
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}
        className="t-small min-h-12 rounded-btn border border-canvas/50 bg-ink px-4 py-3 text-canvas focus-visible:outline-brand-tint">
        Pausar imágenes
      </button>
    </div>}
  </section>;
}
