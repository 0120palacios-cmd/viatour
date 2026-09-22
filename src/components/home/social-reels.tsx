"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useCookieConsent } from "@/components/cookie-consent";
import { siteConfig } from "@/lib/site-config";

type Platform = "instagram" | "tiktok";
type EmbedState = "idle" | "loading" | "ready" | "failed";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
    tiktokEmbed?: { lib?: { render?: () => void } };
  }
}

const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

const embedScripts: Record<Platform, string> = {
  instagram: "https://www.instagram.com/embed.js",
  tiktok: "https://www.tiktok.com/embed.js",
};

function profileCards() {
  const profiles = [
    ["Facebook", siteConfig.social.facebook],
    ["Instagram", siteConfig.social.instagram],
    ["TikTok", siteConfig.social.tiktok],
  ] as const;

  return <div className="grid gap-4 sm:grid-cols-3">
    {profiles.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="group flex min-h-28 items-center justify-between gap-4 rounded-card border border-line bg-canvas p-6 shadow-sm transition-shadow duration-(--duration-fast) ease-out hover:shadow-md">
      <span className="t-h3">{label}</span>
      <ArrowUpRight size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />
      <span className="sr-only">Visitar el perfil de viatour en {label}</span>
    </a>)}
  </div>;
}

function loadScript(src: string, id: string, onError: () => void) {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.failed === "true") onError();
    return existing;
  }

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  script.addEventListener("error", () => {
    script.dataset.failed = "true";
    onError();
  }, { once: true });
  document.body.appendChild(script);
  return script;
}

function EmbedCard({ platform, url }: { platform: Platform; url: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<EmbedState>("idle");
  const { canTrack, ready } = useCookieConsent();

  useEffect(() => {
    if (!ready || !canTrack || !cardRef.current) return;
    const card = cardRef.current;
    let started = false;
    let timeout: number | undefined;

    const fail = () => {
      window.clearTimeout(timeout);
      setState("failed");
    };

    const load = () => {
      if (started) return;
      started = true;
      setState("loading");
      const script = loadScript(embedScripts[platform], `social-embed-${platform}`, fail);
      const markReady = () => {
        if (platform === "instagram") window.instgrm?.Embeds.process();
        if (platform === "tiktok") window.tiktokEmbed?.lib?.render?.();
        window.setTimeout(() => {
          if (card.querySelector("iframe")) setState("ready");
        }, 100);
      };

      if (script.dataset.failed === "true") {
        fail();
      } else if (script.dataset.loaded === "true") {
        markReady();
      } else {
        script.addEventListener("load", () => {
          script.dataset.loaded = "true";
          markReady();
        }, { once: true });
      }

      timeout = window.setTimeout(fail, 10000);
    };

    if (!("IntersectionObserver" in window)) {
      load();
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        load();
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(card);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [canTrack, platform, ready]);

  if (!canTrack || state === "failed") {
    const profile = siteConfig.social[platform];
    return <a href={profile} target="_blank" rel="noopener noreferrer" className="flex min-h-72 flex-col justify-between rounded-card border border-line bg-canvas p-6 shadow-sm">
      <div><p className="t-small text-ink-soft">{platformLabels[platform]}</p><h3 className="t-h3 mt-3">Visite nuestro perfil</h3></div>
      <span className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4">Ver publicaciones<ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" /></span>
    </a>;
  }

  return <div ref={cardRef} className="min-h-72 overflow-hidden rounded-card border border-line bg-canvas p-4 shadow-sm" aria-label={`Publicación de viatour en ${platformLabels[platform]}`}>
    {platform === "instagram" ? <blockquote className="instagram-media m-0 w-full" data-instgrm-permalink={url} data-instgrm-version="14" /> : <blockquote className="tiktok-embed m-0 w-full" cite={url} data-video-id={url.match(/\/video\/(\d+)/)?.[1]}><section><a href={url} target="_blank" rel="noopener noreferrer">Ver video en TikTok</a></section></blockquote>}
    {state !== "ready" && <p className="t-small text-ink-soft">Cargando publicación…</p>}
  </div>;
}

export function SocialReels() {
  const posts = [
    ...siteConfig.socialReels.instagram.map(url => ({ platform: "instagram" as const, url })),
    ...siteConfig.socialReels.tiktok.map(url => ({ platform: "tiktok" as const, url })),
  ];

  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="social-reels-title">
    <div className="container-site">
      <div className="mb-8 max-w-2xl space-y-4">
        <h2 id="social-reels-title" className="t-h2">Síganos en redes</h2>
        <p className="t-body-lg text-ink-soft">Conozca lo que compartimos sobre viajes y destinos en nuestras redes.</p>
      </div>
      {posts.length ? <div className="grid gap-6 md:grid-cols-2">{posts.map(post => <EmbedCard key={post.url} {...post} />)}</div> : profileCards()}
    </div>
  </section>;
}
