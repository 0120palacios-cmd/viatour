import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
export default function NotFound() { const t = useTranslations("static"); return <main className="container-site py-14 sm:py-24"><h1 className="t-h1">{t("notFound")}</h1><Link href="/blog" className="mt-6 inline-block text-brand underline">{t("backToBlog")}</Link></main>; }
