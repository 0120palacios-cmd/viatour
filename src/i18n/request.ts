import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "./config";

const messages = {
  es: () => import("../../messages/es.json").then((module) => module.default),
  en: () => import("../../messages/en.json").then((module) => module.default),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = (await requestLocale) || (await headers()).get("x-viatour-locale") || defaultLocale;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  return { locale, messages: await messages[locale]() };
});
