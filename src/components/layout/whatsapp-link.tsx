"use client";

import { trackEvent } from "@/lib/analytics";
import { MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/navigation";

export function WhatsAppLink({ compact = false, onClick, placement }: { placement?: string; compact?: boolean; onClick?: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  return <Button asChild variant="whatsapp"><a href={whatsappHref(locale === "en" ? "en" : "es")} target="_blank" rel="noopener noreferrer" aria-label={t("common.whatsapp")} onClick={() => { trackEvent("whatsapp_click", { placement }); onClick?.(); }}><MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />{compact ? "WhatsApp" : t("common.whatsapp")}</a></Button>;
}


