import { hasPublishedPrice, type Package } from "@/lib/packages";
import { useTranslations } from "next-intl";
export function PackagePrice({ item }: { item: Package }) { const t = useTranslations("common"); if (!hasPublishedPrice(item)) return <p className="t-small text-ink-soft">{t("requestQuote")}</p>; return <p className="t-small text-ink-soft">{t("requestQuote")}</p>; }
