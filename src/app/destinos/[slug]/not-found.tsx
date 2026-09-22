import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
export default function NotFound() { const t = useTranslations("static"); return <main className="container-site space-y-6 py-14 text-center sm:py-24"><h1 className="t-h1">{t("notFound")}</h1><p className="t-body text-ink-soft">{t("notFoundBody")}</p><Link href="/destinos" className="t-small text-brand underline underline-offset-4">{t("backToDestinations")}</Link></main>; }
