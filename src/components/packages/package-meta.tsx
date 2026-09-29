import { Clock3, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Package } from "@/lib/packages";
export function PackageMeta({ item }: { item: Package }) { const t = useTranslations("common"); return <div className="t-small flex flex-wrap gap-x-4 gap-y-2 text-ink-soft"><span className="inline-flex items-center gap-2"><MapPin size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />{item.destino}</span>{item.duracion && <span className="inline-flex items-center gap-2"><Clock3 size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" /><span className="sr-only">{t("duration")}: </span>{item.duracion}</span>}</div>; }
