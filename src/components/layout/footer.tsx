import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Mail, MapPin, MessageCircle } from "lucide-react";
import { helpLinks, legalLinks, reservationLink, serviceLinks } from "@/lib/navigation";
import { CITY_SEO_PAGES } from "@/lib/city-seo";
import { siteConfig } from "@/lib/site-config";
import { CurrencyToggle } from "./currency-toggle";
import { PACKAGE_DISPLAY_RULES } from "@/lib/display-rules";
import { WhatsAppLink } from "./whatsapp-link";
import { TrackedLink } from "@/components/tracked-link";
import { socialLinks } from "@/components/social-glyphs";
import whiteLogo from "../../../public/logo-white.png";


const exploreLinks = [
  { key: "destinations", href: "/destinos" },
  { key: "discover", href: "/descubrir" },
  { key: "reviews", href: "/opiniones" },
  { key: "blog", href: "/blog" },
  ...helpLinks,
] as const;
const companyLinks = [
  { key: "about", href: "/nosotros" },
  { key: "contact", href: "/contacto" },
  reservationLink,
  { key: "sharePromo", href: "/gira" },
] as const;

const footerLink = "t-small inline-flex min-h-11 items-center rounded-btn text-canvas/85 transition-colors duration-(--duration-fast) ease-out hover:text-canvas hover:underline underline-offset-4";

export function Footer() {
  const t = useTranslations();
  const coverage = CITY_SEO_PAGES.filter(city => city.published);
  const columns: { title: string; links: readonly { href: string; label: string }[] }[] = [
    { title: t("common.services"), links: serviceLinks.map(({ href, key }) => ({ href, label: t(`common.${key}`) })) },
    { title: t("footer.explore"), links: exploreLinks.map(({ href, key }) => ({ href, label: t(`common.${key}`) })) },
    { title: "viatour", links: companyLinks.map(({ href, key }) => ({ href, label: t(`common.${key}`) })) },
    ...(coverage.length ? [{ title: t("footer.coverage"), links: coverage.map(city => ({ href: `/agencia-de-viajes/${city.slug}`, label: city.name })) }] : []),
  ];
  return <footer id="site-footer" className="bg-ink text-canvas">
    <div className="container-site py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2.8fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <Link href="/" className="inline-block rounded-btn p-1" aria-label={t("header.homeLabel")}><Image src={whiteLogo} alt="viatour" className="h-auto w-32" sizes="128px" /></Link>
          <p className="t-body max-w-xs text-canvas/85">{t("static.aboutTitle")}</p>
          <WhatsAppLink placement="footer" />
          <ul className="space-y-1">
            <li><span className="t-small inline-flex min-h-11 items-center gap-3 text-canvas/85"><MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />+504 8866-8704</span></li>
            <li><TrackedLink event="email_click" placement="footer" href={`mailto:${siteConfig.supportEmail}`} className={`${footerLink} gap-3`}><Mail size={18} strokeWidth={1.75} aria-hidden="true" />{siteConfig.supportEmail}</TrackedLink></li>
            <li><TrackedLink event="google_profile_click" placement="footer" href={siteConfig.googleProfileUrl} target="_blank" rel="noopener noreferrer" className={`${footerLink} gap-3`}><MapPin size={18} strokeWidth={1.75} aria-hidden="true" />{t("footer.googleProfile")}</TrackedLink></li>
          </ul>
          {socialLinks.length > 0 && <nav className="flex gap-2" aria-label={t("footer.social")}>{socialLinks.map(({ Icon, key, href }) => <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${key} de viatour`} className="flex size-12 items-center justify-center rounded-btn border border-canvas/25 text-canvas transition-colors duration-(--duration-fast) ease-out hover:bg-canvas hover:text-ink"><Icon /></a>)}</nav>}
          {/* The toggle only matters once prices are shown; until then it would change nothing visible. */}
          {PACKAGE_DISPLAY_RULES.mostrar_precios && <div className="space-y-2"><p className="t-small text-canvas/85">{t("footer.currency")}</p><CurrencyToggle /></div>}
        </div>
        <div className="hidden grid-cols-2 gap-x-6 gap-y-10 sm:grid md:grid-cols-4">
          {columns.map(({ title, links }) => <nav key={title} aria-label={title} className="space-y-3">
            <h2 className="t-small font-semibold text-canvas">{title}</h2>
            <ul>{links.map(({ href, label }) => <li key={href}><Link href={href} className={footerLink}>{label}</Link></li>)}</ul>
          </nav>)}
        </div>
        {/* Phones: the same groups as native disclosures, so the footer is a short list of topics
            instead of a thousand pixels of links. Works without JavaScript. */}
        <div className="divide-y divide-canvas/15 border-y border-canvas/15 sm:hidden">
          {columns.map(({ title, links }) => <details key={title} className="group/footer">
            <summary className="t-body flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-canvas [&::-webkit-details-marker]:hidden">
              <h2>{title}</h2><ChevronDown size={20} strokeWidth={1.75} className="shrink-0 text-canvas/70 transition-transform duration-(--duration-fast) ease-out group-open/footer:rotate-180" aria-hidden="true" />
            </summary>
            <nav aria-label={title} className="pb-4"><ul className="grid grid-cols-2 gap-x-4">{links.map(({ href, label }) => <li key={href}><Link href={href} className={footerLink}>{label}</Link></li>)}</ul></nav>
          </details>)}
        </div>
      </div>
      <p className="t-small mt-12 text-canvas/70">{t("footer.iata")}</p>
      <div className="mt-6 flex flex-col gap-4 border-t border-canvas/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-small text-canvas/70">{"© "}{t("ux.copyright", { year: new Date().getFullYear() })} <span className="text-canvas/85">{siteConfig.tagline}</span></p>
        <nav aria-label={t("footer.legal")}><ul className="flex flex-wrap gap-x-6">{legalLinks.map(({ href, key }) => <li key={href}><Link href={href} className={footerLink}>{t(`common.${key}`)}</Link></li>)}</ul></nav>
      </div>
    </div>
  </footer>;
}
