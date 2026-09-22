import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Destination } from "@/lib/destinations";
import { DestinationImage } from "@/components/destinations/destination-image";
export { DestinationImage } from "@/components/destinations/destination-image";
export { DestinationSkeletons } from "@/components/destinations/destination-skeletons";
export function DestinationCard({ item }: { item: Destination }) { return <Link href={"/destinos/" + item.slug} className="media-card group block rounded-card border border-line bg-canvas p-6 shadow-sm"><DestinationImage item={item} /><div className="flex items-center justify-between gap-4 pt-6"><h3 className="t-h3">{item.nombre}</h3><ArrowUpRight size={24} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" /></div></Link>; }
export function DestinationGrid({ items }: { items: Destination[] }) { const t = useTranslations("static"); if (!items.length) return <div role="status" className="rounded-panel border border-line bg-surface p-8 text-center"><p className="t-body text-ink-soft">{t("noPosts")}</p></div>; return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <DestinationCard key={item.id} item={item} />)}</div>; }
