import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { breadcrumbSchema } from "@/lib/seo";

export type BreadcrumbItem = { label: string; href: string };

// schema=false when the page already gets BreadcrumbList from the layout (SiteBreadcrumbJsonLd).
export function Breadcrumbs({ items, schema: withSchema = true }: { items: readonly BreadcrumbItem[]; schema?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const schema = breadcrumbSchema(items, locale === "en" ? "en" : "es");

  return <>
    <nav aria-label={t("breadcrumbs")} className="t-small text-ink-soft">
      <ol className="flex flex-wrap items-center gap-2">
        {/* On phones a deep trail's last crumb repeats the H1 right below it and wraps onto its own line. */}
        {items.map((item, index) => <li key={item.href} className={`flex items-center gap-2 ${index === items.length - 1 && items.length > 2 ? "max-sm:hidden" : ""}`}>
          {index > 0 && <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />}
          {index === items.length - 1 ? <span aria-current="page" className="text-ink">{item.label}</span> : <Link href={item.href} className="inline-flex min-h-11 items-center rounded-btn underline underline-offset-4 hover:text-brand">{item.label}</Link>}
        </li>)}
      </ol>
    </nav>
    {withSchema && <JsonLd data={schema} />}
  </>;
}
