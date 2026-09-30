import { useTranslations } from "next-intl";
import { Globe, LifeBuoy, MonitorSmartphone, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";

export function WhyViatour() {
  const t = useTranslations();
  const items = [
    { icon: UserRound, title: t("home.why1Title"), body: t("home.why1Body") },
    { icon: SlidersHorizontal, title: t("home.why2Title"), body: t("home.why2Body") },
    { icon: MonitorSmartphone, title: t("home.why3Title"), body: t("home.why3Body") },
    { icon: LifeBuoy, title: t("home.why4Title"), body: t("home.why4Body") },
    { icon: ShieldCheck, title: t("home.why5Title"), body: t("home.why5Body") },
    { icon: Globe, title: t("home.why6Title"), body: t("home.why6Body") },
  ];

  return (
    <section className="section-space border-y border-line bg-surface" aria-labelledby="why-title"><div className="container-site">
      <div className="mb-8 max-w-3xl space-y-3 sm:mb-12">
        <h2 id="why-title" className="t-h2">{t("home.whyTitle")}</h2>
        <p className="t-body-lg text-ink-soft">{t("home.whyIntro")}</p>
      </div>
      {/* Phones: icon beside the text, so six points read as a list instead of ~1,900px of stacked blocks. */}
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <article key={title} className="flex items-start gap-4 sm:block sm:space-y-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-btn bg-canvas text-brand shadow-sm"><Icon size={24} strokeWidth={1.75} aria-hidden="true" /></span>
            <div className="min-w-0 space-y-2 sm:space-y-4">
              <h3 className="t-h3">{title}</h3>
              <p className="t-body text-ink-soft">{body}</p>
            </div>
          </article>
        ))}
      </div>
    </div></section>
  );
}
