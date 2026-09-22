"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { const t = useTranslations(); return <main className="container-site space-y-6 py-14 sm:py-24"><h1 className="t-h1">{t("common.reviews")}</h1><p role="alert">{t("common.error")}</p><Button onClick={reset}>{t("common.retry")}</Button></main>; }
