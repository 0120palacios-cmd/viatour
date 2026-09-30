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

// Words that cannot end a title or a trimmed description: cutting "…a su medida desde Honduras"
// at 60 characters used to leave "…a su medida desde" in search results.
const danglingWords = new Set(["a", "al", "con", "de", "del", "desde", "el", "en", "la", "las", "los", "para", "por", "su", "sus", "un", "una", "y", "o", "and", "for", "from", "in", "of", "the", "to", "with", "your", "our"]);

// Search results show about 160 characters. Longer text ends on the last whole sentence that fits;
// when no sentence fits, it ends on a whole word followed by an ellipsis, never on a connector.
export function fitDescriptionText(value: string, max = 160) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  const sentenceEnd = Math.max(...[". ", "? ", "! "].map(mark => head.lastIndexOf(mark)));
  if (sentenceEnd >= 90) return head.slice(0, sentenceEnd + 1);
  const words = text.slice(0, max).split(" ");
  words.pop();
  while (words.length > 1 && danglingWords.has(words.at(-1)!.replace(/[.,;:]$/, "").toLocaleLowerCase())) words.pop();
  return `${words.join(" ").replace(/[.,;:–—-]+$/, "")}…`;
}

// A short description gains one closing call to action, and only when the whole sentence fits.
export function fitMetaDescription(description: string, locale: Locale = defaultLocale) {
  const suffix = locale === "en" ? " Request personal travel advice from viatour." : " Solicite su cotización con viatour.";
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length < 110 && text.length + suffix.length <= 160 && /[.?!]$/.test(text)) return text + suffix;
  return fitDescriptionText(text);
}

export function fitMetaTitle(title: string) {
  const text = title.replace(/\s+/g, " ").trim();
  if (text.length <= 60) return text;
  const cut = text.lastIndexOf(" ", 59);
  const words = text.slice(0, cut > 45 ? cut : 59).split(" ");
  while (words.length > 1 && (danglingWords.has(words.at(-1)!.toLocaleLowerCase()) || /^[|,:;–—-]$/.test(words.at(-1)!))) words.pop();
  return words.join(" ").replace(/[|,:;–—-]$/, "").trim();
}

// The first candidate that fits whole; titles are written longest (most descriptive) first.
export function pickMetaTitle(...candidates: string[]) {
  const fitting = candidates.map(value => value.replace(/\s+/g, " ").trim()).find(value => value.length <= 60);
  return fitting ?? fitMetaTitle(candidates.at(-1) ?? "");
}

// Announced in every page head so readers and crawlers can find the guides feed.
const feedAlternates = { "application/rss+xml": [{ url: absoluteUrl("/blog/rss.xml"), title: "viatour | Guías de viaje" }] };

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
  return { title: { absolute: fittedTitle }, description: fittedDescription, alternates: { canonical, languages: { es: absoluteUrl(spanishPath), en: absoluteUrl(englishPath), "x-default": absoluteUrl(spanishPath) }, types: feedAlternates }, openGraph: { title: fittedTitle, description: fittedDescription, url: canonical, siteName: "viatour", locale: locale === "en" ? "en_US" : "es_HN", type: article ? "article" : "website", images }, twitter: { card: "summary_large_image", title: fittedTitle, description: fittedDescription, images } };
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

// Database content (packages, destinations, blog) exists only in Spanish. The English URL keeps
// its translated chrome for visitors but canonicalises to the Spanish page and no `en` alternate
// is advertised, so search engines do not index Spanish text under English metadata.
export async function localizedContentMetadata(path: string, title: string, description: string, image?: string | null, article = false): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const spanish = localizedUrl(path, "es");
  return { ...pageMetadata(path, title, description, image, article, locale), alternates: { canonical: spanish, languages: { es: spanish, "x-default": spanish }, types: feedAlternates } };
}

// One agency entity for the whole site. Other nodes (trips, articles, services, ratings) point at
// it by @id instead of repeating it, so search engines and AI systems read a single organisation.
export const agencyId = absoluteUrl("/#agency");
export const websiteId = absoluteUrl("/#website");
export const agencyRef = { "@id": agencyId } as const;

// The four services viatour quotes (Build Brief §2). Names stay in Spanish: they are the offer.
export const agencyServices = [
  { name: "Vuelos", path: "/vuelos", description: "Cotización de vuelos internacionales desde Honduras: ida y vuelta, solo ida o multidestino, en clase Económica, Premium, Ejecutiva o Primera." },
  { name: "Hoteles", path: "/hoteles", description: "Búsqueda y reserva de hoteles en el destino, según fechas, número de huéspedes y presupuesto." },
  { name: "Paquetes de viaje", path: "/paquetes", description: "Paquetes armados con vuelo, hotel y servicios, ajustados a las fechas y al presupuesto de cada viajero." },
  { name: "Viaje a medida", path: "/viaje-a-medida", description: "Diseño de un viaje completamente personalizado con un asesor de viaje." },
] as const;

const agencyNode = {
  "@type": "TravelAgency",
  "@id": agencyId,
  name: "viatour",
  // "Viatour Travel" is the name on the Google Business Profile; listing it lets Google tie the
  // profile and the site to one business until both use the same name.
  alternateName: ["miviatour", "Viatour Travel"],
  description: "Asesores de viaje en Honduras para viajes al exterior. viatour ofrece servicios de viaje desde 2018: vuelos, hoteles, paquetes y viajes a medida, cotizados personalmente por un asesor y coordinados por WhatsApp.",
  slogan: siteConfig.tagline,
  foundingDate: "2018",
  url: absoluteUrl("/"),
  logo: { "@type": "ImageObject", url: absoluteUrl("/logo-black.png") },
  image: absoluteUrl("/logo-black.png"),
  email: siteConfig.supportEmail,
  telephone: "+504 8866-8704",
  // Service-area business (Build Brief §3): no public street address, only the country it serves.
  address: { "@type": "PostalAddress", addressCountry: "HN" },
  areaServed: { "@type": "Country", name: "Honduras" },
  ...(siteConfig.googleProfileUrl ? { hasMap: siteConfig.googleProfileUrl } : {}),
  knowsLanguage: ["es", "en"],
  contactPoint: { "@type": "ContactPoint", telephone: "+50488668704", contactType: "customer service", url: `https://wa.me/${siteConfig.whatsappNumber}`, email: siteConfig.supportEmail, areaServed: "HN", availableLanguage: ["es", "en"] },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicios de viaje de viatour",
    itemListElement: agencyServices.map(service => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: service.name, description: service.description, url: absoluteUrl(service.path) } })),
  },
  sameAs: [siteConfig.social.facebook, siteConfig.social.instagram, siteConfig.social.tiktok, siteConfig.googleProfileUrl].filter(Boolean),
};
export const agencySchema = { "@context": "https://schema.org", ...agencyNode };

export const siteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    agencyNode,
    { "@type": "WebSite", "@id": websiteId, url: absoluteUrl("/"), name: "viatour", alternateName: "miviatour.com", inLanguage: ["es-HN", "en"], publisher: agencyRef },
  ],
};

// A service page: what viatour does, for whom and where, attached to the agency.
export function serviceSchema(path: string, name: string, description: string, locale: Locale = defaultLocale) {
  return { "@context": "https://schema.org", "@type": "Service", "@id": `${localizedUrl(path, locale)}#service`, name, description, serviceType: name, url: localizedUrl(path, locale), provider: agencyRef, areaServed: { "@type": "Country", name: "Honduras" }, availableChannel: { "@type": "ServiceChannel", serviceUrl: `https://wa.me/${siteConfig.whatsappNumber}`, availableLanguage: ["es", "en"] } };
}

// A listing page (packages, destinations, guides) as a CollectionPage whose ItemList names every
// entry and links it, so crawlers and AI systems read the catalogue without following each card.
export function collectionSchema(path: string, name: string, items: readonly { name: string; path: string; image?: string | null }[], locale: Locale = defaultLocale) {
  const url = localizedUrl(path, locale);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name,
    isPartOf: { "@id": websiteId },
    publisher: agencyRef,
    inLanguage: locale === "en" ? "en" : "es-HN",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: absoluteUrl(localizedPath(item.path, "es")), ...(item.image ? { image: absoluteUrl(item.image) } : {}) })),
    },
  };
}

export function noindexMetadata(title: string, description: string): Metadata {
  return { title: { absolute: title }, description, robots: { index: false, follow: false } };
}

export function detailDescription(subject: string, copy?: string | null) {
  const plain = copy?.replace(/\s+/g, " ").trim() || "";
  const text = `${subject.replace(/[.\s]+$/, "")}. ${plain}`.trim();
  const closing = " Solicite su cotización con viatour desde Honduras.";
  if (text.length + closing.length <= 160 && /[.?!]$/.test(text)) return text + closing;
  return fitDescriptionText(text);
}
