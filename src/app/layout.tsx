import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { CurrencyProvider } from "@/components/currency-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://miviatour.com"),
  title: {
    default: "viatour | Agencia de viajes en Honduras",
    template: "viatour | %s",
  },
  description:
    "Sus asesores de viaje en Honduras. Vuelos, hoteles y paquetes con atención personal.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currency = (await cookies()).get("viatour-currency")?.value === "HNL" ? "HNL" : "USD";
  return (
    <html lang="es-HN" className={manrope.variable}>
      <body className="flex min-h-dvh flex-col">
        <CurrencyProvider initialCurrency={currency}>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
          <WhatsAppFloat />
        </CurrencyProvider>
      </body>
    </html>
  );
}
