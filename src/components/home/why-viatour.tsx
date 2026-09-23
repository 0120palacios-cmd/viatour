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
    <section className="container-site py-14 sm:py-24" aria-labelledby="why-title">
      <div className="mb-10 max-w-3xl space-y-4 sm:mb-12">
        <h2 id="why-title" className="t-h2">{t("home.whyTitle")}</h2>
        <p className="t-body-lg text-ink-soft">{t("home.whyIntro")}</p>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <article key={title} className="space-y-4">
            <Icon size={28} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
            <h3 className="t-h3">{title}</h3>
            <p className="t-body text-ink-soft">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
