"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainLinks } from "@/lib/navigation";
import { CurrencyToggle } from "./currency-toggle";
import { WhatsAppLink } from "./whatsapp-link";
import blackLogo from "../../../public/logo-black.png";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1200px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function navigation(mobile = false) {
    return (
      <nav aria-label="Navegación principal" className={mobile ? "flex flex-col gap-2" : "flex items-center gap-4"}>
        {mainLinks.map(({ href, label }) => {
          const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={`t-small rounded-btn py-3 transition-colors duration-(--duration-fast) ease-out hover:text-brand ${mobile ? "px-4" : ""} ${active ? "text-brand" : "text-ink"}`}>{label}</Link>;
        })}
      </nav>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="container-site flex items-center justify-between gap-6 py-4">
        <Link href="/" className="shrink-0 rounded-btn p-4" aria-label="viatour — Inicio">
          <Image src={blackLogo} alt="viatour" priority className="h-auto w-32" sizes="128px" />
        </Link>
        <div className="hidden items-center gap-6 min-[1200px]:flex">
          {navigation()}
          <WhatsAppLink />
          <CurrencyToggle />
        </div>
        <div className="min-[1200px]:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" aria-label="Abrir menú"><Menu className="text-ink-soft" size={24} strokeWidth={1.75} /></Button></SheetTrigger>
            <SheetContent>
              <div className="container-site flex min-h-full flex-col gap-8 py-6">
                <div className="flex items-center justify-between gap-4">
                  <SheetTitle className="t-h3">viatour</SheetTitle>
                  <SheetClose asChild><Button variant="ghost" aria-label="Cerrar menú"><X className="text-ink-soft" size={24} strokeWidth={1.75} /></Button></SheetClose>
                </div>
                {navigation(true)}
                <div className="flex flex-wrap items-center gap-6 pb-8">
                  <WhatsAppLink onClick={() => setOpen(false)} />
                  <CurrencyToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
