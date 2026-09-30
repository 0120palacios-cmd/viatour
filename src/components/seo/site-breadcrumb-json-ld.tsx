import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import type { Locale } from "@/i18n/config";

// Static routes and their labels. Detail pages (packages, destinations, guides, city pages) emit
// their own BreadcrumbList with the real title, and unknown paths (404s) get none at all.
// `null` marks a path segment that has no page of its own, so it is left out of the trail.
const segmentKeys: Record<string, string | null> = {
  destinos: "common.destinations",
  descubrir: "common.discover",
  opiniones: "common.reviews",
  nueva: "reviews.formTitle",
  blog: "common.blog",
  nosotros: "common.about",
  contacto: "common.contact",
  vuelos: "common.flights",
  hoteles: "common.hotels",
  paquetes: "common.packages",
  "viaje-a-medida": "common.customTrip",
  "preguntas-frecuentes": "common.faq",
  requisitos: "common.requirements",
  legales: null,
  terminos: "common.terms",
  privacidad: "common.privacy",
  cancelaciones: "common.cancellations",
  cookies: "common.cookies",
};
const staticRoutes = new Set(["/destinos", "/descubrir", "/opiniones", "/opiniones/nueva", "/blog", "/nosotros", "/contacto", "/vuelos", "/hoteles", "/paquetes", "/viaje-a-medida", "/preguntas-frecuentes", "/requisitos", "/legales/terminos", "/legales/privacidad", "/legales/cancelaciones", "/legales/cookies"]);

export async function SiteBreadcrumbJsonLd() {
  const pathname = (await headers()).get("x-viatour-pathname") || "/";
  if (!staticRoutes.has(pathname.replace(/\/$/, ""))) return null;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const items = [{ label: t("common.home"), href: "/" }];
  let currentPath = "";
  for (const segment of pathname.split("/").filter(Boolean)) {
    currentPath += `/${segment}`;
    const key = segmentKeys[segment];
    if (key) items.push({ label: t(key), href: currentPath });
  }
  return <JsonLd data={breadcrumbSchema(items, locale === "en" ? "en" : "es")} />;
}
