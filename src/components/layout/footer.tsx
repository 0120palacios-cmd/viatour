import Image from "next/image";
import Link from "next/link";
import { Camera, MessagesSquare, Music2 } from "lucide-react";
import { legalLinks, mainLinks, reservationLink, serviceLinks } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { CurrencyToggle } from "./currency-toggle";
import { WhatsAppLink } from "./whatsapp-link";
import whiteLogo from "../../../public/logo-white.png";

export function Footer() {
  // Lucide's installed version has no brand logos; use its outline social symbols.
  const socialLinks = [
    { Icon: MessagesSquare, label: "Facebook", href: siteConfig.social.facebook },
    { Icon: Camera, label: "Instagram", href: siteConfig.social.instagram },
    { Icon: Music2, label: "TikTok", href: siteConfig.social.tiktok },
  ].filter(({ href }) => href.trim().length > 0);

  return (
    <footer id="site-footer" className="bg-ink text-canvas">
      <div className="container-site space-y-12 py-14 sm:py-24">
        <div className="grid gap-12 sm:grid-cols-2 min-[1200px]:grid-cols-3">
          <div className="flex flex-col items-start gap-6">
            <Link href="/" className="inline-block rounded-btn p-4" aria-label="viatour — Inicio">
              <Image src={whiteLogo} alt="viatour" className="h-auto w-32" sizes="128px" />
            </Link>
            {socialLinks.length > 0 && <nav className="flex gap-3" aria-label="Redes sociales">
              {socialLinks.map(({ Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Síganos en ${label}`} className="flex size-12 items-center justify-center rounded-btn bg-surface text-ink-soft transition-colors duration-(--duration-fast) ease-out hover:bg-brand-tint hover:text-brand">
                  <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                </a>
              ))}
            </nav>}
            <WhatsAppLink compact />
            <div><CurrencyToggle /></div>
          </div>
          {[{ title: "Servicios", links: serviceLinks }, { title: "viatour", links: mainLinks }].map(({ title, links }) => (
            <nav key={title} aria-label={title} className="space-y-4">
              <h2 className="t-h3">{title}</h2>
              <ul className="space-y-2">
                {links.map(({ href, label }) => <li key={href}><Link href={href} className="t-body inline-block rounded-btn py-2 transition-colors duration-(--duration-fast) ease-out hover:text-brand-tint hover:underline underline-offset-4">{label}</Link></li>)}
              </ul>
              {title === "viatour" ? <Link href={reservationLink.href} className="t-small inline-flex rounded-btn py-2 text-canvas transition-colors duration-(--duration-fast) ease-out hover:text-brand-tint hover:underline underline-offset-4">{reservationLink.label}</Link> : null}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-small">{siteConfig.tagline}</p>
          <nav aria-label="Legales" className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map(({ href, label }) => <Link key={href} href={href} className="t-small rounded-btn py-2 hover:underline underline-offset-4">{label}</Link>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
