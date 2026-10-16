"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BedDouble, BookOpen, CircleHelp, ClipboardList, ExternalLink, FileText, Gift, Inbox, LayoutDashboard, LogOut, Luggage, MapPin, Menu, MessageSquare, Plane, ReceiptText, Ship, Star, Users, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/app/admin/actions";
import blackLogo from "../../../public/logo-black.png";

type Item = readonly [label: string, href: string, icon: typeof Users];
// Grouped by how the team works: sell (lead → cliente → cotización), operate the trip, keep the
// reusable data, and maintain the public site.
export const adminSections: readonly { title: string | null; items: readonly Item[] }[] = [
  { title: null, items: [["Inicio", "/admin", LayoutDashboard]] },
  { title: "Ventas", items: [["Leads", "/admin/leads", Inbox], ["Clientes", "/admin/clientes", Users], ["Cotizaciones", "/admin/cotizaciones", FileText]] },
  { title: "Operación", items: [["Reservas", "/admin/reservas", ClipboardList], ["Facturación", "/admin/facturacion", ReceiptText], ["Solicitudes", "/admin/tickets", MessageSquare]] },
  { title: "Catálogos", items: [["Hoteles", "/admin/catalogos/hoteles", BedDouble], ["Aerolíneas", "/admin/catalogos/aerolineas", Plane], ["Servicios y navieras", "/admin/catalogos/servicios", Ship]] },
  { title: "Sitio web", items: [["Paquetes", "/admin/paquetes", Luggage], ["Destinos", "/admin/destinos", MapPin], ["Opiniones", "/admin/opiniones", Star], ["Blog", "/admin/blog", BookOpen], ["Preguntas frecuentes", "/admin/faq", CircleHelp], ["Promociones", "/admin/promociones", Gift]] },
];

export function isCurrentSection(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <div className="space-y-6">
    {adminSections.map(group => <div key={group.title ?? "home"}>
      {group.title ? <p className="t-small mb-1 px-3 font-semibold text-ink-soft">{group.title}</p> : null}
      <ul className="space-y-0.5">
        {group.items.map(([label, href, Icon]) => {
          const current = isCurrentSection(pathname, href);
          return <li key={href}><Link href={href} onClick={onNavigate} aria-current={current ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-btn px-3 transition-colors duration-(--duration-fast) ease-out ${current ? "bg-brand-tint font-semibold text-brand-deep" : "text-ink hover:bg-surface"}`}><Icon size={18} strokeWidth={1.75} aria-hidden="true" className={current ? "text-brand" : "text-ink-soft"} />{label}</Link></li>;
        })}
      </ul>
    </div>)}
  </div>;
}

function Account({ email }: { email: string }) {
  return <div className="space-y-1 border-t border-line pt-4">
    <p className="t-small truncate px-3 text-ink-soft" title={email}>{email}</p>
    <a href="/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 rounded-btn px-3 text-ink hover:bg-surface"><ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" className="text-ink-soft" />Ver sitio público</a>
    <form action={signOut}><button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-btn px-3 text-left text-ink hover:bg-surface"><LogOut size={18} strokeWidth={1.75} aria-hidden="true" className="text-ink-soft" />Cerrar sesión</button></form>
  </div>;
}

function Logo() {
  return <Link href="/admin" className="inline-flex min-h-11 items-center gap-2"><Image src={blackLogo} alt="viatour" height={28} className="h-7 w-auto" priority /><span className="t-small rounded-btn bg-surface px-2 py-0.5 font-semibold text-ink-soft">Admin</span></Link>;
}

// Desktop: a fixed sidebar that scrolls on its own. Phones and tablets: a top bar with a menu
// button that opens the same links in a sheet, so every section is two taps away.
export function AdminNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <aside className="hidden lg:block">
      <nav aria-label="Administración" className="sticky top-0 flex h-dvh w-64 flex-col gap-6 overflow-y-auto border-r border-line bg-canvas px-3 py-6">
        <div className="px-3"><Logo /></div>
        <div className="flex-1"><NavLinks /></div>
        <Account email={email} />
      </nav>
    </aside>
    <div className="flex items-center justify-between gap-4 border-b border-line bg-canvas px-4 py-2 lg:hidden">
      <Logo />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex min-h-11 items-center gap-2 rounded-btn border border-line px-3 font-semibold text-ink"><Menu size={20} strokeWidth={1.75} aria-hidden="true" />Menú</SheetTrigger>
        <SheetContent>
          <nav aria-label="Administración" className="flex min-h-full flex-col gap-6 px-4 py-4">
            <div className="flex items-center justify-between"><SheetTitle asChild><p className="t-h3">Administración</p></SheetTitle><SheetClose className="inline-flex size-11 items-center justify-center rounded-btn border border-line" aria-label="Cerrar menú"><X size={20} strokeWidth={1.75} aria-hidden="true" /></SheetClose></div>
            <div className="flex-1"><NavLinks onNavigate={() => setOpen(false)} /></div>
            <Account email={email} />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  </>;
}
