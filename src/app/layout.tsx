import { agencySchema, pageMetadata } from "@/lib/seo";
import { Analytics } from "@/components/analytics";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { CurrencyProvider } from "@/components/currency-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { PublicChrome } from "@/components/layout/public-chrome";
import { ConsentProvider, CookieBanner } from "@/components/cookie-consent";
import { type Locale } from "@/i18n/config";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope" });
export const viewport: Viewport = { themeColor: "#1656D6" };

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const english = locale === "en";
  return {
    ...pageMetadata("/", english ? "viatour | Travel advice from Honduras" : "viatour | Asesoría para planificar su viaje desde Honduras", english ? "Your travel advisors in Honduras. Flights, hotels and packages with personal guidance to plan your next trip and request a quote on WhatsApp." : "Sus asesores de viaje en Honduras. Vuelos, hoteles y paquetes con atención personal para planificar su próximo viaje y solicitar su cotización por WhatsApp.", undefined, false, locale),
    metadataBase: new URL("https://miviatour.com"),
    title: { default: english ? "viatour | Travel advice from Honduras" : "viatour | Asesoría para planificar su viaje desde Honduras", template: english ? "viatour | %s from Honduras" : "viatour | %s desde Honduras" },
    icons: { icon: "/icon.svg", apple: "/apple-icon" },
    ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } } : {}),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const currency = (await cookies()).get("viatour-currency")?.value === "HNL" ? "HNL" : "USD";
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  return (
    <html lang={locale === "en" ? "en" : "es-HN"} className={manrope.variable}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agencySchema) }} />
          <ConsentProvider><PublicChrome><Analytics /></PublicChrome><CurrencyProvider initialCurrency={currency}>
            <PublicChrome><Header /></PublicChrome>
            <div className="flex-1">{children}</div>
            <PublicChrome><Footer /><WhatsAppFloat /></PublicChrome>
            <PublicChrome><CookieBanner /></PublicChrome>
          </CurrencyProvider></ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
