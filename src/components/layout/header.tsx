"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Compass, Hotel, Menu, Plane, Sparkles, TicketCheck, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { headerLinks, headerSecondaryLinks, headerServiceLinks, reservationLink } from "@/lib/navigation";
import { localizedPath } from "@/i18n/config";
import { WhatsAppLink } from "./whatsapp-link";
import blackLogo from "../../../public/logo-black.png";

const serviceIcons: Record<(typeof headerServiceLinks)[number]["key"], LucideIcon> = { flights: Plane, hotels: Hotel, customTrip: Compass, discover: Sparkles };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const linkBase = "t-small inline-flex min-h-12 items-center whitespace-nowrap rounded-btn px-3 transition-colors duration-(--duration-fast) ease-out hover:bg-surface hover:text-brand";

export function Header() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const servicesId = useId();
  const servicesActive = headerServiceLinks.some(item => isActive(pathname, item.href));

  // The services disclosure closes when a link is chosen, on Escape and on any click outside it.
  useEffect(() => {
    if (!servicesOpen) return;
    const onPointer = (event: PointerEvent) => { if (!servicesRef.current?.contains(event.target as Node)) setServicesOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setServicesOpen(false); servicesRef.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [servicesOpen]);

  const navLink = (href: string, key: string) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={`${linkBase} ${isActive(pathname, href) ? "text-brand" : "text-ink"}`}>{t(`common.${key}`)}</Link>;

  return <header className="sticky top-0 z-30 border-b border-line bg-canvas">
    <a href="#contenido" className="t-small sr-only rounded-btn bg-brand px-4 py-3 text-canvas focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50">{t("ux.skipToContent")}</a>
    <div className="container-site flex min-h-16 items-center justify-between gap-4 py-2 sm:min-h-20">
      <Link href="/" className="shrink-0 rounded-btn p-1" aria-label={t("header.homeLabel")}><Image src={blackLogo} alt="viatour" className="h-auto w-28 sm:w-32" sizes="128px" preload /></Link>

      <nav aria-label={t("header.menuLabel")} className="hidden flex-1 items-center justify-center gap-1 min-[1280px]:flex">
        {headerLinks.map(({ href, key }) => navLink(href, key))}
        <div ref={servicesRef} className="relative">
          <button type="button" aria-expanded={servicesOpen} aria-controls={servicesId} onClick={() => setServicesOpen(value => !value)} className={`${linkBase} gap-1 ${servicesActive ? "text-brand" : "text-ink"}`}>
            {t("header.servicesLabel")}<ChevronDown size={16} strokeWidth={1.75} className={`transition-transform duration-(--duration-fast) ${servicesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          <div id={servicesId} hidden={!servicesOpen} className="absolute left-1/2 top-full z-40 mt-2 w-[22rem] -translate-x-1/2 rounded-card border border-line bg-canvas p-2 shadow-md">
            <ul>{headerServiceLinks.map(({ href, key, body }) => { const Icon = serviceIcons[key]; return <li key={href}><Link href={href} aria-current={isActive(pathname, href) ? "page" : undefined} onClick={() => setServicesOpen(false)} className="group flex items-start gap-3 rounded-btn p-3 transition-colors duration-(--duration-fast) ease-out hover:bg-surface">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
              <span className="min-w-0"><span className={`t-small block font-semibold group-hover:text-brand ${isActive(pathname, href) ? "text-brand" : "text-ink"}`}>{t(`common.${key}`)}</span><span className="t-small block font-normal text-ink-soft">{t(body)}</span></span>
            </Link></li>; })}</ul>
          </div>
        </div>
        {headerSecondaryLinks.map(({ href, key }) => navLink(href, key))}
      </nav>

      <div className="flex items-center gap-2">
        <Link href={reservationLink.href} aria-current={isActive(pathname, reservationLink.href) ? "page" : undefined} className={`${linkBase.replace("inline-flex ", "")} hidden gap-2 min-[1280px]:inline-flex ${isActive(pathname, reservationLink.href) ? "text-brand" : "text-ink-soft"}`}><TicketCheck size={18} strokeWidth={1.75} aria-hidden="true" />{t(`common.${reservationLink.key}`)}</Link>
        <div className="hidden min-[1280px]:block"><LanguageSwitcher pathname={pathname} locale={locale} /></div>
        <div className="hidden sm:block"><WhatsAppLink compact placement="header" /></div>
        <div className="min-[1280px]:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" className="gap-2 px-3" aria-label={t("common.openMenu")}><Menu className="text-ink" size={22} strokeWidth={1.75} aria-hidden="true" /><span className="t-small max-sm:sr-only">{t("ux.menu")}</span></Button></SheetTrigger>
            <SheetContent>
              <div className="container-site flex min-h-full flex-col gap-6 py-4">
                <div className="flex items-center justify-between gap-4"><SheetTitle asChild><span><Image src={blackLogo} alt="viatour" className="h-auto w-28" sizes="112px" /></span></SheetTitle><SheetClose asChild><Button variant="ghost" className="px-3" aria-label={t("common.close")}><X className="text-ink" size={22} strokeWidth={1.75} aria-hidden="true" /></Button></SheetClose></div>
                <WhatsAppLink placement="mobile-menu" onClick={() => setOpen(false)} block />
                <nav aria-label={t("header.menuLabel")} className="space-y-6">
                  <ul className="divide-y divide-line border-y border-line">
                    {[...headerLinks, ...headerSecondaryLinks].map(({ href, key }) => <li key={href}><Link href={href} onClick={() => setOpen(false)} aria-current={isActive(pathname, href) ? "page" : undefined} className={`t-h3 flex min-h-14 items-center justify-between py-2 ${isActive(pathname, href) ? "text-brand" : "text-ink"}`}>{t(`common.${key}`)}</Link></li>)}
                  </ul>
                  <div className="space-y-2">
                    <p className="t-small text-ink-soft">{t("header.servicesLabel")}</p>
                    <ul className="grid grid-cols-2 gap-2">{headerServiceLinks.map(({ href, key }) => { const Icon = serviceIcons[key]; return <li key={href}><Link href={href} onClick={() => setOpen(false)} aria-current={isActive(pathname, href) ? "page" : undefined} className={`t-small flex min-h-14 items-center gap-2 rounded-btn border px-3 py-2 ${isActive(pathname, href) ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink"}`}><Icon size={18} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{t(`common.${key}`)}</Link></li>; })}</ul>
                  </div>
                </nav>
                <div className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-4">
                  <Link href={reservationLink.href} onClick={() => setOpen(false)} className="t-small inline-flex min-h-12 items-center gap-2 text-ink"><TicketCheck size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />{t(`common.${reservationLink.key}`)}</Link>
                  <LanguageSwitcher pathname={pathname} locale={locale} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  </header>;
}

function LanguageSwitcher({ pathname, locale }: { pathname: string; locale: string }) {
  const t = useTranslations();
  return <div role="group" className="flex items-center rounded-btn border border-line p-1" aria-label={t("common.language")}>
    {(["es", "en"] as const).map(code => <a key={code} href={localizedPath(pathname, code)} lang={code} hrefLang={code} aria-current={locale === code ? "page" : undefined} aria-label={t(code === "es" ? "common.spanish" : "common.english")} className={`t-small inline-flex min-h-10 min-w-10 items-center justify-center rounded-btn px-2 transition-colors duration-(--duration-fast) ease-out ${locale === code ? "bg-surface font-semibold text-ink" : "text-ink-soft hover:text-brand"}`}>{code.toUpperCase()}</a>)}
  </div>;
}
