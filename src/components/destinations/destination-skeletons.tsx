import { useTranslations } from "next-intl";
// Mirrors DestinationTile: a 4:3 tile with the name set on the photo.
export function DestinationSkeletons({ count = 6 }: { count?: number }) { const t = useTranslations("common"); return <div role="status" aria-label={t("loading")}><span className="sr-only">{t("loading")}</span><div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">{Array.from({ length: count }, (_, key) => <div key={key} className="aspect-[4/3] rounded-card border border-line bg-surface motion-safe:animate-pulse" />)}</div></div>; }
