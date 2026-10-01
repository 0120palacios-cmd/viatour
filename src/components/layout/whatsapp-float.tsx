"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WhatsAppLink } from "./whatsapp-link";

export function WhatsAppFloat() {
  const t = useTranslations("common");
  const [footerVisible, setFooterVisible] = useState(true);
  // Reading down the page, the button steps aside so it never sits on top of copy;
  // any upward scroll (the "looking for something" gesture) brings it straight back.
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { rootMargin: "24px" });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let last = window.scrollY, frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY, delta = y - last;
        if (Math.abs(delta) < 12) return;
        setTucked(delta > 0 && y > 320);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  // The footer has its own WhatsApp action. Remove this one from tab order when
  // the footer approaches, preventing overlap at any screen size.
  if (footerVisible) return null;
  // A labelled landmark, so the floating action is not loose content outside the page regions.
  return <aside aria-label={t("whatsapp")} inert={tucked} data-tucked={tucked || undefined} className="whatsapp-float fixed z-20"><WhatsAppLink placement="floating" compact iconOnlyMobile /></aside>;
}
