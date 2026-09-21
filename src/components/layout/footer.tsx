import Image from "next/image";
import Link from "next/link";
import { legalLinks, mainLinks, reservationLink, serviceLinks } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { CurrencyToggle } from "./currency-toggle";
import { Newsletter } from "./newsletter";
import { WhatsAppLink } from "./whatsapp-link";
import whiteLogo from "../../../public/logo-white.png";

function FacebookGlyph() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" /></svg>;
}

function InstagramGlyph() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.75-3a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" clipRule="evenodd" /></svg>;
}

function TikTokGlyph() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31 0 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.6 4.24 1.76v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.65 3.22-5.99 3.26-1.47.08-2.93-.32-4.1-1.12-1.94-1.33-3.2-3.58-3.23-5.94-.02-.5-.03-1.01-.01-1.5.21-2.14 1.23-4.17 2.99-5.51 1.53-1.21 3.56-1.76 5.5-1.49.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 3.14 1.12.11 2.27-.31 3.02-1.14.6-.68.92-1.57.9-2.48.04-4.45.03-8.9.03-13.35Z" /></svg>;
}

const socialLinks = [
  { Icon: FacebookGlyph, label: "Facebook de viatour", href: siteConfig.social.facebook },
  { Icon: InstagramGlyph, label: "Instagram de viatour", href: siteConfig.social.instagram },
  { Icon: TikTokGlyph, label: "TikTok de viatour", href: siteConfig.social.tiktok },
].filter(({ href }) => href.trim().length > 0);

export function Footer() {
  return (
    <footer id="site-footer" className="bg-ink text-canvas">
      <div className="container-site space-y-8 py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(2,minmax(0,1fr))_1.5fr]">
          <div className="flex flex-col items-start gap-5">
            <Link href="/" className="inline-block rounded-btn p-2" aria-label="viatour — Inicio">
              <Image src={whiteLogo} alt="viatour" className="h-auto w-32" sizes="128px" />
            </Link>
            <p className="t-small text-canvas/80">{siteConfig.tagline}</p>
            {socialLinks.length > 0 && <nav className="flex gap-2" aria-label="Redes sociales">
              {socialLinks.map(({ Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex size-12 items-center justify-center rounded-btn border border-canvas/30 text-canvas transition-colors duration-(--duration-fast) ease-out hover:bg-canvas hover:text-ink">
                  <Icon />
                </a>
              ))}
            </nav>}
            <WhatsAppLink compact placement="footer" />
            <div className="space-y-2">
              <p className="t-small text-canvas/80">Moneda</p>
              <CurrencyToggle />
            </div>
          </div>
          {[{ title: "Servicios", links: serviceLinks }, { title: "viatour", links: mainLinks }].map(({ title, links }) => (
            <nav key={title} aria-label={title} className="space-y-3">
              <h2 className="t-h3">{title}</h2>
              <ul className="space-y-1">
                {links.map(({ href, label }) => <li key={href}><Link href={href} className="t-body inline-flex min-h-12 items-center rounded-btn py-2 transition-colors duration-(--duration-fast) ease-out hover:text-brand-tint hover:underline underline-offset-4">{label}</Link></li>)}
              </ul>
              {title === "viatour" ? <Link href={reservationLink.href} className="t-small inline-flex min-h-12 items-center rounded-btn py-2 text-canvas transition-colors duration-(--duration-fast) ease-out hover:text-brand-tint hover:underline underline-offset-4">{reservationLink.label}</Link> : null}
            </nav>
          ))}
          <Newsletter compact />
        </div>
        <nav aria-label="Legales" className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6">
          {legalLinks.map(({ href, label }) => <Link key={href} href={href} className="t-small min-h-12 rounded-btn py-2 hover:underline underline-offset-4">{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}
