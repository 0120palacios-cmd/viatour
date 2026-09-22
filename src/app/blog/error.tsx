"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) { const t = useTranslations(); return <main className="container-site py-14 sm:py-24"><h1 className="t-h1">{t("common.error")}</h1><Button className="mt-6" onClick={reset}>{t("common.retry")}</Button></main>; }
