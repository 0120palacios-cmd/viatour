"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) { const t = useTranslations(); return <main className="container-site py-14 sm:py-24"><div className="space-y-6 rounded-panel border border-line bg-surface p-8 text-center"><h1 className="t-h1">{t("common.error")}</h1><p role="alert" className="t-body text-ink-soft">{t("common.retry")}</p><Button onClick={reset}>{t("common.retry")}</Button></div></main>; }
