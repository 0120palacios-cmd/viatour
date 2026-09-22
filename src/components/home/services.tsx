import { useTranslations } from "next-intl";
import { ArrowUpRight, Compass, Hotel, Package, Plane } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function Services() {
  const t = useTranslations();
  const services = [
    { icon: Plane, key: "flights", body: t("home.flightBody"), href: "/vuelos" },
    { icon: Hotel, key: "hotels", body: t("home.hotelBody"), href: "/hoteles" },
    { icon: Package, key: "packages", body: t("home.packageBody"), href: "/paquetes" },
    { icon: Compass, key: "customTrip", body: t("home.customBody"), href: "/viaje-a-medida" },
  ];
  return <section className="border-y border-line bg-surface py-14 sm:py-24" aria-labelledby="services-title"><div className="container-site"><div className="mb-12 space-y-4"><h2 id="services-title" className="t-h2">{t("common.services")}</h2><p className="t-body-lg measure text-ink-soft">{t("home.servicesIntro")}</p></div><div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">{services.map(({ icon: Icon, key, body, href }) => <article key={key} className="flex min-w-0 flex-col rounded-card border border-line bg-canvas p-5 shadow-sm sm:p-6"><Icon size={28} strokeWidth={1.75} className="mb-6 text-brand" aria-hidden="true" /><h3 className="t-h3 break-normal">{t(`common.${key}`)}</h3><p className="t-small mt-3 min-w-0 truncate text-ink-soft" title={body}>{body}</p><Link href={href} className="t-small mt-5 inline-flex min-h-12 items-center gap-2 self-start text-brand underline underline-offset-4">{t("common.learnMore")}<ArrowUpRight size={16} aria-hidden="true" /></Link></article>)}</div></div></section>;
}
