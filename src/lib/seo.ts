import type { Metadata } from "next";
import { defaultLocale, localizedPath, type Locale } from "@/i18n/config";
import { siteConfig } from "@/lib/site-config";
import { getLocale, getTranslations } from "next-intl/server";

export function absoluteUrl(path = "") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localizedUrl(path: string, locale: Locale) {
  return absoluteUrl(localizedPath(path, locale));
}

export function fitMetaDescription(description: string, locale: Locale = defaultLocale) {
  const suffix = locale === "en" ? " Learn more and request travel advice from viatour." : " Conozca más y solicite su cotización con viatour.";
  let text = description.replace(/\s+/g, " ").trim();
  while (text.length < 150) text += suffix;
  if (text.length <= 160) return text;
  const cut = text.lastIndexOf(" ", 159);
  return `${text.slice(0, cut > 140 ? cut : 159).replace(/[.,;:]$/, "")}.`;
}

export function fitMetaTitle(title: string) {
  const text = title.replace(/\s+/g, " ").trim();
  if (text.length <= 60) return text;
  const cut = text.lastIndexOf(" ", 59);
  return text.slice(0, cut > 45 ? cut : 59).replace(/[|,:;-]$/, "").trim();
}

export type BreadcrumbItem = { label: string; href: string };

export function breadcrumbSchema(items: readonly BreadcrumbItem[], locale: Locale = defaultLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: localizedUrl(item.href, locale),
    })),
  };
}

export function pageMetadata(path: string, title: string, description: string, image?: string | null, article = false, locale: Locale = defaultLocale): Metadata {
  const fittedTitle = fitMetaTitle(title);
  const images = [{ url: image ? absoluteUrl(image) : absoluteUrl(`/og?title=${encodeURIComponent(fittedTitle)}&locale=${locale}`), width: 1200, height: 630, alt: fittedTitle }];
  const spanishPath = localizedPath(path, "es");
  const englishPath = localizedPath(path, "en");
  const canonical = localizedUrl(path, locale);
  const fittedDescription = fitMetaDescription(description, locale);
  return { title: { absolute: fittedTitle }, description: fittedDescription, alternates: { canonical, languages: { es: absoluteUrl(spanishPath), en: absoluteUrl(englishPath), "x-default": absoluteUrl(spanishPath) } }, openGraph: { title: fittedTitle, description: fittedDescription, url: canonical, siteName: "viatour", locale: locale === "en" ? "en_US" : "es_HN", type: article ? "article" : "website", images }, twitter: { card: "summary_large_image", title: fittedTitle, description: fittedDescription, images } };
}

export function localizedAlternates(path: string, locale: Locale) {
  const spanishPath = localizedPath(path, "es");
  const englishPath = localizedPath(path, "en");
  return { canonical: localizedUrl(path, locale), languages: { es: absoluteUrl(spanishPath), en: absoluteUrl(englishPath), "x-default": absoluteUrl(spanishPath) } };
}

export async function localizedPageMetadata(path: string, key: string, image?: string | null, article = false): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("seo");
  return pageMetadata(path, t(`${key}.title`), t(`${key}.description`), image, article, locale);
}

export async function localizedContentMetadata(path: string, title: string, description: string, image?: string | null, article = false): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return pageMetadata(path, title, description, image, article, locale);
}

export const agencySchema = { "@context": "https://schema.org", "@type": "TravelAgency", "@id": absoluteUrl("/#agency"), name: "viatour", description: "Asesores de viaje en Honduras para viajes al exterior. viatour ofrece servicios de viaje desde 2018.", url: absoluteUrl("/"), logo: absoluteUrl("/logo-black.png"), areaServed: { "@type": "Country", name: "Honduras" }, contactPoint: { "@type": "ContactPoint", telephone: "+50488668704", contactType: "customer service", url: "https://wa.me/50488668704", availableLanguage: ["es", "en"] }, sameAs: [siteConfig.social.facebook, siteConfig.social.instagram, siteConfig.social.tiktok] };

export function noindexMetadata(title: string, description: string): Metadata {
  return { title: { absolute: title }, description, robots: { index: false, follow: false } };
}

export function detailDescription(subject: string, copy?: string | null) {
  const plain = copy?.replace(/\s+/g, " ").trim() || "";
  let text = subject + ". " + plain;
  if (text.length < 150) text += " Consulte la información disponible y solicite su cotización con viatour para planificar su viaje desde Honduras con asesoría personal.";
  if (text.length <= 160) return text.trim();
  const cut = text.lastIndexOf(" ", 159);
  return text.slice(0, cut > 140 ? cut : 159).replace(/[.,;:]$/, "") + ".";
}
