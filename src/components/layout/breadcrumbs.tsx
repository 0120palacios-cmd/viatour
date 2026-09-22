import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export type BreadcrumbItem = { label: string; href: string };

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  const t = useTranslations("common");
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${siteConfig.url}${item.href}`,
    })),
  };

  return <>
    <nav aria-label={t("breadcrumbs")} className="t-small text-ink-soft">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => <li key={item.href} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />}
          {index === items.length - 1 ? <span aria-current="page" className="text-ink">{item.label}</span> : <Link href={item.href} className="rounded-btn underline underline-offset-4 hover:text-brand">{item.label}</Link>}
        </li>)}
      </ol>
    </nav>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
  </>;
}
