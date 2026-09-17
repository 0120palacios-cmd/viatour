"use client";
import { trackEvent } from "@/lib/analytics";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/navigation";

export function WhatsAppLink({ compact = false, onClick, placement }: { placement?: string; compact?: boolean; onClick?: () => void }) {
  return (
    <Button asChild variant="whatsapp">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Escríbanos por WhatsApp" onClick={() => { trackEvent("whatsapp_click", { placement }); onClick?.(); }}>
        <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
        {compact ? "WhatsApp" : "Escríbanos por WhatsApp"}
      </a>
    </Button>
  );
}
