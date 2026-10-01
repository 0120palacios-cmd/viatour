"use client";

import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

// Families decide trips together on WhatsApp: the native share sheet on phones, a WhatsApp
// share link everywhere else.
export function ShareButton({ title, tone = "light" }: { title: string; tone?: "light" | "dark" }) {
  const t = useTranslations("common");
  async function share() {
    const url = window.location.href.split("#")[0].split("?")[0];
    const text = t("shareText", { title });
    trackEvent("share", { placement: "detail" });
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title, text, url }); return; }
      catch (error) { if ((error as DOMException)?.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
  }
  // Phones: a 48px icon button so it sits beside the primary action instead of wrapping under it.
  // On a photo hero ("dark") it keeps the ghost shape in white so it stays secondary to the quote action.
  return <Button type="button" variant="ghost" onClick={share} aria-label={t("sharePage")} className={`max-sm:size-12 max-sm:p-0 ${tone === "dark" ? "border-canvas/40 text-canvas hover:bg-canvas/10" : ""}`}><Share2 size={18} strokeWidth={1.75} className={tone === "dark" ? "text-canvas" : "text-ink-soft"} aria-hidden="true" /><span className="max-sm:sr-only">{t("sharePage")}</span></Button>;
}
