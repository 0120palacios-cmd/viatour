import { Bus, Compass, LifeBuoy, ShieldCheck, Ship, Sparkles, Ticket } from "lucide-react";
import type { ServiceCatalogKind } from "@/lib/service-catalog";

export const serviceIcons: Record<ServiceCatalogKind, typeof Ship> = { ferry: Ship, traslado: Bus, tour: Compass, actividad: Ticket, seguro: ShieldCheck, asistencia: LifeBuoy, otro: Sparkles };
