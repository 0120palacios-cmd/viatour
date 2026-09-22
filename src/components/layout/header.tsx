"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainLinks, reservationLink, serviceLinks } from "@/lib/navigation";
import { localizedPath } from "@/i18n/config";
import { WhatsAppLink } from "./whatsapp-link";
import blackLogo from "../../../public/logo-black.png";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  function closeNavigation() { setOpen(false); setServicesOpen(false); }
  function navigation(mobile = false) {
    return <nav aria-label={t("header.menuLabel")} className={mobile ? "flex flex-col gap-2" : "flex items-center gap-2"}>
      {mainLinks.map(({ href, key }) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} onClick={closeNavigation} className={`t-small min-h-12 rounded-btn py-3 transition-colors duration-(--duration-fast) ease-out hover:text-brand ${mobile ? "w-full px-4" : "px-2"} ${isActive(pathname, href) ? "text-brand" : "text-ink"}`}>{t(`common.${key}`)}</Link>)}
      <div className="relative">
        <button type="button" aria-expanded={servicesOpen} aria-haspopup="menu" onClick={() => setServicesOpen(value => !value)} className={`t-small inline-flex min-h-12 items-center gap-1 rounded-btn px-2 py-3 text-ink transition-colors duration-(--duration-fast) ease-out hover:text-brand ${serviceLinks.some(item => isActive(pathname, item.href)) ? "text-brand" : ""}`}>
          {t("header.servicesLabel")}<ChevronDown size={16} strokeWidth={1.75} className={servicesOpen ? "rotate-180" : ""} aria-hidden="true" />
        </button>
        {servicesOpen && <div role="menu" aria-label={t("header.servicesLabel")} className={`${mobile ? "static ml-4 border-l border-line pl-4" : "absolute right-0 top-full z-40 mt-2 min-w-56 rounded-card border border-line bg-canvas p-2 shadow-md"}`}>
          {serviceLinks.map(({ href, key }) => <Link key={href} href={href} role="menuitem" aria-current={isActive(pathname, href) ? "page" : undefined} onClick={closeNavigation} className={`t-small flex min-h-12 items-center rounded-btn px-4 py-3 text-ink transition-colors duration-(--duration-fast) ease-out hover:bg-surface hover:text-brand ${isActive(pathname, href) ? "text-brand" : ""}`}>{t(`common.${key}`)}</Link>)}
        </div>}
      </div>
      <Link href={reservationLink.href} aria-current={isActive(pathname, reservationLink.href) ? "page" : undefined} onClick={closeNavigation} className={`t-small min-h-12 rounded-btn py-3 transition-colors duration-(--duration-fast) ease-out hover:text-brand ${mobile ? "w-full px-4" : "px-2"} ${isActive(pathname, reservationLink.href) ? "text-brand" : "text-ink-soft"}`}>{t(`common.${reservationLink.key}`)}</Link>
    </nav>;
  }

  return <header className="sticky top-0 z-30 border-b border-line bg-canvas">
    <div className="container-site flex items-center justify-between gap-4 py-3">
      <Link href="/" className="shrink-0 rounded-btn p-2" aria-label={t("header.homeLabel")}><Image src={blackLogo} alt="viatour" priority className="h-auto w-32" sizes="128px" /></Link>
      <div className="hidden items-center gap-4 min-[1280px]:flex">{navigation()}<WhatsAppLink compact placement="header" /><LanguageSwitcher pathname={pathname} locale={locale} /></div>
      <div className="min-[1280px]:hidden"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" aria-label={t("common.openMenu")}><Menu className="text-ink-soft" size={24} strokeWidth={1.75} /></Button></SheetTrigger><SheetContent><div className="container-site flex min-h-full flex-col gap-8 py-6"><div className="flex items-center justify-between gap-4"><SheetTitle className="t-h3">viatour</SheetTitle><SheetClose asChild><Button variant="ghost" aria-label={t("common.close")}><X className="text-ink-soft" size={24} strokeWidth={1.75} /></Button></SheetClose></div>{navigation(true)}<div className="mt-auto space-y-6 border-t border-line pt-6"><LanguageSwitcher pathname={pathname} locale={locale} /><WhatsAppLink compact placement="mobile-menu" onClick={() => setOpen(false)} /></div></div></SheetContent></Sheet></div>
    </div>
  </header>;
}

function LanguageSwitcher({ pathname, locale }: { pathname: string; locale: string }) {
  const t = useTranslations();
  return <div className="flex items-center gap-1" aria-label={t("common.language")}><a href={localizedPath(pathname, "es")} aria-current={locale === "es" ? "page" : undefined} className={`t-small rounded-btn px-2 py-2 ${locale === "es" ? "font-semibold text-brand" : "text-ink-soft"}`}>ES</a><span className="text-line" aria-hidden="true">/</span><a href={localizedPath(pathname, "en")} aria-current={locale === "en" ? "page" : undefined} className={`t-small rounded-btn px-2 py-2 ${locale === "en" ? "font-semibold text-brand" : "text-ink-soft"}`}>EN</a></div>;
}
