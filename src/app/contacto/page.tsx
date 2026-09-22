import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { localizedPageMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/contact-form";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";
import { siteConfig } from "@/lib/site-config";

export function generateMetadata(): Promise<Metadata> { return localizedPageMetadata("/contacto", "contact"); }
export default function Page() { const t = useTranslations("contact"); return <main className="container-site py-14 sm:py-24"><h1 className="t-h1 mb-8">{useTranslations("common")("contact")}</h1><p className="t-small mb-8 text-ink-soft">{t("draft")}</p><div className="grid gap-12 lg:grid-cols-2"><section aria-label={t("details")} className="space-y-6"><WhatsAppLink /><p>WhatsApp: +504 8866-8704</p><div className="space-y-4"><p><a href={`mailto:${siteConfig.supportEmail}`} className="t-body inline-flex min-h-12 items-center text-brand underline underline-offset-4">{siteConfig.supportEmail}</a></p><p><a href={`mailto:${siteConfig.helpEmail}`} className="t-body inline-flex min-h-12 items-center text-brand underline underline-offset-4">{siteConfig.helpEmail}</a></p></div></section><section aria-labelledby="contact-title"><h2 id="contact-title" className="t-h2 mb-6">{t("messageTitle")}</h2><ContactForm /></section></div></main>; }
