import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});

export function isLocale(value: string | undefined): value is Locale {
  return value === "es" || value === "en";
}

export function localizedPath(path: string, locale: Locale) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return cleanPath || "/";
  return cleanPath === "/" ? "/en" : `/en${cleanPath}`;
}
