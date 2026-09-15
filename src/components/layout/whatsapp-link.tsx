import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/navigation";

export function WhatsAppLink({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  return (
    <Button asChild variant="whatsapp">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Escríbanos por WhatsApp" onClick={onClick}>
        <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
        {compact ? "WhatsApp" : "Escríbanos por WhatsApp"}
      </a>
    </Button>
  );
}
