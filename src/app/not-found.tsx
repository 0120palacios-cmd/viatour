import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { ArrowRight, Compass, MapPin, MessageSquare, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { localizedPageMetadata } from "@/lib/seo";
export async function generateMetadata(): Promise<Metadata> { return { ...(await localizedPageMetadata("/404", "home")), alternates: { canonical: null }, robots: { index: false, follow: true } }; }
export default function NotFound() {
  const t = useTranslations();
  const next = [{ href: "/paquetes", key: "packages", icon: Package }, { href: "/destinos", key: "destinations", icon: MapPin }, { href: "/descubrir", key: "discover", icon: Compass }, { href: "/contacto", key: "contact", icon: MessageSquare }] as const;
  return <main className="container-site section-space">
    <div className="max-w-2xl space-y-6">
      <h1 className="t-h1">{t("static.notFound")}</h1>
      <p className="t-body-lg text-ink-soft">{t("static.notFoundBody")}</p>
      <Button asChild><Link href="/">{t("static.notFoundHome")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
    </div>
    <nav aria-labelledby="not-found-next" className="mt-12 space-y-4">
      <h2 id="not-found-next" className="t-small text-ink-soft">{t("ux.notFoundNext")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{next.map(({ href, key, icon: Icon }) => <li key={href}><Link href={href} className="media-card flex min-h-16 items-center gap-3 rounded-card border border-line bg-canvas p-4 shadow-sm hover:text-brand"><Icon size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /><span className="t-body font-semibold">{t(`common.${key}`)}</span></Link></li>)}</ul>
    </nav>
  </main>;
}
