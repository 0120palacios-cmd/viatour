"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainLinks, reservationLink, serviceLinks } from "@/lib/navigation";
import { WhatsAppLink } from "./whatsapp-link";
import blackLogo from "../../../public/logo-black.png";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(() => serviceLinks.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)));
  const servicesMenuId = useId();
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const servicesTriggerRef = useRef<HTMLButtonElement>(null);
  const serviceIsActive = serviceLinks.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const closeWhenOutside = (event: PointerEvent | FocusEvent) => {
      if (!servicesMenuRef.current?.contains(event.target as Node)) setServicesOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && servicesOpen) {
        setServicesOpen(false);
        servicesTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [servicesOpen]);

  function closeNavigation() {
    setOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  }

  function focusServiceItem(index: number) {
    const items = servicesMenuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
    if (!items?.length) return;
    items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
  }

  function handleServicesTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setServicesOpen(true);
      window.requestAnimationFrame(() => focusServiceItem(event.key === "ArrowDown" ? 0 : serviceLinks.length - 1));
    }
  }

  function handleServicesMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(servicesMenuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusServiceItem(current + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusServiceItem(event.key === "Home" ? 0 : items.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setServicesOpen(false);
      servicesTriggerRef.current?.focus();
    }
  }

  function navigation(mobile = false) {
    return (
      <nav aria-label="Navegación principal" className={mobile ? "flex flex-col gap-2" : "flex items-center gap-2"}>
        {mainLinks.map(({ href, label }) => {
          const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={closeNavigation} className={`t-small min-h-12 rounded-btn py-3 transition-colors duration-(--duration-fast) ease-out hover:text-brand ${mobile ? "w-full px-4" : "px-2"} ${active ? "text-brand" : "text-ink"}`}>{label}</Link>;
        })}
        {mobile ? <div className="space-y-2">
          <button type="button" aria-expanded={mobileServicesOpen} aria-controls={`${servicesMenuId}-mobile`} onClick={() => setMobileServicesOpen(value => !value)} className={`t-small flex min-h-12 w-full items-center justify-between gap-2 rounded-btn px-4 py-3 text-left transition-colors duration-(--duration-fast) ease-out hover:text-brand ${serviceIsActive ? "text-brand" : "text-ink"}`}>
            Servicios<ChevronDown size={18} strokeWidth={1.75} className={`shrink-0 transition-transform duration-(--duration-fast) ${mobileServicesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {mobileServicesOpen && <div id={`${servicesMenuId}-mobile`} className="ml-4 border-l border-line pl-4">
            {serviceLinks.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={closeNavigation} className={`t-small flex min-h-12 items-center rounded-btn px-4 py-3 text-ink transition-colors duration-(--duration-fast) ease-out hover:text-brand ${active ? "text-brand" : ""}`}>{label}</Link>;
            })}
          </div>}
        </div> : <div ref={servicesMenuRef} className="relative">
          <button ref={servicesTriggerRef} type="button" aria-expanded={servicesOpen} aria-controls={servicesMenuId} aria-haspopup="menu" onClick={() => setServicesOpen(value => !value)} onKeyDown={handleServicesTriggerKeyDown} className={`t-small inline-flex min-h-12 items-center gap-1 rounded-btn px-2 py-3 text-ink transition-colors duration-(--duration-fast) ease-out hover:text-brand ${serviceIsActive ? "text-brand" : ""}`}>
            Servicios<ChevronDown size={16} strokeWidth={1.75} className={`transition-transform duration-(--duration-fast) ${servicesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {servicesOpen && <div id={servicesMenuId} role="menu" aria-label="Servicios" onKeyDown={handleServicesMenuKeyDown} className="absolute right-0 top-full z-40 mt-2 min-w-56 rounded-card border border-line bg-canvas p-2 shadow-md">
            {serviceLinks.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} role="menuitem" aria-current={active ? "page" : undefined} onClick={closeNavigation} className={`t-small flex min-h-12 items-center rounded-btn px-4 py-3 text-ink transition-colors duration-(--duration-fast) ease-out hover:bg-surface hover:text-brand ${active ? "text-brand" : ""}`}>{label}</Link>;
            })}
          </div>}
        </div>}
        <Link href={reservationLink.href} aria-current={pathname === reservationLink.href ? "page" : undefined} onClick={closeNavigation} className={`t-small min-h-12 rounded-btn py-3 transition-colors duration-(--duration-fast) ease-out hover:text-brand ${mobile ? "w-full px-4" : "px-2"} ${pathname === reservationLink.href ? "text-brand" : "text-ink-soft"}`}>{reservationLink.label}</Link>
      </nav>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="container-site flex items-center justify-between gap-4 py-3">
        <Link href="/" className="shrink-0 rounded-btn p-2" aria-label="viatour — Inicio">
          <Image src={blackLogo} alt="viatour" priority className="h-auto w-32" sizes="128px" />
        </Link>
        <div className="hidden items-center gap-4 min-[1280px]:flex">
          {navigation()}
          <WhatsAppLink compact placement="header" />
        </div>
        <div className="min-[1280px]:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" aria-label="Abrir menú"><Menu className="text-ink-soft" size={24} strokeWidth={1.75} /></Button></SheetTrigger>
            <SheetContent>
              <div className="container-site flex min-h-full flex-col gap-8 py-6">
                <div className="flex items-center justify-between gap-4">
                  <SheetTitle className="t-h3">viatour</SheetTitle>
                  <SheetClose asChild><Button variant="ghost" aria-label="Cerrar menú"><X className="text-ink-soft" size={24} strokeWidth={1.75} /></Button></SheetClose>
                </div>
                {navigation(true)}
                <div className="mt-auto border-t border-line pt-6">
                  <WhatsAppLink compact placement="mobile-menu" onClick={() => setOpen(false)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
