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
import whiteLogo from "../../../public/logo-white.png";

function FacebookGlyph() { return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" /></svg>; }
function InstagramGlyph() { return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.75-3a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" clipRule="evenodd" /></svg>; }
function TikTokGlyph() { return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31 0 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.6 4.24 1.76v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.65 3.22-5.99 3.26-1.47.08-2.93-.32-4.1-1.12-1.94-1.33-3.2-3.58-3.23-5.94-.02-.5-.03-1.01-.01-1.5.21-2.14 1.23-4.17 2.99-5.51 1.53-1.21 3.56-1.76 5.5-1.49.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 3.14 1.12.11 2.27-.31 3.02-1.14.6-.68.92-1.57.9-2.48.04-4.45.03-8.9.03-13.35Z" /></svg>; }
const socialLinks = [{ Icon: FacebookGlyph, key: "Facebook", href: siteConfig.social.facebook }, { Icon: InstagramGlyph, key: "Instagram", href: siteConfig.social.instagram }, { Icon: TikTokGlyph, key: "TikTok", href: siteConfig.social.tiktok }].filter(({ href }) => href.trim().length > 0);

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
            <li><a href={`mailto:${siteConfig.supportEmail}`} className={`${footerLink} gap-3`}><Mail size={18} strokeWidth={1.75} aria-hidden="true" />{siteConfig.supportEmail}</a></li>
            <li><a href={siteConfig.googleProfileUrl} target="_blank" rel="noopener noreferrer" className={`${footerLink} gap-3`}><MapPin size={18} strokeWidth={1.75} aria-hidden="true" />{t("footer.googleProfile")}</a></li>
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
