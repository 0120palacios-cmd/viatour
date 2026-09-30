import { useTranslations } from "next-intl";
import { ArrowRight, Compass, Hotel, Package, Plane, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// "How do you want to start?": the four services plus the guided discovery for visitors without a destination yet.
export function Services() {
  const t = useTranslations();
  const services = [
    { icon: Plane, key: "flights", body: t("home.flightBody"), href: "/vuelos" },
    { icon: Hotel, key: "hotels", body: t("home.hotelBody"), href: "/hoteles" },
    { icon: Package, key: "packages", body: t("home.packageBody"), href: "/paquetes" },
    { icon: Compass, key: "customTrip", body: t("home.customBody"), href: "/viaje-a-medida" },
  ];
  return <section className="section-space" aria-labelledby="services-title"><div className="container-site">
    <div className="mb-8 max-w-2xl space-y-3 sm:mb-12"><h2 id="services-title" className="t-h2">{t("common.services")}</h2><p className="t-body-lg text-ink-soft">{t("home.servicesIntro")}</p></div>
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">{services.map(({ icon: Icon, key, body, href }) => <li key={key}><Link href={href} className="media-card group flex h-full items-start gap-4 rounded-card border border-line bg-canvas p-4 shadow-sm sm:flex-col sm:gap-0 sm:p-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand sm:mb-6"><Icon size={24} strokeWidth={1.75} aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-h3 break-normal group-hover:text-brand">{t(`common.${key}`)}</span>
        <span className="t-body mt-1 text-ink-soft sm:mt-2">{body}</span>
        <span className="t-small mt-3 inline-flex items-center gap-2 font-semibold text-brand sm:mt-6">{t("common.learnMore")}<ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-(--duration-fast) group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" /></span>
      </span>
    </Link></li>)}</ul>
    <div className="mt-6 flex flex-col gap-6 rounded-panel border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-btn bg-brand text-canvas"><Sparkles size={24} strokeWidth={1.75} aria-hidden="true" /></span><div className="space-y-1"><h3 className="t-h3">{t("home.discoverTitle")}</h3><p className="t-body measure text-ink-soft">{t("home.discoverBody")}</p></div></div>
      <Button asChild className="shrink-0"><Link href="/descubrir">{t("home.discoverTitle")}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
    </div>
  </div></section>;
}
