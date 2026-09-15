import Image from "next/image";
import Link from "next/link";
import { Camera, MessagesSquare, Video } from "lucide-react";
import { legalLinks, mainLinks, serviceLinks } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { Newsletter } from "./newsletter";
import { WhatsAppLink } from "./whatsapp-link";
import whiteLogo from "../../../public/logo-white.png";

export function Footer() {
  return (
    <footer id="site-footer" className="bg-ink text-canvas">
      <div className="container-site space-y-12 py-14 sm:py-24">
        <div className="grid gap-12 sm:grid-cols-2 min-[1200px]:grid-cols-4">
          <div className="space-y-6">
            <Link href="/" className="inline-block rounded-btn p-4" aria-label="viatour — Inicio">
              <Image src={whiteLogo} alt="viatour" className="h-auto w-32" sizes="128px" />
            </Link>
            <div className="flex gap-3" aria-label="Redes sociales">
              {[{ Icon: MessagesSquare, label: "Facebook" }, { Icon: Camera, label: "Instagram" }, { Icon: Video, label: "YouTube" }].map(({ Icon, label }) => (
                <span key={label} role="img" aria-label={label} className="flex size-12 items-center justify-center rounded-btn bg-surface text-ink-soft">
                  <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                </span>
              ))}
            </div>
            <WhatsAppLink compact />
          </div>
          {[{ title: "Servicios", links: serviceLinks }, { title: "viatour", links: mainLinks }].map(({ title, links }) => (
            <nav key={title} aria-label={title} className="space-y-4">
              <h2 className="t-h3">{title}</h2>
              <ul className="space-y-2">
                {links.map(({ href, label }) => <li key={href}><Link href={href} className="t-body inline-block rounded-btn py-2 transition-colors duration-(--duration-fast) ease-out hover:text-brand-tint hover:underline underline-offset-4">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
          <Newsletter />
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
