"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { heroImages } from "@/lib/hero-images";

// Inline glyphs keep this component free of icon-library dependencies (its unit test runs it in isolation).
function PauseGlyph() { return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg>; }
function PlayGlyph() { return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>; }

export function HeroBackdrop({ children, pauseLabel, resumeLabel = pauseLabel }: { children: ReactNode; pauseLabel: string; resumeLabel?: string }) {
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
  const hasPhoto = heroImages.some((_, index) => !failed.includes(index));
  return <section aria-labelledby="hero-title" data-photo={hasPhoto} className="group/hero relative isolate overflow-hidden bg-surface data-[photo=true]:bg-ink"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-surface group-data-[photo=true]/hero:bg-ink">
      {/* The first photo is the LCP element: it is visible in the server HTML (no fade gated on hydration),
          and the other slides mount only once it has loaded (or failed), so they never compete with it for bandwidth. */}
      {heroImages.map((photo, index) => !failed.includes(index) && (index === 0 || (!reducedMotion && (loaded.includes(0) || failed.includes(0)))) && <Image
        key={`${index}-${photo.src}`} src={photo.src} alt={photo.alt} fill sizes="100vw"
        // Next.js 16 replaces the deprecated priority prop with preload.
        preload={index === 0}
        aria-hidden={index !== visible}
        className={`object-cover object-[center_38%] sm:object-center transition-opacity duration-(--duration-reveal) ease-out motion-reduce:transition-none ${index === visible && (index === 0 || loaded.includes(index)) ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(previous => previous.includes(index) ? previous : [...previous, index])}
        onError={() => setFailed(previous => previous.includes(index) ? previous : [...previous, index])}
      />)}
      {/* Legibility only where text sits on the photo: darker behind the copy, lighter elsewhere. */}
      {hasPhoto && <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/70 lg:bg-gradient-to-r lg:from-ink/75 lg:via-ink/45 lg:to-ink/20" />}
    </div>
    {children}
    {loaded.filter(index => !failed.includes(index)).length > 1 && !reducedMotion && <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 lg:bottom-6">
      <button type="button" aria-pressed={paused} aria-label={paused ? resumeLabel : pauseLabel} title={paused ? resumeLabel : pauseLabel} onClick={() => setPaused(value => !value)}
        className="flex size-11 items-center justify-center rounded-btn border border-canvas/40 bg-ink/50 text-canvas transition-colors duration-(--duration-fast) ease-out hover:bg-ink/80 focus-visible:outline-brand-tint">
        {paused ? <PlayGlyph /> : <PauseGlyph />}
      </button>
    </div>}
  </section>;
}
