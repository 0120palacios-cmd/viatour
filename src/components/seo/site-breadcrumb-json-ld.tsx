import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { breadcrumbSchema } from "@/lib/seo";
import type { Locale } from "@/i18n/config";

const segmentKeys: Record<string, string> = {
  destinos: "destinations",
  descubrir: "discover",
  opiniones: "reviews",
  blog: "blog",
  nosotros: "about",
  contacto: "contact",
  "mi-reserva": "reservation",
  vuelos: "flights",
  hoteles: "hotels",
  paquetes: "packages",
  "viaje-a-medida": "customTrip",
  "preguntas-frecuentes": "faq",
  requisitos: "requirements",
  legales: "terms",
};

function humanizeSegment(segment: string) {
  return decodeURIComponent(segment).replace(/[-_]+/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

export async function SiteBreadcrumbJsonLd() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-viatour-pathname") || "/";
  if (/^\/(admin|api|mi-reserva|styleguide)(\/|$)/.test(pathname)) return null;
  const locale = (await getLocale()) as Locale;
  const common = await getTranslations("common");
  const items = [{ label: common("home"), href: "/" }];
  let currentPath = "";
  for (const segment of pathname.split("/").filter(Boolean)) {
    currentPath += `/${segment}`;
    const key = segmentKeys[segment];
    items.push({ label: key ? common(key) : humanizeSegment(segment), href: currentPath });
  }
  const schema = breadcrumbSchema(items, locale === "en" ? "en" : "es");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}
