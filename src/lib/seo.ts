import type { Metadata } from "next";
import { defaultLocale, localizedPath, type Locale } from "@/i18n/config";
import { siteConfig } from "@/lib/site-config";
import { getLocale, getTranslations } from "next-intl/server";

// Metadata copy is still editorially managed. Localized alternates are generated for every public page.
export function pageMetadata(path: string, title: string, description: string, image?: string | null, article = false, locale: Locale = defaultLocale): Metadata {
  const images = [{ url: image || "/og", alt: title }];
  const spanishPath = localizedPath(path, "es");
  const englishPath = localizedPath(path, "en");
  const canonical = localizedPath(path, locale);
  return { title: { absolute: title }, description, alternates: { canonical, languages: { es: spanishPath, en: englishPath, "x-default": spanishPath } }, openGraph: { title, description, url: canonical, siteName: "viatour", locale: locale === "en" ? "en_US" : "es_HN", type: article ? "article" : "website", images }, twitter: { card: "summary_large_image", title, description, images } };
}

export function localizedAlternates(path: string, locale: Locale) {
  const spanishPath = localizedPath(path, "es");
  const englishPath = localizedPath(path, "en");
  return { canonical: `${siteConfig.url}${localizedPath(path, locale)}`, languages: { es: `${siteConfig.url}${spanishPath}`, en: `${siteConfig.url}${englishPath}`, "x-default": `${siteConfig.url}${spanishPath}` } };
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

export const agencySchema = { "@context": "https://schema.org", "@type": "TravelAgency", "@id": "https://miviatour.com/#agency", name: "viatour", url: "https://miviatour.com", areaServed: "Honduras", contactPoint: { "@type": "ContactPoint", telephone: "+50488668704", contactType: "customer service", availableLanguage: ["es", "en"] } };

export function detailDescription(subject: string, copy?: string | null) {
  const plain = copy?.replace(/\s+/g, " ").trim() || "";
  let text = subject + ". " + plain;
  if (text.length < 150) text += " Consulte la información disponible y solicite su cotización con viatour para planificar su viaje desde Honduras con asesoría personal.";
  if (text.length <= 160) return text.trim();
  const cut = text.lastIndexOf(" ", 159);
  return text.slice(0, cut > 140 ? cut : 159).replace(/[.,;:]$/, "") + ".";
}
