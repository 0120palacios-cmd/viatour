import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Mail, MapPin, MessageCircle, TicketCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localizedPageMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/contact-form";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { PageHeader } from "@/components/layout/page-header";
import { siteConfig } from "@/lib/site-config";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/contacto", "contact"); }
// WhatsApp is the main channel, so it leads; email and the form are the alternatives.
export default function Page() {
  const t = useTranslations("contact"); const common = useTranslations("common"); const footer = useTranslations("footer");
  const channel = "flex items-start gap-4 rounded-card border border-line bg-canvas p-5 shadow-sm";
  const icon = "flex size-11 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand";
  return <main className="container-site pb-12 sm:pb-24">
    <PageHeader breadcrumbs={[{ label: common("home"), href: "/" }, { label: common("contact"), href: "/contacto" }]} title={common("contact")} intro={useTranslations("static")("contactIntro")} />
    {siteConfig.showDraftNotices && <p className="t-small -mt-4 mb-8 text-ink-soft">{t("draft")}</p>}
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <section aria-label={t("details")} className="space-y-4">
        <div className="space-y-4 rounded-panel border border-line bg-surface p-6">
          <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-btn bg-wa text-ink"><MessageCircle size={22} strokeWidth={1.75} aria-hidden="true" /></span><div><h2 className="t-h3">WhatsApp</h2><p className="t-body text-ink-soft">+504 8866-8704</p></div></div>
          <WhatsAppLink placement="contact-page" block />
        </div>
        <ul className="space-y-4">
          {[siteConfig.supportEmail, siteConfig.helpEmail].map(email => <li key={email}><a href={`mailto:${email}`} className={`${channel} hover:border-brand`}><span className={icon}><Mail size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="min-w-0"><span className="t-small block text-ink-soft">{t("email")}</span><span className="t-body block break-all font-semibold text-brand">{email}</span></span></a></li>)}
          <li><a href={siteConfig.googleProfileUrl} target="_blank" rel="noopener noreferrer" className={`${channel} hover:border-brand`}><span className={icon}><MapPin size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="t-body self-center font-semibold text-brand">{footer("googleProfile")}</span></a></li>
          <li><Link href="/mi-reserva" className={`${channel} hover:border-brand`}><span className={icon}><TicketCheck size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="t-body self-center font-semibold text-brand">{common("reservation")}</span></Link></li>
        </ul>
      </section>
      <section aria-labelledby="contact-title" className="rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8"><h2 id="contact-title" className="t-h2 mb-6">{t("messageTitle")}</h2><ContactForm /></section>
    </div>
  </main>;
}
