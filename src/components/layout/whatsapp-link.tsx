"use client";

import { trackEvent } from "@/lib/analytics";
import { MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/navigation";

// iconOnlyMobile: a 48px square below 640px (the accessible name stays in aria-label).
export function WhatsAppLink({ compact = false, iconOnlyMobile = false, onClick, placement }: { placement?: string; compact?: boolean; iconOnlyMobile?: boolean; onClick?: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  return <Button asChild variant="whatsapp" className={iconOnlyMobile ? "max-sm:size-12 max-sm:p-0 max-sm:shadow-md" : undefined}><a href={whatsappHref(locale === "en" ? "en" : "es")} target="_blank" rel="noopener noreferrer" aria-label={t("common.whatsapp")} onClick={event => { const heading = window.location.pathname.replace(/^\/en/, "") === "/" ? "" : document.querySelector("main h1")?.textContent ?? ""; event.currentTarget.href = whatsappHref(locale === "en" ? "en" : "es", heading); trackEvent("whatsapp_click", { placement }); onClick?.(); }}><MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" /><span className={iconOnlyMobile ? "max-sm:sr-only" : undefined}>{compact ? "WhatsApp" : t("common.whatsapp")}</span></a></Button>;
}
