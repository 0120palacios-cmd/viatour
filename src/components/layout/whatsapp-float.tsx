"use client";

import { useEffect, useState } from "react";
import { WhatsAppLink } from "./whatsapp-link";

export function WhatsAppFloat() {
  const [footerVisible, setFooterVisible] = useState(true);
  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { rootMargin: "24px" });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // The footer has its own WhatsApp action. Remove this one from tab order when
  // the footer approaches, preventing overlap at any screen size.
  if (footerVisible) return null;
  return <div className="whatsapp-float fixed z-20"><WhatsAppLink placement="floating" compact /></div>;
}
