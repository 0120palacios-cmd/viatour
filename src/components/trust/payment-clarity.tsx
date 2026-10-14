import { useId } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleCheck, ListChecks, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

// Answers the money questions that low-rated reviews raised (destination charges, rate validity,
// change rules) where the visitor decides. Every line restates an approved policy from
// /legales/terminos and /legales/cancelaciones, or is a checklist for the visitor; none adds a policy.
export const priceFaqHref = "/preguntas-frecuentes#precios-y-cargos";

export function PaymentClarity({ headingLevel = 2, className = "", id }: { headingLevel?: 2 | 3; className?: string; id?: string }) {
  const t = useTranslations("v4.clarity");
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const titleId = useId();
  const confirm = [t("confirm1"), t("confirm2"), t("confirm3"), t("confirm4")];
  const check = [t("check1"), t("check2"), t("check3")];
  return <section id={id} aria-labelledby={titleId} className={`@container scroll-mt-24 rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8 ${className}`}>
    <div className="mb-6 space-y-2">
      <Heading id={titleId} className={headingLevel === 2 ? "t-h2" : "t-h3"}>{t("title")}</Heading>
      <p className="t-body text-ink-soft">{t("intro")}</p>
    </div>
    <div className="grid gap-6 @2xl:grid-cols-2">
      <div className="space-y-3">
        <p className="t-small flex items-center gap-2 font-semibold text-ink"><ShieldCheck size={18} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{t("confirmTitle")}</p>
        <ul className="space-y-2">{confirm.map(line => <li key={line} className="t-body flex gap-3"><CircleCheck size={18} strokeWidth={1.75} className="mt-1 shrink-0 text-success" aria-hidden="true" /><span>{line}</span></li>)}</ul>
      </div>
      <div className="space-y-3">
        <p className="t-small flex items-center gap-2 font-semibold text-ink"><ListChecks size={18} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{t("checkTitle")}</p>
        <ul className="space-y-2">{check.map(line => <li key={line} className="t-body flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-soft" aria-hidden="true" /><span>{line}</span></li>)}</ul>
      </div>
    </div>
    <p className="t-small mt-6 border-t border-line pt-6 font-normal text-ink-soft">{t("noCharge")}</p>
    <div className="mt-2 flex flex-wrap gap-x-6">
      <Link href={priceFaqHref} className="t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline">{t("faqLink")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
      <Link href="/legales/cancelaciones" className="t-small inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline-offset-4 hover:underline">{t("cancelLink")}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></Link>
    </div>
  </section>;
}
