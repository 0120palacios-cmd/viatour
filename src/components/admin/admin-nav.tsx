"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Star, Luggage, MapPin, ListChecks, BookOpen, CircleHelp, Users, FileText, ClipboardList, ReceiptText, MessageSquare } from "lucide-react";

const sections = [["Resumen", "/admin", LayoutDashboard], ["Clientes", "/admin/clientes", Users], ["Cotizaciones", "/admin/cotizaciones", FileText], ["Reservas", "/admin/reservas", ClipboardList], ["Facturación", "/admin/facturacion", ReceiptText], ["Solicitudes", "/admin/tickets", MessageSquare], ["Opiniones", "/admin/opiniones", Star], ["Paquetes", "/admin/paquetes", Luggage], ["Destinos", "/admin/destinos", MapPin], ["Leads", "/admin/leads", ListChecks], ["Blog", "/admin/blog", BookOpen], ["FAQ", "/admin/faq", CircleHelp]] as const;

// Phones: one swipeable row (twelve wrapped links would push every page down by a screen).
// From 640px the links wrap as before. The current section is marked for sight and screen readers.
export function AdminNav() {
  const pathname = usePathname();
  const isCurrent = (href: string) => href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
  return <nav aria-label="Administración" className="-mx-4 mb-8 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
    <ul className="chip-row flex gap-2 pb-3 sm:flex-wrap sm:pb-4">
      {sections.map(([label, href, Icon]) => { const current = isCurrent(href); return <li key={href}><Link href={href} aria-current={current ? "page" : undefined} className={`t-small flex min-h-11 items-center gap-2 whitespace-nowrap rounded-btn px-3 transition-colors duration-(--duration-fast) ease-out ${current ? "bg-brand-tint font-semibold text-brand-deep" : "text-brand hover:bg-brand-tint"}`}><Icon size={18} strokeWidth={1.75} aria-hidden="true" />{label}</Link></li>; })}
    </ul>
  </nav>;
}
