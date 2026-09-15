import type { Metadata } from "next";
import { Manrope } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-HN" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
