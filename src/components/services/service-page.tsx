import { useLocale, useTranslations } from "next-intl";
import { JsonLd } from "@/components/seo/json-ld";
import { serviceSchema } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { Check } from "lucide-react";
import { FlightTool, type FlightToolTab } from "@/components/home/flight-tool";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/components/home/sections";
import { QuoteHowItWorks } from "@/components/quote/quote-parts";

type ServicePageProps = { breadcrumbKey: string; path: string; titleKey: string; introKey: string; defaultTab: FlightToolTab; helpKeys: readonly [string, string, string] };
// The form is the page: header, then the quote tool beside what the advisor does for you.
export function ServicePage({ breadcrumbKey, path, titleKey, introKey, defaultTab, helpKeys }: ServicePageProps) {
  const t = useTranslations("services"); const common = useTranslations("common"); const locale = useLocale() as Locale;
  return <main>
    <JsonLd data={serviceSchema(path, t(titleKey), t(introKey), locale)} />
    <div className="container-site">
      <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common(breadcrumbKey), href: path }]} title={t(titleKey)} intro={t(introKey)} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <section aria-label={common("requestQuote")} className="min-w-0"><FlightTool defaultTab={defaultTab} /></section>
        <aside aria-labelledby="help-title" className="space-y-6 lg:sticky lg:top-28">
          <div className="space-y-4 rounded-panel border border-line bg-surface p-6">
            <h2 id="help-title" className="t-h3">{t("helpTitle")}</h2>
            <ul className="space-y-4">{helpKeys.map(key => <li key={key} className="t-body flex gap-3"><Check size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><span>{t(key)}</span></li>)}</ul>
          </div>
          <QuoteHowItWorks />
        </aside>
      </div>
    </div>
    <FinalCta />
  </main>;
}
